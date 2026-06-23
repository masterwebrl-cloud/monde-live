import type { Config } from "@netlify/functions";
import { gunzipSync } from "node:zlib";
import { XMLParser } from "fast-xml-parser";

// 80 pays
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
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function isEroticProgram(title: string, desc: string, cats: string[]): boolean {
  const hay = `${title} ${desc} ${cats.join(" ")}`.toLowerCase();
  const eroticKeywords = ["erotic", "érotique", "erótico", "erotico", "erotisch", "erotyka", "erotik", "erotikfilm", "erotisches herzkino", "knisternde erotik", "erotismo", "películas eróticas", "cinema erotico", "sessualita", "film erotici", "sensuel", "sensual", "sensuale", "pornographique", "pornographic", "porn", "adult", "xxx", "adultos", "erotici", "pornografici", "pornográficas", "eróticas", "erotiek", "volwassenen", "porno", "porna", "erotych", "erotyczny", "dorośli", "dla dorosłych", "heiss", "sexy", "adulti"];
  return eroticKeywords.some(kw => hay.includes(kw));
}

async function fetchEPG(countryCode: string) {
  try {
    const url = `https://iptv-epg.org/files/epg-${countryCode}.xml.gz`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return [];
    
    const buf = Buffer.from(await res.arrayBuffer());
    const xml = gunzipSync(buf).toString("utf-8");
    
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", trimValues: true, processEntities: false });
    const doc = parser.parse(xml);
    const tv = doc.tv ?? {};
    
    const now = Date.now();
    const programmes: any[] = [];
    
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
      
      const title = decode(textOf(asArray<any>(p.title)[0])) || "Sans titre";
      const desc = decode(textOf(asArray<any>(p.desc)[0])) || "";
      const cats = asArray<any>(p.category).map(textOf).map(decode).filter(Boolean);
      
      if (!isEroticProgram(title, desc, cats)) continue;
      
      programmes.push({ channel: p["@_channel"], title, desc, start: startTime, stop: stopTime });
    }
    
    return programmes;
  } catch (e) {
    return [];
  }
}

export default async (req: Request) => {
  try {
    const url = new URL(req.url);
    const countriesParam = url.searchParams.get("countries") || "";
    
    // Retourne liste de pays si pas de sélection
    if (!countriesParam) {
      return Response.json({
        countries: COUNTRIES.map(cc => ({
          code: cc,
          name: COUNTRY_NAMES[cc] || cc.toUpperCase(),
          flag: COUNTRY_FLAGS[cc] || "🌍"
        }))
      }, { headers: { "Cache-Control": "public, max-age=3600" } });
    }
    
    // Parse les pays demandés
    const selectedCountries = countriesParam.split(",").filter(c => COUNTRIES.includes(c));
    if (selectedCountries.length === 0) {
      return Response.json({ error: "Aucun pays valide", programmes: [], worldcupMatches: [] }, { status: 200 });
    }
    
    // Charge les pays sélectionnés
    const epgPromises = selectedCountries.map(cc => fetchEPG(cc));
    const epgResults = await Promise.all(epgPromises);
    
    const allProgrammes: any[] = [];
    selectedCountries.forEach((cc, idx) => {
      const progs = epgResults[idx] || [];
      progs.forEach(p => {
        allProgrammes.push({
          ...p,
          country: cc,
          countryName: COUNTRY_NAMES[cc] || cc.toUpperCase(),
          flag: COUNTRY_FLAGS[cc] || "🌍"
        });
      });
    });
    
    return Response.json({
      generatedAt: new Date().toISOString(),
      programmes: allProgrammes.sort((a, b) => a.start.localeCompare(b.start)),
      worldcupMatches: []
    }, { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Erreur serveur", programmes: [], worldcupMatches: [] }, { status: 200 });
  }
};

export const config: Config = {
  path: "/api/monde-live",
};
