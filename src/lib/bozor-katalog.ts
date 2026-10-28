// FURAM Bozor: toifa → jihozlar, kuzov/texnika turi, markalar (TZ 28-okt §9, §10).
//
// ⚠️ Ilova shu faylning ANIQ nusxasini ishlatadi (`mobil/src/lib/bozor-katalog.ts`),
// `test-tz4-bozor.ts` ikkalasini solishtiradi. O'zgartirsangiz — ikkalasini birdan.
// Import faqat `./mashina-katalog` dan (u ham ikkala tomonda bir xil).
//
// Tekshiruvdagi muammo: 8 toifaning hammasida bir xil jihozlar (yengil avtoda
// «Retarder», avtobusda «Yotoqli kabina»), mikroavtobusda o'rindiq yo'q, maxsus
// texnikada texnika turi yo'q; marka filtri e'lon nomlaridan yig'ilgan
// («Прицеп», «Нержавейка Бочка», «SCHMITIZ», «CHACMAN»).
import { MARKALAR, type Kategoriya, type Marka } from "./mashina-katalog";

export type SaleToifa = "FURA" | "TRUCK" | "TRAILER" | "MINIBUS" | "BUS" | "SPECIAL" | "CAR" | "OTHER";

/** Hamma jihoz kalitlari — nomi lug'atda `saleCatalog.feature.<kalit>` */
export const JIHOZLAR = [
  "gps",
  "webasto",
  "ac",
  "fridge",
  "retarder",
  "cruise",
  "hydro",
  "sleeper",
  "adr",
  "tir",
  "wifi",
  "usb",
  "luggage",
  "tv",
  "toilet",
  "recliner",
  "camera",
  "leather",
  "sunroof",
  "parktronic",
] as const;
export type Jihoz = (typeof JIHOZLAR)[number];

/** Har toifaga o'z jihozlari: yengil avtoda Retarder yo'q, avtobusda Wi-Fi bor */
export const TOIFA_JIHOZLARI: Record<SaleToifa, readonly Jihoz[]> = {
  FURA: ["gps", "webasto", "ac", "retarder", "cruise", "sleeper", "adr", "tir", "hydro"],
  TRUCK: ["gps", "webasto", "ac", "retarder", "cruise", "sleeper", "adr", "fridge", "hydro"],
  TRAILER: ["fridge", "adr", "tir", "hydro"],
  MINIBUS: ["ac", "gps", "webasto", "wifi", "usb", "luggage", "recliner", "camera"],
  BUS: ["ac", "gps", "webasto", "wifi", "usb", "luggage", "recliner", "tv", "toilet", "camera"],
  SPECIAL: ["ac", "gps", "hydro", "webasto", "camera"],
  CAR: ["ac", "gps", "cruise", "camera", "parktronic", "leather", "sunroof"],
  OTHER: JIHOZLAR,
};

export function toifaJihozlari(toifa: string | null | undefined): readonly Jihoz[] {
  return TOIFA_JIHOZLARI[(toifa ?? "OTHER") as SaleToifa] ?? JIHOZLAR;
}

/**
 * Kuzov turi — toifaga qarab ro'yxatdan. Maxsus texnikada bu «texnika
 * turi» (ekskavator, avtokran…). Nomi lug'atda `saleCatalog.body.<kalit>`.
 * Ro'yxatda yo'q eski qiymat (qo'lda yozilgan) o'zgarmay ko'rsatiladi.
 */
export const KUZOV_TURLARI: Record<SaleToifa, readonly string[]> = {
  FURA: [],
  TRUCK: ["tent", "bort", "samosval", "furgon", "ref", "izoterm", "tsisterna", "manipulyator", "evakuator"],
  TRAILER: ["tent", "ref", "izoterm", "bort", "tral", "konteynerovoz", "tsisterna", "samosval", "lesovoz", "avtovoz"],
  MINIBUS: ["yolovchi", "yukYolovchi", "furgon"],
  BUS: ["shahar", "shaharlararo", "turistik", "maktab"],
  SPECIAL: [
    "ekskavator",
    "ekskavatorYuklagich",
    "buldozer",
    "avtokran",
    "frontalYuklagich",
    "greyder",
    "katok",
    "traktor",
    "manipulyator",
    "forklift",
    "betonAralashtirgich",
    "avtovyshka",
  ],
  CAR: ["sedan", "xetchbek", "universal", "krossover", "jip", "miniven", "pikap"],
  OTHER: [],
};

/** Maxsus texnikada «kuzov» o'rniga «texnika turi» deb yoziladi */
export const TEXNIKA_TURI_TOIFASI: SaleToifa = "SPECIAL";

/** O'rindiqlar soni so'raladigan toifalar */
export const ORINDIQ_TOIFALARI: readonly SaleToifa[] = ["MINIBUS", "BUS"];

/** «Tirkama bilan birga» faqat tyagachda (Furalar) */
export const TIRKAMA_BILAN_TOIFA: SaleToifa = "FURA";

/* Yengil avtomobil markalari — Parkimda bu bo'lim yo'q */
const CAR: readonly Marka[] = [
  { nom: "Chevrolet", kir: "Шевроле", modellar: ["Cobalt", "Gentra", "Nexia", "Spark", "Malibu", "Tracker", "Captiva", "Onix", "Damas", "Labo"] },
  { nom: "Daewoo", kir: "Дэу", modellar: ["Nexia", "Matiz", "Lacetti", "Damas"] },
  { nom: "Ravon", kir: "Равон", modellar: ["R2", "R3", "R4", "Gentra"] },
  { nom: "Kia", kir: "Киа", modellar: ["K5", "Sportage", "Sorento", "Rio", "Carnival", "Seltos"] },
  { nom: "Hyundai", kir: "Хёндай", modellar: ["Sonata", "Elantra", "Tucson", "Santa Fe", "Accent", "Creta"] },
  { nom: "Toyota", kir: "Тойота", modellar: ["Camry", "Corolla", "RAV4", "Land Cruiser", "Prado", "Hilux"] },
  { nom: "Lada", kir: "Лада", modellar: ["Granta", "Vesta", "Niva", "Largus"] },
  { nom: "BYD", kir: "БИД", modellar: ["Song Plus", "Han", "Chazor", "Seagull"] },
  { nom: "Chery", kir: "Чери", modellar: ["Tiggo 7", "Tiggo 8", "Arrizo"] },
  { nom: "Haval", kir: "Хавал", modellar: ["H6", "Jolion", "Dargo"] },
  { nom: "Mercedes-Benz", kir: "Мерседес-Бенц", modellar: ["E-Class", "S-Class", "C-Class", "GLE"] },
  { nom: "BMW", kir: "БМВ", modellar: ["3", "5", "7", "X5"] },
  { nom: "Volkswagen", kir: "Фольксваген", modellar: ["Polo", "Passat", "Tiguan"] },
  { nom: "Nissan", kir: "Ниссан", modellar: ["Patrol", "X-Trail", "Almera"] },
  { nom: "Lexus", kir: "Лексус", modellar: ["LX", "RX", "ES"] },
];

/* Mikroavtobus — avtobus ro'yxatiga qo'shimcha */
const MINIBUS_QOSHIMCHA: readonly Marka[] = [
  { nom: "Toyota", kir: "Тойота", modellar: ["Hiace", "Coaster"] },
  { nom: "Hyundai", kir: "Хёндай", modellar: ["Starex", "H-1", "County", "Solati"] },
  { nom: "Chevrolet", kir: "Шевроле", modellar: ["Damas"] },
];

/* Bozorda uchraydigan, Parkim ro'yxatida yo'q tyagach va tirkama markalari */
const FURA_QOSHIMCHA: readonly Marka[] = [
  { nom: "Sitrak", kir: "Ситрак", modellar: ["C7H", "G7"] },
  { nom: "Farizon", kir: "Фаризон", modellar: ["H9", "V6E"] },
];
const TIRKAMA_QOSHIMCHA: readonly Marka[] = [{ nom: "UzAutoTrailer", kir: "УзАвтоТрейлер", modellar: [] }];

function birlashtir(...royxatlar: (readonly Marka[])[]): Marka[] {
  const out = new Map<string, Marka>();
  for (const r of royxatlar) {
    for (const m of r) {
      const bor = out.get(m.nom);
      out.set(m.nom, bor ? { ...bor, modellar: [...new Set([...bor.modellar, ...m.modellar])] } : m);
    }
  }
  return [...out.values()];
}

const K = (k: Kategoriya) => MARKALAR[k];

/** Toifa bo'yicha marka ro'yxati */
export const BOZOR_MARKALARI: Record<SaleToifa, readonly Marka[]> = {
  FURA: birlashtir(K("tyagach"), FURA_QOSHIMCHA),
  TRUCK: birlashtir(K("isuzu"), K("samosval"), K("bongo"), K("labo"), K("tyagach")),
  TRAILER: birlashtir(K("tirkama"), TIRKAMA_QOSHIMCHA),
  MINIBUS: birlashtir(K("avtobus"), MINIBUS_QOSHIMCHA),
  BUS: birlashtir(K("avtobus")),
  SPECIAL: birlashtir(K("maxsus")),
  CAR: birlashtir(CAR),
  OTHER: [],
};

/** Hamma marka bir joyda — filtr va tozalash uchun */
const HAMMASI: Marka[] = birlashtir(
  ...Object.values(MARKALAR),
  CAR,
  MINIBUS_QOSHIMCHA,
  FURA_QOSHIMCHA,
  TIRKAMA_QOSHIMCHA,
);

export function bozorMarkalari(toifa: string | null | undefined): readonly Marka[] {
  const r = BOZOR_MARKALARI[(toifa ?? "OTHER") as SaleToifa];
  return r && r.length ? r : HAMMASI;
}

/** Tirkama markalari — «Tirkama bilan birga» bo'limi uchun */
export const TIRKAMA_MARKALARI: readonly Marka[] = BOZOR_MARKALARI.TRAILER;

/* ── Qidiruv va tozalash ────────────────────────────────────────── */

const KIR: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "j", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "s", ч: "ch", ш: "sh", щ: "sh",
  ъ: "", ы: "i", ь: "", э: "e", ю: "yu", я: "ya", ў: "o", қ: "q", ғ: "g", ҳ: "h",
};

/** Kichik harf, kirill → lotin, diakritika olib tashlanadi («Kögel» → «kogel») */
function lotin(s: string): string {
  return [...s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()].map((c) => KIR[c] ?? c).join("");
}
function tokenlar(s: string): string[] {
  return lotin(s)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}
const norm = (s: string) => tokenlar(s).join("");

/**
 * Marka qidiruvi — toifaning ro'yxatidan, lotin va kirill bilan. MODEL
 * nomi bilan ham topiladi: «Damas» → Chevrolet, Daewoo (TZ 28-okt §56).
 */
export function bozorMarkaQidir(toifa: string | null | undefined, q: string): Marka[] {
  const r = bozorMarkalari(toifa);
  const n = norm(q);
  if (!n) return [...r];
  return r.filter(
    (m) =>
      norm(m.nom).startsWith(n) ||
      norm(m.kir).startsWith(n) ||
      tokenlar(m.nom).some((w) => w.startsWith(n)) ||
      m.modellar.some((md) => norm(md).startsWith(n)),
  );
}

/** Qidiruv so'zi markaning qaysi modeliga to'g'ri keldi (marka nomiga emas) */
export function modelMos(m: Marka, q: string): string | null {
  const n = norm(q);
  if (!n || norm(m.nom).startsWith(n) || norm(m.kir).startsWith(n)) return null;
  return m.modellar.find((md) => norm(md).startsWith(n)) ?? null;
}

function lev(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
}

/* Bir marta yig'iladigan indeks: marka → solishtiriladigan so'zlar */
const INDEKS = HAMMASI.map((m) => ({
  nom: m.nom,
  sozlar: [...new Set([...tokenlar(m.nom), ...tokenlar(m.kir), norm(m.nom), norm(m.kir)].filter((s) => s.length >= 2))],
}));

function tokenMarka(t: string): string | null {
  let eng: { nom: string; ball: number } | null = null;
  for (const m of INDEKS) {
    for (const s of m.sozlar) {
      let ball = 0;
      if (t === s) ball = 3;
      else if (t.length >= 4 && s.length >= 4 && (t.startsWith(s) || s.startsWith(t))) ball = 2;
      else if (s.length >= 5 && t.length >= 5 && lev(t, s) <= (s.length >= 8 ? 2 : 1)) ball = 1;
      if (ball && (!eng || ball > eng.ball)) eng = { nom: m.nom, ball };
    }
  }
  return eng?.nom ?? null;
}

/**
 * Erkin matndan haqiqiy marka (TZ 28-okt §10): «Прицеп SCHMITZ сотилади» →
 * Schmitz Cargobull, «CHACMAN» → Shacman, «#FAW J7» → FAW. Marka bo'lmasa
 * («Прицеп», «Нержавейка Бочка») — `null`: filtrda chiqmaydi.
 */
export function kanonMarka(raw: string | null | undefined): string | null {
  return markaAjrat(raw)?.marka ?? null;
}

/**
 * Marka va qolgan matn: «MAN TGX 18.470» → { marka: "MAN", qolgan: "TGX 18.470" }.
 * «+» dan keyingi qism (ikkinchi texnika, odatda tirkama) — `ikkinchi`:
 * «MAN TGX + KRONE Прицеп» → ikkinchi: "Krone".
 */
export function markaAjrat(raw: string | null | undefined): { marka: string; qolgan: string; ikkinchi: string | null } | null {
  if (!raw?.trim()) return null;
  const [asosiy, ...keyin] = raw.split("+");
  const sozlar = asosiy.replace(/#/g, " ").split(/\s+/).filter(Boolean);
  for (let i = 0; i < sozlar.length; i++) {
    const t = tokenlar(sozlar[i]).join("");
    if (t.length < 2) continue;
    const marka = tokenMarka(t);
    if (marka) {
      const qolgan = sozlar
        .filter((_, j) => j !== i)
        .join(" ")
        .trim();
      let ikkinchi: string | null = null;
      for (const k of keyin.join(" ").split(/\s+/)) {
        const tk = tokenlar(k).join("");
        if (tk.length >= 2 && (ikkinchi = tokenMarka(tk))) break;
      }
      return { marka, qolgan, ikkinchi };
    }
  }
  return null;
}
