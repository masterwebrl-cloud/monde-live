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

// ─── EROTIC CATEGORIES (toutes langues) ───
const EROTIC_CATEGORIES = [
  // Anglais
  "erotic", "erotica", "porn", "pornography", "adult", "adult film", "adult movie", "xxx", "x-rated",
  // Français
  "érotique", "érotisme", "pornographique", "porno", "adulte", "film adulte", "film érotique",
  // Espagnol
  "erótico", "erotismo", "pornográfico", "porno", "adultos", "películas eróticas", "pornográficas", "eróticas",
  // Italien
  "erotico", "erotici", "erotismo", "pornografico", "pornografici", "adulti", "cinema erotico", "film erotici", "sessualita",
  // Allemand (Allemagne, Autriche, Suisse, Luxembourg)
  "erotisch", "erotik", "erotikfilm", "erotisches herzkino", "knisternde erotik", "porno", "erwachsene", "fsk 18",
  // Néerlandais (Pays-Bas, Belgique flamande)
  "erotiek", "erotisch", "volwassenen", "porno", "porna", "voor volwassenen",
  // Polonais
  "erotyka", "erotyczny", "porno", "dla dorosłych", "dorośli", "erotyczne",
  // Portugais (Portugal, Brésil)
  "erótico", "pornografia", "pornográfico", "adultos", "filme erótico",
  // Russe
  "эротика", "эротический", "порно", "для взрослых", "взрослые",
  // Ukrainien
  "еротика", "еротичний", "порно", "для дорослих",
  // Tchèque
  "erotický", "erotický film", "pornografie", "dospělí",
  // Slovaque
  "erotický", "erotika", "pornografia", "dospelí",
  // Hongrois
  "erotikus", "erotika", "pornográfia", "felnőtt",
  // Roumain
  "erotic", "erotism", "pornografie", "adulți",
  // Bulgare
  "еротичен", "еротика", "порно", "за възрастни",
  // Serbe/Croate/Bosnien
  "erotski", "erotika", "porno", "za odrasle", "odrasli",
  // Slovène
  "erotični", "erotika", "porno", "za odrasle",
  // Suédois
  "erotik", "erotisk", "porr", "vuxen", "för vuxna",
  // Norvégien
  "erotikk", "erotisk", "porno", "voksen", "voksne",
  // Danois
  "erotisk", "porno", "voksne", "for voksne",
  // Finnois
  "eroottinen", "erotiikka", "porno", "aikuisille",
  // Estonien
  "erootika", "erootiline", "porno", "täiskasvanutele",
  // Letton
  "erotika", "erotisks", "porno", "pieaugušajiem",
  // Lituanien
  "erotika", "erotinis", "porno", "suaugusiems",
  // Albanais
  "erotik", "pornografi", "për të rritur",
  // Grec
  "ερωτικό", "ερωτισμός", "πορνογραφία", "ενηλίκων",
  // Turc
  "erotik", "pornografi", "yetişkin",
  // Arabe (Égypte, Arabie Saoudite, EAU)
  "إثارة", "إباحي", "للكبار", "بالغين",
  // Hébreu
  "ארוטי", "פורנו", "למבוגרים",
  // Chinois
  "成人", "色情", "情色",
  // Japonais
  "アダルト", "成人", "エロ",
  // Coréen
  "성인", "에로",
  // Thaï
  "ผู้ใหญ่", "อีโรติก",
  // Indonésien/Malais
  "dewasa", "erotis", "porno",
  // Vietnamien
  "người lớn", "khiêu dâm", "tình dục",
  // Hindi
  "वयस्क", "अश्लील", "एडल्ट",
  // Bengali
  "প্রাপ্তবয়স্ক", "অশ্লীল"
];

// ─── WORLD CUP CATEGORIES (toutes langues) ───
const WORLDCUP_TITLES = [
  // Anglais
  "world cup", "fifa world cup", "fifa world cup 2026", "wc 2026", "fifa 2026",
  // Français
  "coupe du monde", "coupe du monde 2026", "mondial", "mondial 2026", "cdm 2026",
  // Espagnol
  "copa del mundo", "copa mundial", "mundial", "mundial 2026", "copa mundial fifa",
  // Italien
  "coppa del mondo", "mondiali", "mondiali 2026", "coppa del mondo fifa",
  // Allemand
  "weltmeisterschaft", "wm 2026", "fußball-wm", "fifa weltmeisterschaft",
  // Néerlandais
  "wereldkampioenschap", "wk 2026", "wk voetbal",
  // Polonais
  "mistrzostwa świata", "mś 2026", "mundial",
  // Portugais
  "copa do mundo", "copa do mundo 2026", "mundial 2026",
  // Russe
  "чемпионат мира", "чм 2026", "кубок мира",
  // Ukrainien
  "чемпіонат світу", "чс 2026",
  // Tchèque
  "mistrovství světa", "ms 2026", "fotbalové ms",
  // Slovaque
  "majstrovstvá sveta", "ms 2026",
  // Hongrois
  "világbajnokság", "vb 2026",
  // Roumain
  "campionatul mondial", "cupa mondială",
  // Bulgare
  "световно първенство", "световен куп",
  // Serbe/Croate
  "svjetsko prvenstvo", "svetsko prvenstvo", "sp 2026",
  // Slovène
  "svetovno prvenstvo",
  // Suédois
  "vm 2026", "fifa-vm", "världsmästerskap",
  // Norvégien
  "vm 2026", "verdensmesterskap",
  // Danois
  "vm 2026", "verdensmesterskab",
  // Finnois
  "mm 2026", "maailmanmestaruus",
  // Grec
  "παγκόσμιο κύπελλο", "παγκόσμιο πρωτάθλημα",
  // Turc
  "dünya kupası", "fifa dünya kupası",
  // Arabe
  "كأس العالم", "كأس العالم 2026",
  // Hébreu
  "גביע העולם", "מונדיאל",
  // Chinois
  "世界杯", "国际足联世界杯",
  // Japonais
  "ワールドカップ", "fifaワールドカップ",
  // Coréen
  "월드컵", "fifa 월드컵",
  // Thaï
  "ฟุตบอลโลก",
  // Indonésien
  "piala dunia", "piala dunia fifa",
  // Vietnamien
  "world cup", "cúp thế giới",
  // Hindi
  "विश्व कप", "फीफा विश्व कप",
  // Bengali
  "বিশ্বকাপ"
];

// ─── EXCLUSIONS (dessins animés, séries, etc.) ───
const EXCLUSIONS = [
  "dessin animé", "cartoon", "animated", "anime", "manga", "kids", "children", "enfant", "jeunesse", "famille", "family", "kinder", "kinderfilm", "dibujos animados", "cartone animato", "kreskówka", "bajka", "kreskówki"
];

function isEroticProgram(title: string, desc: string, cats: string[]): boolean {
  const titleLower = title.toLowerCase();
  
  // Exclure dessins animés/jeunesse
  if (EXCLUSIONS.some(kw => titleLower.includes(kw))) return false;
  
  // Vérifier les catégories explicitement érotiques
  const catsLower = cats.map(c => c.toLowerCase()).join(" ");
  return EROTIC_CATEGORIES.some(kw => catsLower.includes(kw));
}

function isWorldCupMatch(title: string, desc: string, cats: string[]): boolean {
  const titleLower = title.toLowerCase();
  const descLower = desc.toLowerCase();
  
  // Catégorie sport obligatoire
  const catsLower = cats.map(c => c.toLowerCase()).join(" ");
  const isSport = catsLower.includes("sport") || catsLower.includes("fußball") || catsLower.includes("football") || catsLower.includes("soccer") || catsLower.includes("fútbol") || catsLower.includes("calcio") || catsLower.includes("voetbal") || catsLower.includes("piłka nożna") || catsLower.includes("futebol");
  if (!isSport) return false;
  
  // Exclure dessins animés
  if (EXCLUSIONS.some(kw => titleLower.includes(kw))) return false;
  
  // Doit mentionner la Coupe du Monde
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
      const title = decode(textOf(asArray<any>(p.title)[0])) || "Sans titre";
      const desc = decode(textOf(asArray<any>(p.desc)[0])) || "";
      const cats = asArray<any>(p.category).map(textOf).map(decode).filter(Boolean);
      
      const prog = { channel: channelName, title, desc, start: startTime, stop: stopTime };
      
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
