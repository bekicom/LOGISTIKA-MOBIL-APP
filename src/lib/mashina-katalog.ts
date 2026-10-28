// Parkim: mashina turi → forma, marka → model → yil (TZ v3 §7, §15-13).
//
// ⚠️ IMPORT YO'Q — ataylab: ilova shu faylning ANIQ nusxasini ishlatadi
// (`mobil/src/lib/mashina-katalog.ts`), `test-tz3.ts` ikkalasini
// solishtiradi. O'zgartirsangiz — ikkalasini birdan.
//
// Tekshiruvdagi muammo: Parkimda 21 tur bitta ro'yxatda, hammasiga bir xil
// maydonlar; marka va model qo'lda («vo» → hech narsa), yil — oddiy raqam;
// tirkama turi ro'yxatida Labo, Bongo chiqadi. Endi avval TUR tanlanadi
// (8 ta katta tugma), forma shunga qarab o'zgaradi; marka va model faqat shu
// turning ro'yxatidan, kirill bilan ham («вольво» → Volvo).

export type Kategoriya = "labo" | "bongo" | "isuzu" | "tyagach" | "samosval" | "maxsus" | "avtobus" | "tirkama";

/** Turga xos maydon — `Vehicle` ustuni yoki `xususiyat` JSON kaliti */
export type Maydon =
  | { k: "capacityT" | "volumeM3" | "bodyLengthM"; tur: "son" }
  | { k: "kuzov" | "tirkamaTuri" | "evro" | "maxsusTuri" | "bagaj" | "litsenziya"; tur: "tanlov"; variant: readonly string[] }
  | { k: "otKuchi" | "egar" | "haroratMin" | "haroratMax" | "motoSoat" | "kotarish" | "orinlar"; tur: "son" };

export type KategoriyaInfo = {
  key: Kategoriya;
  /** `Vehicle.part` */
  part: "SINGLE" | "TRACTOR" | "TRAILER";
  /** Ruxsat etilgan `VehicleType.key` lar — birinchisi standart */
  turlar: readonly string[];
  maydonlar: readonly Maydon[];
  /** Tirkama: yo'q · pritsep ulanadi · yarim tirkama ulanadi · o'zi tirkama */
  tirkama: "yoq" | "pritsep" | "yarim" | "ozi";
};

const KUZOV = ["ochiq", "tent", "furgon"] as const;
export const TIRKAMA_TURLARI = ["tent", "ref", "izoterm", "bort", "tral", "konteynerovoz", "tsisterna"] as const;
/** Tirkama turi → `VehicleType.key` (lenta va moslash shu bilan ishlaydi) */
export const TIRKAMA_VT: Record<(typeof TIRKAMA_TURLARI)[number], string> = {
  tent: "tent",
  ref: "ref",
  izoterm: "izoterm",
  bort: "platforma",
  tral: "tral",
  konteynerovoz: "konteyner",
  tsisterna: "avtotsisterna",
};

export const KATEGORIYALAR: readonly KategoriyaInfo[] = [
  {
    key: "labo",
    part: "SINGLE",
    turlar: ["labo"],
    maydonlar: [{ k: "capacityT", tur: "son" }, { k: "kuzov", tur: "tanlov", variant: KUZOV }, { k: "volumeM3", tur: "son" }],
    tirkama: "yoq",
  },
  {
    key: "bongo",
    part: "SINGLE",
    turlar: ["bongo", "furgon"],
    maydonlar: [{ k: "capacityT", tur: "son" }, { k: "kuzov", tur: "tanlov", variant: KUZOV }, { k: "volumeM3", tur: "son" }],
    tirkama: "yoq",
  },
  {
    key: "isuzu",
    part: "SINGLE",
    turlar: ["isuzu", "isuzu10", "furgon", "tent", "ref", "izoterm"],
    maydonlar: [
      { k: "capacityT", tur: "son" },
      { k: "kuzov", tur: "tanlov", variant: KUZOV },
      { k: "bodyLengthM", tur: "son" },
      { k: "volumeM3", tur: "son" },
    ],
    tirkama: "pritsep",
  },
  {
    key: "tyagach",
    part: "TRACTOR",
    turlar: ["fura"],
    maydonlar: [
      { k: "otKuchi", tur: "son" },
      { k: "evro", tur: "tanlov", variant: ["euro3", "euro4", "euro5", "euro6"] },
      { k: "egar", tur: "son" },
    ],
    tirkama: "yarim",
  },
  {
    key: "samosval",
    part: "SINGLE",
    turlar: ["samosval"],
    maydonlar: [{ k: "capacityT", tur: "son" }, { k: "volumeM3", tur: "son" }],
    tirkama: "yoq",
  },
  {
    key: "maxsus",
    part: "SINGLE",
    turlar: ["special"],
    maydonlar: [
      { k: "maxsusTuri", tur: "tanlov", variant: ["kran", "ekskavator", "pogruzchik", "buldozer", "greyder", "katok", "boshqa"] },
      { k: "motoSoat", tur: "son" },
      { k: "kotarish", tur: "son" },
    ],
    tirkama: "yoq",
  },
  {
    key: "avtobus",
    part: "SINGLE",
    turlar: ["boshqa"],
    maydonlar: [
      { k: "orinlar", tur: "son" },
      { k: "bagaj", tur: "tanlov", variant: ["ha", "yoq"] },
      { k: "litsenziya", tur: "tanlov", variant: ["ha", "yoq"] },
    ],
    tirkama: "yoq",
  },
  {
    key: "tirkama",
    part: "TRAILER",
    turlar: Object.values(TIRKAMA_VT),
    maydonlar: [
      { k: "tirkamaTuri", tur: "tanlov", variant: TIRKAMA_TURLARI },
      { k: "bodyLengthM", tur: "son" },
      { k: "volumeM3", tur: "son" },
      { k: "capacityT", tur: "son" },
      /* Faqat ref uchun — forma `tirkamaTuri === "ref"` da ko'rsatadi */
      { k: "haroratMin", tur: "son" },
      { k: "haroratMax", tur: "son" },
    ],
    tirkama: "ozi",
  },
];

export function kategoriyaInfo(k: string | null | undefined): KategoriyaInfo | undefined {
  return KATEGORIYALAR.find((x) => x.key === k);
}

/** Maydon shu holatda ko'rinadimi (ref harorati faqat ref tirkamada) */
export function maydonKorinadi(m: Maydon, qiymat: Record<string, string>): boolean {
  if (m.k === "haroratMin" || m.k === "haroratMax") return qiymat.tirkamaTuri === "ref";
  return true;
}

export type Marka = { nom: string; kir: string; modellar: readonly string[] };

/**
 * Marka va modellar — turga qarab. `kir` — kirill yozuvi (qidiruv uchun):
 * «вольво» → Volvo, «камаз» → KAMAZ.
 */
export const MARKALAR: Record<Kategoriya, readonly Marka[]> = {
  labo: [
    { nom: "Chevrolet", kir: "Шевроле", modellar: ["Labo", "Damas"] },
    { nom: "Daewoo", kir: "Дэу", modellar: ["Labo", "Damas"] },
  ],
  bongo: [
    { nom: "Kia", kir: "Киа", modellar: ["Bongo III", "Bongo K2500", "Bongo K4000"] },
    { nom: "Hyundai", kir: "Хёндай", modellar: ["Porter", "Porter II", "HD35", "H100"] },
    { nom: "GAZ", kir: "ГАЗ", modellar: ["Gazelle Next", "Gazelle Business", "Sobol"] },
    { nom: "Ford", kir: "Форд", modellar: ["Transit"] },
    { nom: "Foton", kir: "Фотон", modellar: ["Aumark", "Tunland"] },
    { nom: "JAC", kir: "ДЖАК", modellar: ["N35", "N56"] },
    { nom: "Isuzu", kir: "Исузу", modellar: ["NMR", "NKR"] },
  ],
  isuzu: [
    { nom: "Isuzu", kir: "Исузу", modellar: ["NPR", "NQR", "NMR", "ELF", "FVR", "FRR"] },
    { nom: "Hyundai", kir: "Хёндай", modellar: ["HD65", "HD78", "HD120", "Mighty", "Pavise"] },
    { nom: "MAN", kir: "МАН", modellar: ["TGL", "TGM"] },
    { nom: "Mercedes-Benz", kir: "Мерседес-Бенц", modellar: ["Atego", "Axor", "Sprinter"] },
    { nom: "Iveco", kir: "Ивеко", modellar: ["Eurocargo", "Daily"] },
    { nom: "Volvo", kir: "Вольво", modellar: ["FL", "FE"] },
    { nom: "KAMAZ", kir: "КамАЗ", modellar: ["4308", "43253", "Kompass"] },
    { nom: "GAZ", kir: "ГАЗ", modellar: ["Valdai", "GAZon Next"] },
    { nom: "Foton", kir: "Фотон", modellar: ["Aumark", "Ollin"] },
    { nom: "JAC", kir: "ДЖАК", modellar: ["N80", "N120"] },
    { nom: "Shacman", kir: "Шакман", modellar: ["X3000 4x2"] },
  ],
  tyagach: [
    { nom: "Volvo", kir: "Вольво", modellar: ["FH", "FH16", "FM", "FMX"] },
    { nom: "Scania", kir: "Скания", modellar: ["R", "S", "G", "P"] },
    { nom: "Mercedes-Benz", kir: "Мерседес-Бенц", modellar: ["Actros", "Arocs", "Axor"] },
    { nom: "MAN", kir: "МАН", modellar: ["TGX", "TGS"] },
    { nom: "DAF", kir: "ДАФ", modellar: ["XF", "XG", "CF"] },
    { nom: "Iveco", kir: "Ивеко", modellar: ["S-Way", "Stralis"] },
    { nom: "Renault", kir: "Рено", modellar: ["T", "Premium", "Magnum"] },
    { nom: "KAMAZ", kir: "КамАЗ", modellar: ["5490", "54901", "65116", "65206"] },
    { nom: "MAZ", kir: "МАЗ", modellar: ["5440", "6430", "6501"] },
    { nom: "Howo", kir: "Хово", modellar: ["A7", "T7H", "TX", "Max"] },
    { nom: "Shacman", kir: "Шакман", modellar: ["X3000", "X5000", "X6000", "F3000"] },
    { nom: "FAW", kir: "ФАВ", modellar: ["J6P", "JH6", "J7"] },
    { nom: "Dongfeng", kir: "Донгфенг", modellar: ["KX", "KL", "GX"] },
    { nom: "Ford", kir: "Форд", modellar: ["F-Max"] },
    { nom: "Foton", kir: "Фотон", modellar: ["Auman", "Galaxy"] },
  ],
  samosval: [
    { nom: "Howo", kir: "Хово", modellar: ["A7", "ZZ3257", "TX"] },
    { nom: "Shacman", kir: "Шакман", modellar: ["X3000", "F3000"] },
    { nom: "KAMAZ", kir: "КамАЗ", modellar: ["6520", "65115", "5511", "65801"] },
    { nom: "MAZ", kir: "МАЗ", modellar: ["6501", "5516", "5551"] },
    { nom: "Volvo", kir: "Вольво", modellar: ["FMX", "FM"] },
    { nom: "Scania", kir: "Скания", modellar: ["G", "P"] },
    { nom: "MAN", kir: "МАН", modellar: ["TGS"] },
    { nom: "Mercedes-Benz", kir: "Мерседес-Бенц", modellar: ["Arocs", "Actros"] },
    { nom: "FAW", kir: "ФАВ", modellar: ["J6P", "J5P"] },
    { nom: "Dongfeng", kir: "Донгфенг", modellar: ["KC", "KX"] },
  ],
  maxsus: [
    { nom: "Caterpillar", kir: "Катерпиллар", modellar: ["320", "330", "950", "D6"] },
    { nom: "Komatsu", kir: "Комацу", modellar: ["PC200", "PC300", "WA380", "D65"] },
    { nom: "Hitachi", kir: "Хитачи", modellar: ["ZX200", "ZX330"] },
    { nom: "JCB", kir: "ДЖСБ", modellar: ["3CX", "4CX", "JS220"] },
    { nom: "Liebherr", kir: "Либхерр", modellar: ["LTM 1060", "R 926"] },
    { nom: "XCMG", kir: "ИксСиЭмДжи", modellar: ["QY25K", "XE215", "LW500"] },
    { nom: "SANY", kir: "Сани", modellar: ["SY215", "STC250"] },
    { nom: "Zoomlion", kir: "Зумлион", modellar: ["QY25V", "ZE215"] },
    { nom: "Hyundai", kir: "Хёндай", modellar: ["R210", "HL770"] },
    { nom: "Doosan", kir: "Дусан", modellar: ["DX225", "DL300"] },
    { nom: "Shantui", kir: "Шантуй", modellar: ["SD16", "SL50"] },
    { nom: "LiuGong", kir: "Лиугонг", modellar: ["CLG856", "922"] },
    { nom: "Ivanovets", kir: "Ивановец", modellar: ["KS-45717"] },
  ],
  avtobus: [
    { nom: "Isuzu", kir: "Исузу", modellar: ["Novo", "Citiport", "Turquoise"] },
    { nom: "Mercedes-Benz", kir: "Мерседес-Бенц", modellar: ["Sprinter", "Tourismo", "Travego"] },
    { nom: "Hyundai", kir: "Хёндай", modellar: ["County", "Universe", "Solati"] },
    { nom: "Yutong", kir: "Ютонг", modellar: ["ZK6122", "ZK6938"] },
    { nom: "Golden Dragon", kir: "Голден Драгон", modellar: ["XML6127"] },
    { nom: "Higer", kir: "Хайгер", modellar: ["KLQ6128"] },
    { nom: "Ford", kir: "Форд", modellar: ["Transit"] },
    { nom: "GAZ", kir: "ГАЗ", modellar: ["Gazelle Next", "Gazelle Business"] },
    { nom: "Iveco", kir: "Ивеко", modellar: ["Daily"] },
    { nom: "Volkswagen", kir: "Фольксваген", modellar: ["Crafter"] },
    { nom: "Otokar", kir: "Отокар", modellar: ["Sultan", "Navigo"] },
  ],
  tirkama: [
    { nom: "Schmitz Cargobull", kir: "Шмиц", modellar: ["S.KO", "S.CS", "S.PR", "S.KI"] },
    { nom: "Krone", kir: "Кроне", modellar: ["Profi Liner", "Cool Liner", "Mega Liner"] },
    { nom: "Kögel", kir: "Кёгель", modellar: ["Cargo", "Mega"] },
    { nom: "Wielton", kir: "Вилтон", modellar: ["NS 3", "NW 3"] },
    { nom: "Kässbohrer", kir: "Кессборер", modellar: ["K.SCS", "K.STS"] },
    { nom: "Chereau", kir: "Шеро", modellar: ["Inogam"] },
    { nom: "Lamberet", kir: "Ламберет", modellar: ["SR2"] },
    { nom: "Tirsan", kir: "Тирсан", modellar: ["Kässbohrer"] },
    { nom: "Schwarzmüller", kir: "Шварцмюллер", modellar: ["Tent", "Plato"] },
    { nom: "Fruehauf", kir: "Фрюхауф", modellar: ["Tent"] },
    { nom: "Grunwald", kir: "Грюнвальд", modellar: ["Tent", "Bort"] },
    { nom: "MAZ", kir: "МАЗ", modellar: ["9758", "938662"] },
    { nom: "Nefaz", kir: "Нефаз", modellar: ["9334", "93341"] },
    { nom: "Tonar", kir: "Тонар", modellar: ["9523", "95231"] },
    { nom: "CIMC", kir: "СиАйЭмСиСи", modellar: ["Tent", "Tanker", "Lowbed"] },
  ],
};

/* Kirill → lotin (qidiruv uchun, qo'pol): «вольво» → «volvo» */
const KIR: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "j", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "s", ч: "ch", ш: "sh", щ: "sh",
  ъ: "", ы: "i", ь: "", э: "e", ю: "yu", я: "ya", ў: "o", қ: "q", ғ: "g", ҳ: "h",
};
function norm(s: string): string {
  return [...s.toLowerCase()].map((c) => KIR[c] ?? c).join("").replace(/[^a-z0-9]/g, "");
}

/**
 * Marka qidiruvi — faqat shu turning markalari (boshqa bo'lim so'zlari
 * chiqmaydi). Lotin va kirill: «vo», «во», «вольво» → Volvo.
 */
export function markaQidir(kategoriya: Kategoriya, q: string): Marka[] {
  const r = MARKALAR[kategoriya] ?? [];
  const n = norm(q);
  if (!n) return [...r];
  return r.filter((m) => {
    const nom = norm(m.nom);
    const kir = norm(m.kir);
    /* Model nomi bilan ham (TZ 28-okt §56): «Damas» → Chevrolet, Daewoo —
       «Labo / Damas» turida Damas markasi topilmasdi */
    return (
      nom.startsWith(n) ||
      kir.startsWith(n) ||
      m.nom.toLowerCase().split(/[\s-]+/).some((w) => norm(w).startsWith(n)) ||
      m.modellar.some((md) => norm(md).startsWith(n))
    );
  });
}

/** Yil ro'yxati — joriy yildan pastga (TZ v3 §3) */
export function yillar(hozir = new Date().getFullYear(), gacha = 1980): number[] {
  return Array.from({ length: hozir - gacha + 1 }, (_, i) => hozir - i);
}
