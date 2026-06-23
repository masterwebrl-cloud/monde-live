import type { Config } from "@netlify/functions";
import { gunzipSync } from "node:zlib";
import { XMLParser } from "fast-xml-parser";

const COUNTRIES = [
  "al", "ad", "at", "az", "by", "be", "ba", "bg", "hr", "cy", "cz", "dk", "ee", "fi", "fr", "de", "gr", "hu", "is", "ie", 
  "it", "xk", "lv", "li", "lt", "lu", "mt", "md", "mc", "me", "nl", "no", "pl", "pt", "ro", "ru", "sm", "rs", "sk", "si", "es", 
  "se", "ch", "tr", "ua", "gb", "kz", "uz", "tm", "tj", "kg", "ge", "am", "af", "bd", "bt", "in", "lk", "mv", "np", "pk", 
  "br", "cl", "co", "ec", "gy", "py", "pe", "sr", "uy", "ve", "mx", "bz", "cr", "sv", "gt", "hn", "ni", "pa", "jm", "tt", 
  "bs", "dm", "pr", "ag", "bb", "gd", "mu", "sc", "au", "fj", "nz", "pf", "sb", "vu"
];

const COUNTRY_NAMES: Record<string, string> = {
  fr: "France", gb: "Royaume-Uni", es: "Espagne", it: "Italie", de: "Allemagne", be: "Belgique", ch: "Suisse", pl: "Pologne", nl: "Pays-Bas",
  at: "Autriche", cz: "Tchéquie", dk: "Danemark", fi: "Finlande", gr: "Grèce", hu: "Hongrie", is: "Islande", ie: "Irlande", pt: "Portugal",
  ro: "Roumanie", se: "Suède", no: "Norvège", tr: "Turquie", ua: "Ukraine", ru: "Russie", by: "Biélorussie", kz: "Kazakhstan", br: "Brésil",
  mx: "Mexique", ar: "Argentine", cl: "Chili", co: "Colombie", pe: "Pérou", ve: "Venezuela", in: "Inde", pk: "Pakistan", au: "Australie",
  nz: "Nouvelle-Zélande", jp: "Japon", kr: "Corée du Sud", cn: "Chine", th: "Thaïlande", my: "Malaisie", sg: "Singapour", id: "Indonésie",
  ph: "Philippines", vn: "Vietnam", eg: "Égypte", sa: "Arabie Saoudite", ae: "Émirats Arabes", il: "Israël", ng: "Nigéria", za: "Afrique du Sud",
  ke: "Kenya", us: "États-Unis", ca: "Canada", al: "Albanie", ad: "Andorre", ba: "Bosnie", bg: "Bulgarie", hr: "Croatie", cy: "Chypre",
  ee: "Estonie", lv: "Lettonie", li: "Liechtenstein", lt: "Lituanie", lu: "Luxembourg", mt: "Malte", md: "Moldavie", mc: "Monaco",
  me: "Monténégro", sk: "Slovaquie", si: "Slovénie", sm: "Saint-Marin", rs: "Serbie", xk: "Kosovo", az: "Azerbaïdjan", am: "Arménie",
  ge: "Géorgie", uz: "Ouzbékistan", tm: "Turkménistan", tj: "Tadjikistan", kg: "Kirghizistan", af: "Afghanistan", bd: "Bangladesh",
  bt: "Bhoutan", lk: "Sri Lanka", mv: "Maldives", np: "Népal", ec: "Équateur", gy: "Guyana", py: "Paraguay", sr: "Suriname", uy: "Uruguay",
  bz: "Belize", cr: "Costa Rica", sv: "El Salvador", gt: "Guatemala", hn: "Honduras", ni: "Nicaragua", pa: "Panama", jm: "Jamaïque",
  tt: "Trinité-et-Tobago", bs: "Bahamas", dm: "Dominique", pr: "Porto Rico", ag: "Antigua-et-Barbuda", bb: "Barbade", gd: "Grenade",
  mu: "Maurice", sc: "Seychelles", fj: "Fidji", pf: "Polynésie française", sb: "Îles Salomon", vu: "Vanuatu"
};

const COUNTRY_FLAGS: Record<string, string> = {
  fr: "🇫🇷", gb: "🇬🇧", es: "🇪🇸", it: "🇮🇹", de: "🇩🇪", be: "🇧🇪", ch: "🇨🇭", pl: "🇵🇱", nl: "🇳🇱",
  at: "🇦🇹", cz: "🇨🇿", dk: "🇩🇰", fi: "🇫🇮", se: "🇸🇪", no: "🇳🇴", pt: "🇵🇹", gr: "🇬🇷", hu: "🇭🇺",
  ro: "🇷🇴", bg: "🇧🇬", sk: "🇸🇰", si: "🇸🇮", hr: "🇭🇷", ba: "🇧🇦", rs: "🇷🇸", me: "🇲🇪", ua: "🇺🇦",
  ru: "🇷🇺", tr: "🇹🇷", by: "🇧🇾", kz: "🇰🇿", br: "🇧🇷", mx: "🇲🇽", ar: "🇦🇷", cl: "🇨🇱", co: "🇨🇴",
  pe: "🇵🇪", ve: "🇻🇪", in: "🇮🇳", pk: "🇵🇰", au: "🇦🇺", nz: "🇳🇿", jp: "🇯🇵", kr: "🇰🇷", cn: "🇨🇳",
  th: "🇹🇭", my: "🇲🇾", sg: "🇸🇬", id: "🇮🇩", ph: "🇵🇭", vn: "🇻🇳", eg: "🇪🇬", sa: "🇸🇦", ae: "🇦🇪",
  il: "🇮🇱", ng: "🇳🇬", za: "🇿🇦", ke: "🇰🇪", us: "🇺🇸", ca: "🇨🇦"
};

// ─── CLASSIFICATION AUTO DES CHAÎNES ───
function classifyChannel(channelName: string): { type: string; icon: string } {
  const name = channelName.toLowerCase().trim();
  
  // SPORT
  if (/\b(sport|sports|sportv|sport tv|espn|bein|eurosport|sky sport|fox sport|nbc sport|rai sport|infosport|canal\+? sport|equipe|deporte|deportes|sportkanal|sportkanaal|sportszene|спорт|sportowy|football|futbol|fußball|calcio|tennis|nfl|nba|mlb|nhl|f1|formula|motogp|wrc|premier league|champions league|ligue 1|serie a|bundesliga|laliga)\b/i.test(name)) {
    return { type: "sport", icon: "⚽" };
  }
  
  // CINEMA / FILMS
  if (/\b(cinema|cinéma|cine|movies?|filme?|kino|sky cinema|canal\+? cinema|action|aventure|thriller|horror|comedie|drame|drama|cinemax|moviestar|moviemax|fox movies|paramount|warner|hollywood|kinopolska|кино)\b/i.test(name)) {
    return { type: "cinema", icon: "🎬" };
  }
  
  // INFO / NEWS
  if (/\b(news|info|infos|actu|actualité|cnn|bbc news|bfm|france info|euronews|sky news|fox news|al jazeera|rt|россия 24|wiadomości|tg|telejornal|noticias|nachrichten|24h|24/7|live news|breaking|journal|n-tv|notiziario)\b/i.test(name)) {
    return { type: "info", icon: "📰" };
  }
  
  // ADULTE / ÉROTIQUE
  if (/\b(adult|adulte|adults|adultos|erotic|érotique|erotik|erotico|porn|porno|playboy|hustler|xxx|hot|sexy|sex|brazzers|spice|private|premium tv|red light|venus)\b/i.test(name)) {
    return { type: "adulte", icon: "🔞" };
  }
  
  // JEUNESSE / ENFANTS
  if (/\b(disney|nick|nickelodeon|cartoon|kids|enfants|gulli|tiji|piwi|baby|junior|kiddoodles|disney channel|pl jr|cartoonito|boomerang|teletoon|nick jr|jim jam|baby tv|kiddoodles|pokemon|kayoom|разумник|dzieci|infantil|niños)\b/i.test(name)) {
    return { type: "jeunesse", icon: "🧒" };
  }
  
  // MUSIQUE
  if (/\b(mtv|mcm|music|musique|musical|nrj|virgin|trace|m6 music|vh1|kiss tv|hit|melody|stingray|musica|musik|музыка|deezer|spotify)\b/i.test(name)) {
    return { type: "musique", icon: "🎵" };
  }
  
  // DOCUMENTAIRE
  if (/\b(discovery|national geographic|nat geo|natgeo|histoire|history|geo|geographic|earth|planet|wildlife|nature|animal|animaux|science|doc|documentaire|documentary|документал|dokument|geo wild|geo earth)\b/i.test(name)) {
    return { type: "documentaire", icon: "🌍" };
  }
  
  // INTERNATIONAL
  if (/\b(tv5|euronews|france 24|deutsche welle|dw|al jazeera|cnn international|bbc world|rt|rfi|nhk world|cgtn|press tv)\b/i.test(name)) {
    return { type: "international", icon: "🌐" };
  }
  
  // DIVERTISSEMENT
  if (/\b(comedy|comédie|humour|humor|entertainment|divertissement|reality|nrj12|tf1 séries|w9|c8|6ter|tmc|tf x|paris première|tv land|tf6|stadthaubitze|teen|fashion tv|fashion)\b/i.test(name)) {
    return { type: "divertissement", icon: "🎭" };
  }
  
  // GÉNÉRALISTE (par défaut - main channels)
  if (/\b(tf1|france 2|france 3|france 4|france 5|france ô|france info|m6|w9|c8|6ter|tmc|paris première|nrj12|bbc one|bbc two|bbc four|itv|channel 4|channel 5|ard|zdf|rtl|sat\.?1|pro7|prosieben|kabel|3sat|swr|wdr|ndr|hr|mdr|tve|antena|telecinco|cuatro|la 1|la 2|rai 1|rai 2|rai 3|rai 4|rai 5|canale 5|italia 1|rete 4|tve la 1|antena 3|laraía|rtbf|vrt|één|canvas|ketnet|vtm|sbs6|net5|veronica|rtl 4|rtl 5|rtl 7|rtl 8|polsat|tvn|tvp 1|tvp 2|tvp info|rtv slo|rtv 4|tve|estonia|россия 1|первый|перший|перший|stb|1\+1|inter)\b/i.test(name)) {
    return { type: "generaliste", icon: "📺" };
  }
  
  // PAR DÉFAUT
  return { type: "generaliste", icon: "📺" };
}

function xmltvToISO(t: string | undefined): string | null {
  if (!t) return null;
  const m = t.trim().match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*([+-]\d{4})?/);
  if (!m) return null;
  const [, Y, Mo, D, H, Mi, S = "00", tz = "+0000"] = m;
  const off = `${tz.slice(0, 3)}:${tz.slice(3)}`;
  const d = new Date(`${Y}-${Mo}-${D}T${H}:${Mi}:${S}${off}`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function asArray<T>(x: T | T[] | undefined): T[] {
  return x === undefined || x === null ? [] : Array.isArray(x) ? x : [x];
}

function textOf(node: any): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (typeof node === "object" && "#text" in node) return String(node["#text"]);
  return "";
}

function decode(s: string): string {
  if (!s) return s;
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

const EROTIC_CATEGORIES = [
  "erotic", "erotica", "porn", "pornography", "adult", "adult film", "adult movie", "xxx", "x-rated",
  "érotique", "érotisme", "pornographique", "porno", "adulte", "film adulte", "film érotique",
  "erótico", "erotismo", "pornográfico", "adultos", "películas eróticas", "pornográficas", "eróticas",
  "erotico", "erotici", "pornografico", "pornografici", "adulti", "cinema erotico", "film erotici", "sessualita",
  "erotisch", "erotik", "erotikfilm", "erotisches herzkino", "knisternde erotik", "erwachsene", "fsk 18",
  "erotiek", "volwassenen", "porna", "voor volwassenen",
  "erotyka", "erotyczny", "dla dorosłych", "dorośli", "erotyczne",
  "erótico", "pornografia", "adultos", "filme erótico",
  "эротика", "эротический", "порно", "для взрослых", "взрослые",
  "еротика", "еротичний", "порно", "для дорослих",
  "erotický", "pornografie", "dospělí", "dospelí",
  "erotikus", "erotika", "pornográfia", "felnőtt",
  "erotic", "erotism", "adulți",
  "еротичен", "еротика", "за възрастни",
  "erotski", "erotika", "za odrasle", "odrasli",
  "erotik", "erotisk", "porr", "vuxen", "för vuxna",
  "erotikk", "porno", "voksen", "voksne",
  "erotisk", "voksne", "for voksne",
  "eroottinen", "erotiikka", "aikuisille",
  "erootika", "erootiline", "täiskasvanutele",
  "erotika", "erotisks", "pieaugušajiem",
  "erotika", "erotinis", "suaugusiems",
  "ερωτικό", "ερωτισμός", "ενηλίκων",
  "erotik", "yetişkin",
  "إثارة", "إباحي", "للكبار", "بالغين",
  "ארוטי", "פורנו", "למבוגרים",
  "成人", "色情", "情色", "アダルト", "成人", "エロ",
  "성인", "에로", "ผู้ใหญ่", "อีโรติก",
  "dewasa", "erotis", "porno", "người lớn", "khiêu dâm", "tình dục",
  "वयस्क", "अश्लील", "एडल्ट", "প্রাপ্তবয়স্ক", "অশ্লীল"
];

const WORLDCUP_TITLES = [
  "world cup", "fifa world cup", "fifa world cup 2026", "wc 2026", "fifa 2026",
  "coupe du monde", "coupe du monde 2026", "mondial", "mondial 2026", "cdm 2026",
  "copa del mundo", "copa mundial", "mundial", "mundial 2026", "copa mundial fifa",
  "coppa del mondo", "mondiali", "mondiali 2026", "coppa del mondo fifa",
  "weltmeisterschaft", "wm 2026", "fußball-wm", "fifa weltmeisterschaft",
  "wereldkampioenschap", "wk 2026", "wk voetbal",
  "mistrzostwa świata", "mś 2026",
  "copa do mundo", "copa do mundo 2026",
  "чемпионат мира", "чм 2026", "кубок мира",
  "чемпіонат світу", "чс 2026",
  "mistrovství světa", "ms 2026",
  "majstrovstvá sveta",
  "világbajnokság", "vb 2026",
  "campionatul mondial", "cupa mondială",
  "световно първенство",
  "svjetsko prvenstvo", "svetsko prvenstvo", "sp 2026",
  "svetovno prvenstvo",
  "vm 2026", "verdensmesterskap", "verdensmesterskab",
  "mm 2026", "maailmanmestaruus",
  "παγκόσμιο κύπελλο",
  "dünya kupası", "fifa dünya kupası",
  "كأس العالم", "كأس العالم 2026",
  "גביע העולם", "מונדיאל",
  "世界杯", "ワールドカップ", "월드컵",
  "ฟุตบอลโลก",
  "piala dunia", "world cup", "cúp thế giới",
  "विश्व कप", "फीफा विश्व कप", "বিশ্বকাপ"
];

const EXCLUSIONS = ["dessin animé", "cartoon", "animated", "anime", "kids", "children", "kinder", "kinderfilm", "dibujos animados", "cartone animato", "kreskówka"];

function isEroticProgram(title: string, desc: string, cats: string[]): boolean {
  const titleLower = title.toLowerCase();
  if (EXCLUSIONS.some(kw => titleLower.includes(kw))) return false;
  const catsLower = cats.map(c => c.toLowerCase()).join(" ");
  return EROTIC_CATEGORIES.some(kw => catsLower.includes(kw));
}

function isWorldCupMatch(title: string, desc: string, cats: string[]): boolean {
  const titleLower = title.toLowerCase();
  const descLower = desc.toLowerCase();
  const catsLower = cats.map(c => c.toLowerCase()).join(" ");
  const isSport = catsLower.includes("sport") || catsLower.includes("fußball") || catsLower.includes("football") || catsLower.includes("soccer") || catsLower.includes("fútbol") || catsLower.includes("calcio") || catsLower.includes("voetbal") || catsLower.includes("piłka nożna");
  if (!isSport) return false;
  if (EXCLUSIONS.some(kw => titleLower.includes(kw))) return false;
  const text = `${titleLower} ${descLower}`;
  return WORLDCUP_TITLES.some(kw => text.includes(kw));
}

async function fetchEPG(countryCode: string) {
  try {
    const url = `https://iptv-epg.org/files/epg-${countryCode}.xml.gz`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return { erotica: [], worldcup: [] };
    
    const buf = Buffer.from(await res.arrayBuffer());
    const xml = gunzipSync(buf).toString("utf-8");
    
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", trimValues: true, processEntities: false });
    const doc = parser.parse(xml);
    const tv = doc.tv ?? {};
    
    const now = Date.now();
    const channels: Record<string, string> = {};
    
    for (const ch of asArray<any>(tv.channel)) {
      const id = ch["@_id"];
      if (!id) continue;
      const names = asArray<any>(ch["display-name"]).map(textOf).map(decode).filter(Boolean);
      channels[id] = names[0] || id;
    }
    
    const erotica: any[] = [];
    const worldcup: any[] = [];
    
    for (const p of asArray<any>(tv.programme)) {
      const start = p["@_start"];
      const stop = p["@_stop"];
      if (!start || !stop) continue;
      
      const startTime = xmltvToISO(start);
      const stopTime = xmltvToISO(stop);
      if (!startTime || !stopTime) continue;
      
      const startMs = new Date(startTime).getTime();
      const stopMs = new Date(stopTime).getTime();
      if (!(startMs <= now && now < stopMs)) continue;
      
      const channelId = p["@_channel"];
      const channelName = channels[channelId] || channelId;
      const channelClass = classifyChannel(channelName);
      
      const title = decode(textOf(asArray<any>(p.title)[0])) || "Sans titre";
      const desc = decode(textOf(asArray<any>(p.desc)[0])) || "";
      const cats = asArray<any>(p.category).map(textOf).map(decode).filter(Boolean);
      
      const prog = { 
        channel: channelName, 
        channelType: channelClass.type,
        channelIcon: channelClass.icon,
        title, desc, start: startTime, stop: stopTime 
      };
      
      if (isEroticProgram(title, desc, cats)) erotica.push(prog);
      if (isWorldCupMatch(title, desc, cats)) worldcup.push(prog);
    }
    
    return { erotica, worldcup };
  } catch (e) {
    return { erotica: [], worldcup: [] };
  }
}

export default async (req: Request) => {
  try {
    const url = new URL(req.url);
    const countriesParam = url.searchParams.get("countries") || "";
    
    if (!countriesParam) {
      return Response.json({
        countries: COUNTRIES.map(cc => ({
          code: cc,
          name: COUNTRY_NAMES[cc] || cc.toUpperCase(),
          flag: COUNTRY_FLAGS[cc] || "🌍"
        }))
      }, { headers: { "Cache-Control": "public, max-age=3600" } });
    }
    
    const selectedCountries = countriesParam.split(",").filter(c => COUNTRIES.includes(c));
    if (selectedCountries.length === 0) {
      return Response.json({ error: "Aucun pays valide", erotica: [], worldcup: [] }, { status: 200 });
    }
    
    const epgPromises = selectedCountries.map(cc => fetchEPG(cc));
    const epgResults = await Promise.all(epgPromises);
    
    const allErotica: any[] = [];
    const allWorldcup: any[] = [];
    
    selectedCountries.forEach((cc, idx) => {
      const result = epgResults[idx] || { erotica: [], worldcup: [] };
      result.erotica.forEach(p => {
        allErotica.push({ ...p, country: cc, countryName: COUNTRY_NAMES[cc] || cc.toUpperCase(), flag: COUNTRY_FLAGS[cc] || "🌍" });
      });
      result.worldcup.forEach(p => {
        allWorldcup.push({ ...p, country: cc, countryName: COUNTRY_NAMES[cc] || cc.toUpperCase(), flag: COUNTRY_FLAGS[cc] || "🌍" });
      });
    });
    
    return Response.json({
      generatedAt: new Date().toISOString(),
      erotica: allErotica.sort((a, b) => a.start.localeCompare(b.start)),
      worldcup: allWorldcup.sort((a, b) => a.start.localeCompare(b.start))
    }, { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Erreur serveur", erotica: [], worldcup: [] }, { status: 200 });
  }
};

export const config: Config = { path: "/api/monde-live" };
