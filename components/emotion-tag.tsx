import { EMOTION_LABELS, EMOTION_ICONS, EMOTION_COLORS, ANTIDOTE_LABELS, ANTIDOTE_COLORS } from '@/lib/article-helpers';

interface EmotionTagProps {
  antidote?: string | null;
  emotions?: string[];
  showAntidoteLine?: boolean;
}

export function EmotionTag({ antidote, emotions, showAntidoteLine = false }: EmotionTagProps) {
  const hasAntidote = antidote && ANTIDOTE_LABELS[antidote];
  const validEmotions = (emotions || []).filter(e => EMOTION_LABELS[e]);

  if (!hasAntidote && validEmotions.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasAntidote && showAntidoteLine && (
        <span className={`text-sm font-medium ${ANTIDOTE_COLORS[antidote!].text}`}>
          Zdravilo za {antidote}
        </span>
      )}
      {validEmotions.map(emotion => (
        <span
          key={emotion}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${EMOTION_COLORS[emotion]?.bg || 'bg-gray-100'} ${EMOTION_COLORS[emotion]?.text || 'text-gray-700'}`}
        >
          {EMOTION_ICONS[emotion]} {EMOTION_LABELS[emotion]}
        </span>
      ))}
    </div>
  );
}
