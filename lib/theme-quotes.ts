// Daily quotes per theme. One quote per day, deterministic by day-of-year —
// same quote shown to all visitors on the same day. Rotation grows as quotes are added.
//
// Only verified quotes live here. ⚠️ items from theme-quotes-seed.md stay out until
// an editor verifies them. Anonymous entries (attribution = null) are lines whose
// source is disputed but whose wording is real — better unsigned than misattributed.

export interface ThemeQuote {
  text: string;
  attribution: string | null;
  source?: string;
}

export const THEME_QUOTES: Record<string, ThemeQuote[]> = {
  "med-nami": [
    { text: "Lepa beseda lepo mesto najde.", attribution: null, source: "Slovenski pregovor" },
    { text: "Sosed je včasih bližji od brata.", attribution: null, source: "Slovenski pregovor" },
    { text: "Najlepše stvari na svetu se ne vidijo niti ne slišijo — čutiti jih je s srcem.", attribution: "Antoine de Saint-Exupéry" },
    { text: "Ne moremo storiti velikih stvari, lahko pa storimo majhne stvari z veliko ljubezni.", attribution: "Mati Terezija" },
    { text: "Dobro se z dobrim povrne.", attribution: null, source: "Slovenski pregovor" },
    { text: "Moja vera je preprosta. Moja vera je prijaznost.", attribution: "Dalajlama" },
    { text: "Bodi sprememba, ki jo želiš videti v svetu.", attribution: "Mahatma Gandhi" },
    // merged from skupaj
    { text: "V slogi je moč.", attribution: null, source: "Slovenski pregovor" },
    { text: "Sami zmoremo tako malo; skupaj zmoremo tako veliko.", attribution: "Helen Keller" },
    { text: "Če hočeš iti hitro, pojdi sam. Če hočeš iti daleč, pojdi skupaj.", attribution: null, source: "Afriški pregovor" },
    { text: "Roka roko umije.", attribution: null, source: "Slovenski pregovor" },
    { text: "Nikoli ne dvomi, da lahko majhna skupina premišljenih, predanih ljudi spremeni svet — pravzaprav je to edino, kar ga je kdaj spremenilo.", attribution: "Margaret Mead" },
  ],

  "naprej": [
    { text: "Kjer je volja, je tudi pot.", attribution: null, source: "Slovenski pregovor" },
    { text: "Brez muje se še čevelj ne obuje.", attribution: null, source: "Slovenski pregovor" },
    { text: "Zrno na zrno pogača, kamen na kamen palača.", attribution: null, source: "Slovenski pregovor" },
    { text: "Vsak začetek je težak.", attribution: null, source: "Slovenski pregovor" },
    { text: "Kdor ima zakaj živeti, prenese skoraj vsak kako.", attribution: "Friedrich Nietzsche" },
    { text: "Ni važno, kako počasi greš, dokler ne obstaneš.", attribution: "Konfucij" },
    { text: "Pot tisočih milj se začne z enim korakom.", attribution: "Lao Tzu" },
  ],

  "heroji": [
    { text: "Pogum ni odsotnost strahu, ampak zmaga nad njim.", attribution: "Nelson Mandela" },
    { text: "Pogum je upor proti strahu, obvladovanje strahu — ne odsotnost strahu.", attribution: "Mark Twain" },
    { text: "Ovira na poti postane pot.", attribution: "Mark Avrelij" },
    { text: "Življenje se širi ali krči v sorazmerju s pogumom.", attribution: "Anaïs Nin" },
    { text: "Junak ni nič bolj pogumen od navadnega človeka — pogumen je le pet minut dlje.", attribution: "Ralph Waldo Emerson" },
    { text: "Pogum ni samo ena od kreposti, ampak oblika vsake kreposti v trenutku preizkusa.", attribution: "C. S. Lewis" },
    { text: "Kdor se boji, naj ne hodi v gozd.", attribution: null, source: "Slovenski pregovor" },
  ],

  "drobne-radosti": [
    { text: "V sredini zime sem končno spoznal, da v meni živi neuničljivo poletje.", attribution: "Albert Camus" },
    { text: "Čas, ki si ga posvetil svoji vrtnici, je tisto, kar jo dela tako pomembno.", attribution: "Antoine de Saint-Exupéry" },
    { text: "Smeh je pol zdravja.", attribution: null, source: "Slovenski pregovor" },
    { text: "Po dežju vedno posije sonce.", attribution: null, source: "Slovenski pregovor" },
    { text: "Sreča je kot metulj — bolj ko jo loviš, bolj ti uhaja. Ko se posvetiš drugemu, ti tiho pristane na rami.", attribution: null },
    { text: "Če to ni lepo, ne vem, kaj je.", attribution: "Kurt Vonnegut" },
    // Schulz "topel kuža" — v čakanju na uradni slovenski prevod Peanuts.
  ],

  "dogodki": [
    { text: "Povej mi, kaj nameravaš storiti s svojim enim divjim in dragocenim življenjem?", attribution: "Mary Oliver" },
    { text: "Šel sem v gozd, ker sem hotel živeti zavestno.", attribution: "Henry David Thoreau" },
    { text: "Gore kličejo in moram iti.", attribution: "John Muir" },
    { text: "Lepa pot ni nikoli predolga.", attribution: null, source: "Slovenski pregovor" },
    { text: "Doma je lepo, a svet je velik.", attribution: null, source: "Slovenski pregovor" },
    { text: "Karkoli lahko storiš ali sanjaš, da lahko storiš — začni. Pogum ima v sebi genialnost, moč in čar.", attribution: null },
    { text: "Najboljši čas za zasaditev drevesa je bil pred dvajsetimi leti. Drugi najboljši čas je danes.", attribution: null, source: "Kitajski pregovor" },
  ],

  "tiho-delo": [
    { text: "Delo je ljubezen, ki se vidi.", attribution: "Khalil Gibran", source: "iz Preroka" },
    { text: "Edini med vami, ki bodo resnično srečni, so tisti, ki so iskali in našli, kako služiti.", attribution: "Albert Schweitzer" },
    { text: "Pridne roke nikoli niso prazne.", attribution: null, source: "Slovenski pregovor" },
    { text: "Ne išči velikih del. Delaj majhna z veliko ljubezni.", attribution: "Mati Terezija" },
    { text: "Kar je dobro za panj, je dobro za čebelo.", attribution: "Mark Avrelij", source: "iz Samemu sebi" },
    { text: "Velike stvari se ne zgodijo nenadoma — sestavljene so iz majhnih, ki se združijo.", attribution: "Vincent van Gogh" },
    { text: "Brez ponižnosti pri delu ni resnične velikosti.", attribution: "Booker T. Washington" },
  ],

  "nedeljska-zgodba": [
    { text: "Pravo potovanje odkritja ni v iskanju novih pokrajin, ampak v gledanju z novimi očmi.", attribution: "Marcel Proust" },
    { text: "Knjiga mora biti sekira za zamrznjeno morje v nas.", attribution: "Franz Kafka" },
    { text: "Klasik je knjiga, ki nikoli ne neha govoriti, kar ima povedati.", attribution: "Italo Calvino" },
    { text: "Kdor počasi hodi, daleč pride.", attribution: null, source: "Slovenski pregovor" },
    { text: "Bralec živi tisoč življenj, preden umre. Tisti, ki nikoli ne bere, živi samo eno.", attribution: "George R. R. Martin" },
    { text: "Beremo, da bi vedeli, da nismo sami.", attribution: null },
    { text: "Vedno sem si predstavljal raj kot neko vrsto knjižnice.", attribution: "Jorge Luis Borges" },
  ],

  "iz-arhiva": [
    { text: "Preteklost ni nikoli mrtva. Sploh ni preteklost.", attribution: "William Faulkner" },
    { text: "Boj človeka proti oblasti je boj spomina proti pozabi.", attribution: "Milan Kundera" },
    { text: "Konec naših iskanj bo prihod tja, od koder smo začeli — in bomo to mesto prvič spoznali.", attribution: "T. S. Eliot" },
    { text: "Ne vedeti, kaj se je zgodilo pred tvojim rojstvom, pomeni večno ostati otrok.", attribution: "Ciceron" },
    { text: "Stara ljubezen ne zarjavi.", attribution: null, source: "Slovenski pregovor" },
    { text: "Življenje lahko razumemo le nazaj, živeti pa ga moramo naprej.", attribution: "Søren Kierkegaard" },
    { text: "Zgodovina je učiteljica življenja.", attribution: "Ciceron", source: "Historia magistra vitae" },
  ],
};

export function dayOfYear(date: Date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

export function getQuoteForToday(slug: string, date: Date = new Date()): ThemeQuote | null {
  const list = THEME_QUOTES[slug];
  if (!list || list.length === 0) return null;
  return list[dayOfYear(date) % list.length];
}
