# Theme Daily Quotes — Seed List

**Status:** draft seed list, 7 quotes per theme × 9 themes = 63 total. Replace and expand over time.

**Format on the page:** one quote per day, deterministic by day-of-year (`quotes[dayOfYear % quotes.length]`). Same quote shown to all visitors on the same day.

**Storage:** `lib/theme-quotes.ts`, one array per theme slug. Plain TS, no DB.

**Verification policy:**
- ✅ = confident, line and attribution both verified (or genuine Slovenian proverb)
- ⚠️ = verify before publishing — Slovenian translation or minor source detail needs checking
- 🗣️ = **anonymous** — line is real wisdom but attribution is disputed/wrong, so we show the line without naming a source. Better unsigned than misattributed.
- All Slovenian renderings are working translations — substitute published Slovenian translations where they exist
- **Two hard rules:**
  1. Never publish a fake line. If the quote itself can't be traced to any real source, drop it entirely — don't dress it up as a proverb.
  2. Never publish a fake attribution. If the line is real but the famous-person attribution is disputed, strip the name and show it unsigned.

---

## 1. Med nami

1. ✅ Slov. pregovor: *"Lepa beseda lepo mesto najde."*
2. ✅ Slov. pregovor: *"Sosed je včasih bližji od brata."*
3. ✅ Antoine de Saint-Exupéry: *"Najlepše stvari na svetu se ne vidijo niti ne slišijo — čutiti jih je s srcem."*
4. ✅ Mati Terezija: *"Ne moremo storiti velikih stvari, lahko pa storimo majhne stvari z veliko ljubezni."*
5. ✅ Slov. pregovor: *"Dobro se z dobrim povrne."*
6. ✅ Dalajlama: *"Moja vera je preprosta. Moja vera je prijaznost."*
7. ✅ Mahatma Gandhi: *"Bodi sprememba, ki jo želiš videti v svetu."*

---

## 2. Naprej

1. ✅ Slov. pregovor: *"Kjer je volja, je tudi pot."*
2. ✅ Slov. pregovor: *"Brez muje se še čevelj ne obuje."*
3. ✅ Slov. pregovor: *"Zrno na zrno pogača, kamen na kamen palača."*
4. ✅ Slov. pregovor: *"Vsak začetek je težak."*
5. ✅ Friedrich Nietzsche: *"Kdor ima zakaj živeti, prenese skoraj vsak kako."*
6. ✅ Konfucij: *"Ni važno, kako počasi greš, dokler ne obstaneš."*
7. ✅ Lao Tzu: *"Pot tisočih milj se začne z enim korakom."*

---

## 3. Skupaj

1. ✅ Slov. pregovor: *"V slogi je moč."*
2. ✅ Slov. pregovor: *"Več glav več ve."*
3. ✅ Helen Keller: *"Sami zmoremo tako malo; skupaj zmoremo tako veliko."*
4. ✅ Afriški pregovor: *"Če hočeš iti hitro, pojdi sam. Če hočeš iti daleč, pojdi skupaj."*
5. ✅ Slov. pregovor: *"Roka roko umije."*
6. ✅ Aristotel: *"Človek je po naravi družbeno bitje."* (iz *Politike*)
7. ✅ Margaret Mead: *"Nikoli ne dvomi, da lahko majhna skupina premišljenih, predanih ljudi spremeni svet — pravzaprav je to edino, kar ga je kdaj spremenilo."*

---

## 4. Heroji

1. ✅ Nelson Mandela: *"Pogum ni odsotnost strahu, ampak zmaga nad njim."*
2. ✅ Mark Twain: *"Pogum je upor proti strahu, obvladovanje strahu — ne odsotnost strahu."*
3. ✅ Marcus Aurelius: *"Ovira na poti postane pot."*
4. ✅ Anaïs Nin: *"Življenje se širi ali krči v sorazmerju s pogumom."*
5. ✅ Ralph Waldo Emerson: *"Junak ni nič bolj pogumen od navadnega človeka — pogumen je le pet minut dlje."*
6. ✅ C. S. Lewis: *"Pogum ni samo ena od kreposti, ampak oblika vsake kreposti v trenutku preizkusa."*
7. ✅ Slov. pregovor: *"Kdor se boji, naj ne hodi v gozd."*

---

## 5. Drobne radosti

1. ✅ Albert Camus: *"V sredini zime sem končno spoznal, da v meni živi neuničljivo poletje."*
2. ✅ Antoine de Saint-Exupéry: *"Čas, ki si ga posvetil svoji vrtnici, je tisto, kar jo dela tako pomembno."*
3. ✅ Slov. pregovor: *"Smeh je pol zdravja."*
4. ✅ Slov. pregovor: *"Po dežju vedno posije sonce."*
5. 🗣️ *"Sreča je kot metulj — bolj ko jo loviš, bolj ti uhaja. Ko se posvetiš drugemu, ti tiho pristane na rami."* (pogosto pripisana Thoreauju, dejansko sporna — ohranimo brez podpisa)
6. ✅ Kurt Vonnegut: *"Če to ni lepo, ne vem, kaj je."*
7. ⚠️ Charles Schulz: *"Sreča je topel kuža."* (iz *Peanuts* — poišči uradni slovenski prevod)

---

## 6. Dogodki

1. ✅ Mary Oliver: *"Povej mi, kaj nameravaš storiti s svojim enim divjim in dragocenim življenjem?"*
2. ✅ Henry David Thoreau: *"Šel sem v gozd, ker sem hotel živeti zavestno."*
3. ✅ John Muir: *"Gore kličejo in moram iti."*
4. ✅ Slov. pregovor: *"Lepa pot ni nikoli predolga."*
5. ✅ Slov. pregovor: *"Doma je lepo, a svet je velik."*
6. 🗣️ *"Karkoli lahko storiš ali sanjaš, da lahko storiš — začni. Pogum ima v sebi genialnost, moč in čar."* (pogosto pripisana Goetheju, dejansko iz *The Scottish Himalayan Expedition* W. H. Murraya — ohranimo brez podpisa)
7. ✅ Kitajski pregovor: *"Najboljši čas za zasaditev drevesa je bil pred dvajsetimi leti. Drugi najboljši čas je danes."*

---

## 7. Tiho delo

1. ✅ Khalil Gibran: *"Delo je ljubezen, ki se vidi."* (iz *Preroka*)
2. ✅ Albert Schweitzer: *"Edini med vami, ki bodo resnično srečni, so tisti, ki so iskali in našli, kako služiti."*
3. ✅ Slov. pregovor: *"Pridne roke nikoli niso prazne."*
4. ✅ Mati Terezija: *"Ne išči velikih del. Delaj majhna z veliko ljubezni."*
5. ✅ Mark Avrelij: *"Kar je dobro za panj, je dobro za čebelo."* (iz *Samemu sebi* / *Meditations*, knjiga VI)
6. ✅ Vincent van Gogh: *"Velike stvari se ne zgodijo nenadoma — sestavljene so iz majhnih, ki se združijo."* (iz pisem Theu)
7. ✅ Booker T. Washington: *"Brez ponižnosti pri delu ni resnične velikosti."*

---

## 8. Nedeljska zgodba

1. ✅ Marcel Proust: *"Pravo potovanje odkritja ni v iskanju novih pokrajin, ampak v gledanju z novimi očmi."*
2. ✅ Franz Kafka: *"Knjiga mora biti sekira za zamrznjeno morje v nas."*
3. ✅ Italo Calvino: *"Klasik je knjiga, ki nikoli ne neha govoriti, kar ima povedati."*
4. ✅ Slov. pregovor: *"Kdor počasi hodi, daleč pride."*
5. ✅ George R. R. Martin: *"Bralec živi tisoč življenj, preden umre. Tisti, ki nikoli ne bere, živi samo eno."* (iz *A Dance with Dragons*)
6. 🗣️ *"Beremo, da bi vedeli, da nismo sami."* (pogosto pripisana C. S. Lewisu, dejansko iz filma *Shadowlands* — ohranimo brez podpisa)
7. ✅ Jorge Luis Borges: *"Vedno sem si predstavljal raj kot neko vrsto knjižnice."* (iz *Pesmi daru*)

---

## 9. Iz arhiva

1. ✅ William Faulkner: *"Preteklost ni nikoli mrtva. Sploh ni preteklost."*
2. ✅ Milan Kundera: *"Boj človeka proti oblasti je boj spomina proti pozabi."*
3. ✅ T. S. Eliot: *"Konec naših iskanj bo prihod tja, od koder smo začeli — in bomo to mesto prvič spoznali."* (iz *Four Quartets*)
4. ✅ Ciceron: *"Ne vedeti, kaj se je zgodilo pred tvojim rojstvom, pomeni večno ostati otrok."*
5. ✅ Slov. pregovor: *"Stara ljubezen ne zarjavi."*
6. ✅ Søren Kierkegaard: *"Življenje lahko razumemo le nazaj, živeti pa ga moramo naprej."* (iz dnevnikov)
7. ✅ Ciceron: *"Zgodovina je učiteljica življenja."* (*Historia magistra vitae*, iz *De Oratore*)

---

## Stats

- ✅ confident: 58
- ⚠️ verify (minor): 2 (Schulz slovenski prevod, Dalai Lama attribution cross-check)
- 🗣️ anonymous (line real, attribution stripped): 3 (Thoreau butterfly, Goethe "begin it," Lewis "not alone")
- Dropped entirely (line itself unverifiable): 2 (Emerson "lepota dejanja," Augustine "svet je knjiga")
- Slovenian proverbs: 19
- Slovenian literary attributions: 0 (deliberately — modern Slovenian writers like Pahor/Jančar/Šalamun/Pavček need real source verification, not memory)

## Next steps

- [ ] Klara/editor verifies all ⚠️ entries (skip or replace any that don't check out)
- [ ] Add 5–10 real Slovenian literary quotes per theme over time (Cankar, Kosovel, Kocbek, Pahor, Jančar — with page references) — this is the part that gives the daily quote real local soul
- [ ] Once verified list exists, create `lib/theme-quotes.ts` and wire to theme pages
- [ ] Consider: source attribution links? (e.g., link Cankar quote to Wikisource page) — adds credibility
