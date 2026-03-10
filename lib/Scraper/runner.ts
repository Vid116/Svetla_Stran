import { prisma } from '../prisma';
import { titleFilter, scoreStory } from '../anthropic';
import { crawlRSS, crawlHTML, crawlFullContent, saveNewStories, type RawStory } from './crawler';
import { getActiveRSSSources, getActiveHTMLSources } from './sources';
import { StoryStatus } from '@prisma/client';

const BATCH_SIZE = 50;

export async function runScraper() {
  console.log('── Scraper start ──');

  const rssSources = getActiveRSSSources();
  const htmlSources = getActiveHTMLSources();
  console.log(`Viri: ${rssSources.length} RSS, ${htmlSources.length} HTML`);

  // 1. Crawlaj vse vire paralelno
  const vseStories: RawStory[] = [];

  const rssResults = await Promise.allSettled(
    rssSources.map(async (vir) => {
      const items = await crawlRSS(vir.url, vir.name);
      console.log(`  ✓ ${vir.name}: ${items.length}`);
      return items;
    })
  );

  const htmlResults = await Promise.allSettled(
    htmlSources.map(async (vir) => {
      const items = await crawlHTML(vir);
      console.log(`  ✓ ${vir.name}: ${items.length}`);
      return items;
    })
  );

  for (const r of [...rssResults, ...htmlResults]) {
    if (r.status === 'fulfilled') vseStories.push(...r.value);
  }

  console.log(`Skupaj najdenih: ${vseStories.length}`);

  // 2. Dedup + shrani
  const noviIds = await saveNewStories(vseStories);
  console.log(`Novih: ${noviIds.length}`);
  if (noviIds.length === 0) return { scraped: 0, da: 0, vInbox: 0 };

  // 3. Title filter (Haiku, batch po 50)
  const noviStories = await prisma.story.findMany({
    where: { id: { in: noviIds } },
    select: { id: true, rawTitle: true, sourceUrl: true },
  });

  const daIds: string[] = [];

  for (let i = 0; i < noviStories.length; i += BATCH_SIZE) {
    const batch = noviStories.slice(i, i + BATCH_SIZE);
    const rezultati = await titleFilter(batch);
    const da = rezultati.filter(r => r.odlocitev === 'DA').map(r => r.id);
    const ne = rezultati.filter(r => r.odlocitev === 'NE').map(r => r.id);
    daIds.push(...da);
    if (ne.length > 0) await prisma.story.updateMany({ where: { id: { in: ne } }, data: { status: StoryStatus.REJECTED } });
    if (da.length > 0) await prisma.story.updateMany({ where: { id: { in: da } }, data: { status: StoryStatus.PENDING_SCORE } });
  }

  console.log(`Title filter: ${daIds.length} DA`);

  // 4. Polna vsebina samo za DA kandidate
  const daStoryList = noviStories.filter(s => daIds.includes(s.id));
  const polnaVsebina = await crawlFullContent(daStoryList.map(s => s.sourceUrl));

  // 5. Scoring (Haiku, posamično z polno vsebino)
  const daStories = await prisma.story.findMany({
    where: { id: { in: daIds } },
    select: { id: true, rawTitle: true, rawContent: true, sourceUrl: true },
  });

  let vInbox = 0;
  for (const story of daStories) {
    try {
      const fullContent = polnaVsebina.get(story.sourceUrl) || story.rawContent;
      const result = await scoreStory({ ...story, rawContent: fullContent });

      if (result.score >= 6 && !result.rejected_because) {
        await prisma.story.update({
          where: { id: story.id },
          data: {
            status: StoryStatus.PENDING_REVIEW,
            rawContent: fullContent,
            aiScore: result.score,
            aiEmotions: result.emotions,
            aiReason: result.reason,
            aiCategory: result.category,
            aiHeadline: result.headline_suggestion,
          },
        });
        vInbox++;
      } else {
        await prisma.story.update({
          where: { id: story.id },
          data: {
            status: StoryStatus.REJECTED,
            aiScore: result.score,
            aiReason: result.rejected_because
              ? `ZAVRNJENO: ${result.rejected_because} — ${result.reason}`
              : result.reason,
          },
        });
      }
    } catch (e: any) {
      console.error(`Scoring napaka: ${e.message}`);
    }
  }

  console.log(`V inbox: ${vInbox}`);
  return { scraped: noviIds.length, da: daIds.length, vInbox };
}
