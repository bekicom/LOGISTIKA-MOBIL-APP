// O'zbek lotin ↔ kirill — suhbatdagi xabar o'quvchining yozuvida (TZ 29-okt §4.3.5).
//
// Webdagi `furam/src/lib/kirill.ts` (lotin → kirill) va `furam/src/lib/yozuv.ts`
// (kirill → lotin, qaysi matnga tegilishi) ning ILOVA NUSXASI — qoida bir xil
// bo'lishi shart. Webda o'zgarsa, shu yerda ham. Tarjima emas: AI yo'q.
//
// ── furam/src/lib/kirill.ts nusxasi ────────────────────────────────
// O'zbekcha lotin → kirill (Ўзбекча), TZ v2 §1 (2026-10-24).
//
// Mijoz: «Til — sof o'zbekcha lotin va kirill (Ўзбекча) + mavjud 8 til».
// Kirill lug'ati qo'lda tarjima QILINMAYDI: `uz.json` dagi 5000+ matn
// shu funksiya bilan yasaladi (`scripts/yasa-kirill.ts`). Lotincha matn
// o'zgarsa kirillchasi ham qayta yasaladi — ikki nusxa bir-biridan
// orqada qolmaydi (`test-kirill.ts` tekshiradi).
//
// ⚠️ SOF MODUL — klient, server va ilova ham ishlatadi. Importsiz.
//
// ── QOIDALAR (1995 yilgi imlo jadvali asosida) ───────────────────
//
//   o' → ў   g' → ғ   sh → ш   ch → ч   ng → нг
//   yo → ё   yu → ю   ya → я   ye → е   (yo'l → йўл: «o'» ustun)
//   e  → э so'z boshida, aks holda е
//   '  → ъ (tutuq belgisi: ma'lumot → маълумот)
//   h → ҳ   q → қ   x → х   j → ж   y → й
//   -tsiya → -ция (operatsiya), so'z boshidagi ts → ц (tsex);
//   so'z ichida «ts» → «тс» QOLADI: ketsa, o'tsa — fe'l qo'shimchasi
//
// O'GIRILMAYDI: {o'rin egalari}, <teglar>, havolalar, katta harfli
// qisqartmalar (FURAM, SMS, GPS, ID) va brend nomlari (Telegram,
// Google, Click…) — ular kirill matnda ham lotincha yoziladi.

const BREND = new Set(
  [
    "furam", "openai", "chatgpt", "telegram", "whatsapp", "google", "apple", "iphone", "ipad", "android",
    "click", "payme", "uzum", "eskiz", "expo", "play", "store", "app", "cargoruqsat", "wialon", "excel",
    "youtube", "instagram", "facebook", "visa", "mastercard", "humo", "uzcard", "lorry", "kornet",
    /* Texnika markalari (TZ 28-okt §42: «ВOLVO» kabi chala o'girish) — kirill
       matnda ham lotincha qoladi, e'lon nomida ham */
    "volvo", "scania", "daf", "mercedes", "benz", "kamaz", "iveco", "renault", "hyundai", "isuzu",
    "howo", "shacman", "faw", "kogel", "schmitz", "krone", "ford", "chevrolet", "gazelle", "sitrak",
  ].map((s) => s.toLowerCase()),
);

const BIR: Record<string, string> = {
  a: "а", b: "б", c: "ц", d: "д", e: "е", f: "ф", g: "г", h: "ҳ", i: "и", j: "ж", k: "к", l: "л", m: "м",
  n: "н", o: "о", p: "п", q: "қ", r: "р", s: "с", t: "т", u: "у", v: "в", w: "в", x: "х", y: "й", z: "з",
};
const APOS = /['ʻʼ‘’`]/;

/* Ruscha o'zlashma — kirillda yumshoq belgi bilan yoziladi */
const OZLASHMA: Record<string, string> = {
  yanvar: "январь", fevral: "февраль", aprel: "апрель", iyun: "июнь", iyul: "июль",
  sentyabr: "сентябрь", oktyabr: "октябрь", noyabr: "ноябрь", dekabr: "декабрь",
  kompyuter: "компьютер", oktyabrdan: "октябрдан",
};

/** Bitta lotincha so'z (tutuq belgisi bilan) */
function sozni(w: string): string {
  const past = w.toLowerCase();
  const tayyor = OZLASHMA[past];
  if (tayyor) return w[0] !== past[0] ? tayyor[0].toUpperCase() + tayyor.slice(1) : tayyor;
  const out: string[] = [];
  let i = 0;
  while (i < past.length) {
    const c = past[i];
    const n = past[i + 1] ?? "";
    const n2 = past[i + 2] ?? "";
    let k = "";
    let qadam = 1;

    if ((c === "o" || c === "g") && APOS.test(n)) {
      k = c === "o" ? "ў" : "ғ";
      qadam = 2;
    } else if (c === "s" && n === "h") {
      k = "ш";
      qadam = 2;
    } else if (c === "c" && n === "h") {
      k = "ч";
      qadam = 2;
    } else if (c === "y" && (n === "o" || n === "u" || n === "a" || n === "e") && !(n === "o" && APOS.test(n2))) {
      k = { o: "ё", u: "ю", a: "я", e: "е" }[n]!;
      qadam = 2;
    } else if (c === "t" && n === "s" && (i === 0 || past.startsWith("tsiya", i) || past.startsWith("tsion", i))) {
      k = "ц";
      qadam = 2;
    } else if (c === "e" && (i === 0 || APOS.test(past[i - 1] ?? ""))) {
      k = "э";
    } else if (APOS.test(c)) {
      /* Tutuq: so'z ichida, undoshdan yoki unlidan keyin */
      k = i > 0 && i < past.length - 1 ? "ъ" : c;
    } else {
      k = BIR[c] ?? c;
    }

    /* Bosh harf: asl so'zda shu o'rin katta bo'lsa */
    if (w[i] !== past[i] && k) k = k[0].toUpperCase() + k.slice(1);
    out.push(k);
    i += qadam;
  }
  return out.join("");
}

/** O'girilmaydigan so'zmi: qisqartma, brend, raqam-harf aralash */
function saqlansin(w: string): boolean {
  const toza = w.replace(/['ʻʼ‘’`]/g, "");
  if (toza.length >= 2 && toza === toza.toUpperCase() && /[A-Z]/.test(toza)) return true;
  if (BREND.has(toza.toLowerCase())) return true;
  /* camelCase / ichki katta harf — texnik nom (WhatsApp, iPhone) */
  if (/[a-z][A-Z]/.test(toza)) return true;
  return false;
}

/**
 * Bitta so'z — qo'shimchali qisqartma va brend ham (TZ 28-okt §42).
 *
 * «FURAM'dan» → «ФУРАМъдан», «Google'ni» → «Гооглеъни», «VOLVOni» →
 * «ВОЛВОни» chiqardi: so'z bir butun deb o'girilardi. Endi asos
 * (qisqartma yoki brend) lotincha qoladi, faqat qo'shimcha o'giriladi:
 * «FURAM'дан», «Google'ни», «VOLVOни».
 */
function soz(w: string): string {
  if (saqlansin(w)) return w;
  const m = /^([A-Za-z]+)(['ʻʼ‘’`])([a-z].*)$/.exec(w);
  if (m && saqlansin(m[1])) return m[1] + m[2] + sozni(m[3]);
  /* «VOLVOni», «FURAMga» — katta harfli asos + kichik qo'shimcha */
  const k = /^([A-Z]{2,})([a-z]+)$/.exec(w);
  if (k) return k[1] + sozni(k[2]);
  /* «Googleni», «Volvoga» — brend + qo'shimcha */
  const past = w.toLowerCase();
  for (const b of BREND) {
    if (b.length >= 4 && past.startsWith(b) && past.length > b.length && past.length - b.length <= 5) {
      return w.slice(0, b.length) + sozni(w.slice(b.length));
    }
  }
  return sozni(w);
}

/** Oddiy matn bo'lagi (o'rin egalarisiz) */
function matnni(s: string): string {
  /* Domen va manzil o'girilmaydi: «FURAM.uz» → «FURAM.уз» bo'lib qolardi
     (TZ v3 §15-25, sahifa sarlavhasi). Bo'laklarga ajratib, domenlar asl holida */
  return s
    .split(/(\b[\w-]+\.(?:uz|com|ru|org|net|kz|me|io)\b(?:\/[\w\-./?=&#%]*)?)/)
    .map((b, i) => (i % 2 === 1 ? b : b.replace(/[A-Za-z]+(?:['ʻʼ‘’`][A-Za-z]+)*['ʻʼ‘’`]?/g, soz)))
    .join("");
}

/** Himoyalanadigan bo'laklar: {x}, %{x}, <teg>, havola, e-pochta */
const HIMOYA = /(%?\{[^{}]*\}|<[^<>]+>|https?:\/\/\S+|[\w.+-]+@[\w-]+\.[\w.]+|\/[a-z0-9\-/?=&#.]+(?=\s|$|[),.;]))/gi;

/** Lotincha o'zbek matnini kirillga o'giradi */
export function kirillga(s: string): string {
  let out = "";
  let oxirgi = 0;
  for (const m of s.matchAll(HIMOYA)) {
    out += matnni(s.slice(oxirgi, m.index)) + m[0];
    oxirgi = m.index! + m[0].length;
  }
  return out + matnni(s.slice(oxirgi));
}

// ── furam/src/lib/yozuv.ts nusxasi ─────────────────────────────────

const UNLI = "аеёиоуэюяўАЕЁИОУЭЮЯЎ";

const HARF: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", ё: "yo", ж: "j", з: "z", и: "i", й: "y", к: "k", л: "l",
  м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "x", ц: "ts", ч: "ch",
  ш: "sh", ъ: "'", ь: "", э: "e", ю: "yu", я: "ya", ў: "o'", қ: "q", ғ: "g'", ҳ: "h", ы: "i", щ: "sh",
};

/** Kirill o'zbek matnini lotinga o'giradi */
export function lotinga(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const past = c.toLowerCase();
    let k: string;
    if (past === "е") {
      /* So'z boshida va unlidan keyin «ye» (ер → yer, бее → beye) */
      const oldin = s[i - 1] ?? "";
      k = !oldin || !/[а-яёўқғҳ]/i.test(oldin) || UNLI.includes(oldin) ? "ye" : "e";
    } else {
      k = HARF[past] ?? c;
    }
    if (c !== past && k) {
      /* Bosh harf: «Ш» so'z ichida katta harflar orasida bo'lsa — «SH» */
      const keyingi = s[i + 1] ?? "";
      k = keyingi && keyingi !== keyingi.toLowerCase() ? k.toUpperCase() : k[0].toUpperCase() + k.slice(1);
    }
    out += k;
  }
  return out;
}

/** O'zbekcha kirill matnmi: faqat o'zbek kirilliga xos harf bo'lsa (ў, қ, ғ, ҳ) */
export function ozbekKirillmi(s: string): boolean {
  if (!/[ўЎ]/.test(s) && !/[қғҳҚҒҲ]/.test(s)) return false;
  /* Qozoq, tojik, qirg'iz — boshqa xos harflari bor */
  return !/[әңөұүһіҷӣӯӘҢӨҰҮҺІҶӢӮ]/.test(s);
}

/** O'zbekcha lotin matnmi: kirill yo'q va o'zbekcha belgisi bor */
export function ozbekLotinmi(s: string): boolean {
  if (/[Ѐ-ӿ一-鿿]/.test(s)) return false;
  if (/[şğıİçöüŞĞÇÖÜ]/.test(s)) return false;
  return /\b[a-z]*(o['ʻʼ‘’`]|g['ʻʼ‘’`])/i.test(s) || /\b(va|bilan|uchun|kerak|bor|yo'q|yuk|mashina|haydovchi|salom|rahmat|qayerda|bugun|ertaga|narx|necha|qancha|bo'ladi|shofyor|fura)\b/i.test(s);
}

/**
 * Matnni o'quvchining yozuviga moslaydi. `locale` — sayt/ilova tili
 * (`uz` — lotin, `uz-Cyrl` — kirill). Boshqa tilda o'zgarishsiz.
 */
export function yozuvgaMos(s: string, locale: string): string {
  if (!s) return s;
  if (locale === "uz-Cyrl" && ozbekLotinmi(s)) return kirillga(s);
  if (locale === "uz" && ozbekKirillmi(s)) return lotinga(s);
  return s;
}
