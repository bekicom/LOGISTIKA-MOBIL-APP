// Ro'yxatdan o'tish va kirishdagi davlat kodlari.
//
// 2026-09-14 (mijoz TZ): MDH va Yevropa ochildi — 40 kod.
// 2026-10-24 (Yakuniy TZ v2, Audit 2): «barcha davlat kodlari,
// qidiruv, IP bo'yicha avtomatik kod» — qabul mezoni «xitoylik +86
// bilan ro'yxatdan o'ta oladi va kod o'zi tanlanadi».
//
// ⚠️ BU FAYL YASALADI — qo'lda tahrirlamang. Manba
// `furam/src/lib/phone-country.ts` (DAVLATLAR, 226 davlat), yasovchi
// skript sinov bilan birga (`scripts/test-telefon-kodlari.ts` ikki
// nusxani va manbani solishtiradi). Mobil ilovada AYNAN shu fayl
// turadi (`mobil/src/lib/phone-codes.ts`).
//
// ── NOM CHIZILMAYDI ─────────────────────────────────────────────
//
// Tanlagichda bayroq + kod + ISO: sakkiz tilda bir xil tushuniladi.
// `izlash` — faqat qidiruv uchun (o'zbekcha nom va boshqa tillardagi
// so'zlar), ekranga chiqmaydi.
//
// ── AVTOMATIK TANLOV ────────────────────────────────────────────
//
// Serverda GeoIP bazasi yo'q, Cloudflare ham yo'q — IP dan davlatni
// bilib bo'lmaydi. Brauzer va telefon esa VAQT MINTAQASINI aniq
// biladi (Xitoyda «Asia/Shanghai»): `taxminiyKod()` shundan, bo'lmasa
// til hududidan («zh-CN» → CN), u ham bo'lmasa O'zbekiston.

export type PhoneCode = {
  /** ISO 3166-1 alpha-2 */
  iso: string;
  /** Xalqaro kod, «+» bilan */
  code: string;
  /** Qidiruv so'zlari, kichik harf (ekranga chiqmaydi) */
  izlash: string;
};

/** Tartib: avval O'zbekiston, MDH va Yevropa (mijozlarning asosiy qismi), keyin qo'shnilar, keyin hammasi ISO bo'yicha */
export const PHONE_CODES: PhoneCode[] = [
  { iso: "UZ", code: "+998", izlash: "o'zbekiston uz ozbek uzbek uzbekistan узбекистан" },
  { iso: "RU", code: "+7", izlash: "rossiya rus ru russia россия" },
  { iso: "KZ", code: "+7", izlash: "qozog'iston qozoq kz kazakhstan казахстан" },
  { iso: "KG", code: "+996", izlash: "qirg'iziston qirgiz kg kyrgyzstan киргизия кыргызстан" },
  { iso: "TJ", code: "+992", izlash: "tojikiston tojik tj tajikistan таджикистан" },
  { iso: "TM", code: "+993", izlash: "turkmaniston turkman tm turkmenistan туркменистан" },
  { iso: "AZ", code: "+994", izlash: "ozarbayjon az azerbaijan азербайджан" },
  { iso: "AM", code: "+374", izlash: "armaniston am armenia армения" },
  { iso: "GE", code: "+995", izlash: "gruziya ge georgia грузия" },
  { iso: "BY", code: "+375", izlash: "belarus by беларусь" },
  { iso: "UA", code: "+380", izlash: "ukraina ua ukraine украина" },
  { iso: "MD", code: "+373", izlash: "moldova md молдова" },
  { iso: "TR", code: "+90", izlash: "turkiya turk tr turkey турция" },
  { iso: "PL", code: "+48", izlash: "polsha pl poland польша" },
  { iso: "LT", code: "+370", izlash: "litva lt lithuania литва" },
  { iso: "LV", code: "+371", izlash: "latviya lv latvia латвия" },
  { iso: "EE", code: "+372", izlash: "estoniya ee estonia эстония" },
  { iso: "DE", code: "+49", izlash: "germaniya de germany германия" },
  { iso: "NL", code: "+31", izlash: "niderlandiya" },
  { iso: "BE", code: "+32", izlash: "belgiya" },
  { iso: "FR", code: "+33", izlash: "fransiya" },
  { iso: "IT", code: "+39", izlash: "italiya" },
  { iso: "ES", code: "+34", izlash: "ispaniya" },
  { iso: "PT", code: "+351", izlash: "portugaliya" },
  { iso: "AT", code: "+43", izlash: "avstriya" },
  { iso: "CH", code: "+41", izlash: "shveytsariya" },
  { iso: "CZ", code: "+420", izlash: "chexiya" },
  { iso: "SK", code: "+421", izlash: "slovakiya" },
  { iso: "HU", code: "+36", izlash: "vengriya" },
  { iso: "RO", code: "+40", izlash: "ruminiya" },
  { iso: "BG", code: "+359", izlash: "bolgariya" },
  { iso: "RS", code: "+381", izlash: "serbiya" },
  { iso: "HR", code: "+385", izlash: "xorvatiya" },
  { iso: "SI", code: "+386", izlash: "sloveniya" },
  { iso: "GR", code: "+30", izlash: "gretsiya" },
  { iso: "FI", code: "+358", izlash: "finlandiya" },
  { iso: "SE", code: "+46", izlash: "shvetsiya" },
  { iso: "NO", code: "+47", izlash: "norvegiya" },
  { iso: "DK", code: "+45", izlash: "daniya" },
  { iso: "GB", code: "+44", izlash: "buyuk britaniya" },
  { iso: "CN", code: "+86", izlash: "xitoy cn china kitay китай" },
  { iso: "AF", code: "+93", izlash: "afg'oniston afgon af afghanistan афганистан" },
  { iso: "IR", code: "+98", izlash: "eron ir iran иран" },
  { iso: "PK", code: "+92", izlash: "pokiston pk pakistan пакистан" },
  { iso: "IN", code: "+91", izlash: "hindiston in india индия" },
  { iso: "MN", code: "+976", izlash: "mo'g'uliston mongol mn mongolia монголия" },
  { iso: "AE", code: "+971", izlash: "baa uae dubay dubai оаэ" },
  { iso: "SA", code: "+966", izlash: "saudiya arabistoni" },
  { iso: "AD", code: "+376", izlash: "andorra" },
  { iso: "AG", code: "+1268", izlash: "antigua va barbuda" },
  { iso: "AI", code: "+1264", izlash: "angilya" },
  { iso: "AL", code: "+355", izlash: "albaniya" },
  { iso: "AO", code: "+244", izlash: "angola" },
  { iso: "AR", code: "+54", izlash: "argentina" },
  { iso: "AS", code: "+1684", izlash: "amerika samoasi" },
  { iso: "AU", code: "+61", izlash: "avstraliya" },
  { iso: "AW", code: "+297", izlash: "aruba" },
  { iso: "BA", code: "+387", izlash: "bosniya va gertsegovina" },
  { iso: "BB", code: "+1246", izlash: "barbados" },
  { iso: "BD", code: "+880", izlash: "bangladesh" },
  { iso: "BF", code: "+226", izlash: "burkina-faso" },
  { iso: "BH", code: "+973", izlash: "bahrayn" },
  { iso: "BI", code: "+257", izlash: "burundi" },
  { iso: "BJ", code: "+229", izlash: "benin" },
  { iso: "BM", code: "+1441", izlash: "bermud orollari" },
  { iso: "BN", code: "+673", izlash: "bruney" },
  { iso: "BO", code: "+591", izlash: "boliviya" },
  { iso: "BR", code: "+55", izlash: "braziliya" },
  { iso: "BS", code: "+1242", izlash: "bagama orollari" },
  { iso: "BT", code: "+975", izlash: "butan" },
  { iso: "BW", code: "+267", izlash: "botsvana" },
  { iso: "BZ", code: "+501", izlash: "beliz" },
  { iso: "CD", code: "+243", izlash: "kongo dr" },
  { iso: "CF", code: "+236", izlash: "markaziy afrika respublikasi" },
  { iso: "CG", code: "+242", izlash: "kongo" },
  { iso: "CI", code: "+225", izlash: "kot-d'ivuar" },
  { iso: "CK", code: "+682", izlash: "kuk orollari" },
  { iso: "CL", code: "+56", izlash: "chili" },
  { iso: "CM", code: "+237", izlash: "kamerun" },
  { iso: "CO", code: "+57", izlash: "kolumbiya" },
  { iso: "CR", code: "+506", izlash: "kosta-rika" },
  { iso: "CU", code: "+53", izlash: "kuba" },
  { iso: "CV", code: "+238", izlash: "kabo-verde" },
  { iso: "CW", code: "+599", izlash: "kyurasao" },
  { iso: "CY", code: "+357", izlash: "kipr" },
  { iso: "DJ", code: "+253", izlash: "jibuti" },
  { iso: "DM", code: "+1767", izlash: "dominika" },
  { iso: "DO", code: "+1809", izlash: "dominikan respublikasi" },
  { iso: "DZ", code: "+213", izlash: "jazoir" },
  { iso: "EC", code: "+593", izlash: "ekvador" },
  { iso: "EG", code: "+20", izlash: "misr" },
  { iso: "ER", code: "+291", izlash: "eritreya" },
  { iso: "ET", code: "+251", izlash: "efiopiya" },
  { iso: "FJ", code: "+679", izlash: "fiji" },
  { iso: "FK", code: "+500", izlash: "folklend orollari" },
  { iso: "FM", code: "+691", izlash: "mikroneziya" },
  { iso: "FO", code: "+298", izlash: "farer orollari" },
  { iso: "GA", code: "+241", izlash: "gabon" },
  { iso: "GD", code: "+1473", izlash: "grenada" },
  { iso: "GF", code: "+594", izlash: "fransuz gvianasi" },
  { iso: "GH", code: "+233", izlash: "gana" },
  { iso: "GI", code: "+350", izlash: "gibraltar" },
  { iso: "GL", code: "+299", izlash: "grenlandiya" },
  { iso: "GM", code: "+220", izlash: "gambiya" },
  { iso: "GN", code: "+224", izlash: "gvineya" },
  { iso: "GP", code: "+590", izlash: "gvadelupa" },
  { iso: "GQ", code: "+240", izlash: "ekvatorial gvineya" },
  { iso: "GT", code: "+502", izlash: "gvatemala" },
  { iso: "GU", code: "+1671", izlash: "guam" },
  { iso: "GW", code: "+245", izlash: "gvineya-bisau" },
  { iso: "GY", code: "+592", izlash: "gayana" },
  { iso: "HK", code: "+852", izlash: "gonkong" },
  { iso: "HN", code: "+504", izlash: "gonduras" },
  { iso: "HT", code: "+509", izlash: "gaiti" },
  { iso: "ID", code: "+62", izlash: "indoneziya" },
  { iso: "IE", code: "+353", izlash: "irlandiya" },
  { iso: "IL", code: "+972", izlash: "isroil" },
  { iso: "IQ", code: "+964", izlash: "iroq" },
  { iso: "IS", code: "+354", izlash: "islandiya" },
  { iso: "JM", code: "+1876", izlash: "yamayka" },
  { iso: "JO", code: "+962", izlash: "iordaniya" },
  { iso: "JP", code: "+81", izlash: "yaponiya jp japan япония" },
  { iso: "KE", code: "+254", izlash: "keniya" },
  { iso: "KH", code: "+855", izlash: "kambodja" },
  { iso: "KI", code: "+686", izlash: "kiribati" },
  { iso: "KM", code: "+269", izlash: "komor orollari" },
  { iso: "KN", code: "+1869", izlash: "sent-kits va nevis" },
  { iso: "KP", code: "+850", izlash: "shimoliy koreya" },
  { iso: "KR", code: "+82", izlash: "janubiy koreya koreya kr korea корея" },
  { iso: "KW", code: "+965", izlash: "quvayt" },
  { iso: "KY", code: "+1345", izlash: "kayman orollari" },
  { iso: "LA", code: "+856", izlash: "laos" },
  { iso: "LB", code: "+961", izlash: "livan" },
  { iso: "LC", code: "+1758", izlash: "sent-lyusiya" },
  { iso: "LI", code: "+423", izlash: "lixtenshteyn" },
  { iso: "LK", code: "+94", izlash: "shri-lanka" },
  { iso: "LR", code: "+231", izlash: "liberiya" },
  { iso: "LS", code: "+266", izlash: "lesoto" },
  { iso: "LU", code: "+352", izlash: "lyuksemburg" },
  { iso: "LY", code: "+218", izlash: "liviya" },
  { iso: "MA", code: "+212", izlash: "marokash" },
  { iso: "MC", code: "+377", izlash: "monako" },
  { iso: "ME", code: "+382", izlash: "chernogoriya" },
  { iso: "MG", code: "+261", izlash: "madagaskar" },
  { iso: "MH", code: "+692", izlash: "marshall orollari" },
  { iso: "MK", code: "+389", izlash: "shimoliy makedoniya" },
  { iso: "ML", code: "+223", izlash: "mali" },
  { iso: "MM", code: "+95", izlash: "myanma" },
  { iso: "MO", code: "+853", izlash: "makao" },
  { iso: "MP", code: "+1670", izlash: "shimoliy mariana orollari" },
  { iso: "MQ", code: "+596", izlash: "martinika" },
  { iso: "MR", code: "+222", izlash: "mavritaniya" },
  { iso: "MS", code: "+1664", izlash: "montserrat" },
  { iso: "MT", code: "+356", izlash: "malta" },
  { iso: "MU", code: "+230", izlash: "mavrikiy" },
  { iso: "MV", code: "+960", izlash: "maldiv orollari" },
  { iso: "MW", code: "+265", izlash: "malavi" },
  { iso: "MX", code: "+52", izlash: "meksika" },
  { iso: "MY", code: "+60", izlash: "malayziya" },
  { iso: "MZ", code: "+258", izlash: "mozambik" },
  { iso: "NA", code: "+264", izlash: "namibiya" },
  { iso: "NC", code: "+687", izlash: "yangi kaledoniya" },
  { iso: "NE", code: "+227", izlash: "niger" },
  { iso: "NG", code: "+234", izlash: "nigeriya" },
  { iso: "NI", code: "+505", izlash: "nikaragua" },
  { iso: "NP", code: "+977", izlash: "nepal" },
  { iso: "NR", code: "+674", izlash: "nauru" },
  { iso: "NU", code: "+683", izlash: "niue" },
  { iso: "NZ", code: "+64", izlash: "yangi zelandiya" },
  { iso: "OM", code: "+968", izlash: "ummon" },
  { iso: "PA", code: "+507", izlash: "panama" },
  { iso: "PE", code: "+51", izlash: "peru" },
  { iso: "PF", code: "+689", izlash: "fransuz polineziyasi" },
  { iso: "PG", code: "+675", izlash: "papua-yangi gvineya" },
  { iso: "PH", code: "+63", izlash: "filippin" },
  { iso: "PM", code: "+508", izlash: "sen-pyer va mikelon" },
  { iso: "PR", code: "+1787", izlash: "puerto-riko" },
  { iso: "PS", code: "+970", izlash: "falastin" },
  { iso: "PW", code: "+680", izlash: "palau" },
  { iso: "PY", code: "+595", izlash: "paragvay" },
  { iso: "QA", code: "+974", izlash: "qatar" },
  { iso: "RE", code: "+262", izlash: "reyunyon" },
  { iso: "RW", code: "+250", izlash: "ruanda" },
  { iso: "SB", code: "+677", izlash: "solomon orollari" },
  { iso: "SC", code: "+248", izlash: "seyshel orollari" },
  { iso: "SD", code: "+249", izlash: "sudan" },
  { iso: "SG", code: "+65", izlash: "singapur" },
  { iso: "SH", code: "+290", izlash: "muqaddas yelena oroli" },
  { iso: "SL", code: "+232", izlash: "syerra-leone" },
  { iso: "SM", code: "+378", izlash: "san-marino" },
  { iso: "SN", code: "+221", izlash: "senegal" },
  { iso: "SO", code: "+252", izlash: "somali" },
  { iso: "SR", code: "+597", izlash: "surinam" },
  { iso: "SS", code: "+211", izlash: "janubiy sudan" },
  { iso: "ST", code: "+239", izlash: "san-tome va prinsipi" },
  { iso: "SV", code: "+503", izlash: "salvador" },
  { iso: "SX", code: "+1721", izlash: "sint-marten" },
  { iso: "SY", code: "+963", izlash: "suriya" },
  { iso: "SZ", code: "+268", izlash: "esvatini" },
  { iso: "TC", code: "+1649", izlash: "terks va kaykos" },
  { iso: "TD", code: "+235", izlash: "chad" },
  { iso: "TG", code: "+228", izlash: "togo" },
  { iso: "TH", code: "+66", izlash: "tailand th thailand таиланд" },
  { iso: "TL", code: "+670", izlash: "sharqiy timor" },
  { iso: "TN", code: "+216", izlash: "tunis" },
  { iso: "TO", code: "+676", izlash: "tonga" },
  { iso: "TT", code: "+1868", izlash: "trinidad va tobago" },
  { iso: "TV", code: "+688", izlash: "tuvalu" },
  { iso: "TW", code: "+886", izlash: "tayvan" },
  { iso: "TZ", code: "+255", izlash: "tanzaniya" },
  { iso: "UG", code: "+256", izlash: "uganda" },
  { iso: "US", code: "+1", izlash: "aqsh / kanada usa aqsh amerika kanada сша canada ca" },
  { iso: "UY", code: "+598", izlash: "urugvay" },
  { iso: "VA", code: "+379", izlash: "vatikan" },
  { iso: "VC", code: "+1784", izlash: "sent-vinsent va grenadinlar" },
  { iso: "VE", code: "+58", izlash: "venesuela" },
  { iso: "VG", code: "+1284", izlash: "britaniya virgin orollari" },
  { iso: "VI", code: "+1340", izlash: "aqsh virgin orollari" },
  { iso: "VN", code: "+84", izlash: "vetnam vn vietnam вьетнам" },
  { iso: "VU", code: "+678", izlash: "vanuatu" },
  { iso: "WS", code: "+685", izlash: "samoa" },
  { iso: "XK", code: "+383", izlash: "kosovo" },
  { iso: "YE", code: "+967", izlash: "yaman" },
  { iso: "ZA", code: "+27", izlash: "janubiy afrika" },
  { iso: "ZM", code: "+260", izlash: "zambiya" },
  { iso: "ZW", code: "+263", izlash: "zimbabve" },
];

/** Ro'yxat boshidagi asosiy qism — eski 40 ta (lenta qamrovi sinovi shularga qaraydi) */
export const ASOSIY_KODLAR_SONI = 40;

/** Bayroq ISO koddan — qo'lda yozilsa xato ketardi */
export function isoBayroq(iso: string): string {
  if (!/^[A-Z]{2}$/.test(iso)) return "🌐";
  return String.fromCodePoint(...[...iso].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/**
 * Raqamdan mos kodni topadi — ENG UZUN boshlanish yutadi
 * («+375…» → Belarus, «+3…» emas). +7 da birinchisi (Rossiya)
 * qaytadi: Qozog'iston raqami +77/+76 bo'lsa ham tanlagichda
 * kod baribir bir xil «+7».
 */
export function kodTop(phone: string): PhoneCode | null {
  let eng: PhoneCode | null = null;
  for (const c of PHONE_CODES) {
    if (phone.startsWith(c.code) && (!eng || c.code.length > eng.code.length)) eng = c;
  }
  return eng;
}

/** Qidiruv: ISO, kod raqamlari yoki nom bo'yicha */
export function kodQidir(q: string): PhoneCode[] {
  const t = q.trim().toLowerCase().replace(/['’`ʻ‘]/g, "");
  if (!t) return PHONE_CODES;
  const raqam = t.replace(/[^0-9]/g, "");
  return PHONE_CODES.filter(
    (c) =>
      c.iso.toLowerCase() === t ||
      (raqam !== "" && raqam === t.replace(/^\+/, "") && c.code.slice(1).startsWith(raqam)) ||
      c.izlash.replace(/['’`ʻ‘]/g, "").includes(t),
  );
}

/** Vaqt mintaqasi → davlat (faqat ko'p uchraydiganlari) */
const ZONA: Record<string, string> = {
  "Asia/Tashkent": "UZ", "Asia/Samarkand": "UZ", "Asia/Almaty": "KZ",
  "Asia/Qostanay": "KZ", "Asia/Aqtobe": "KZ", "Asia/Aqtau": "KZ",
  "Asia/Atyrau": "KZ", "Asia/Oral": "KZ", "Asia/Qyzylorda": "KZ",
  "Asia/Bishkek": "KG", "Asia/Dushanbe": "TJ", "Asia/Ashgabat": "TM",
  "Asia/Baku": "AZ", "Asia/Tbilisi": "GE", "Asia/Yerevan": "AM",
  "Europe/Moscow": "RU", "Europe/Samara": "RU", "Europe/Volgograd": "RU",
  "Europe/Saratov": "RU", "Europe/Ulyanovsk": "RU", "Europe/Astrakhan": "RU",
  "Europe/Kirov": "RU", "Europe/Kaliningrad": "RU", "Asia/Yekaterinburg": "RU",
  "Asia/Omsk": "RU", "Asia/Novosibirsk": "RU", "Asia/Barnaul": "RU",
  "Asia/Tomsk": "RU", "Asia/Novokuznetsk": "RU", "Asia/Krasnoyarsk": "RU",
  "Asia/Irkutsk": "RU", "Asia/Chita": "RU", "Asia/Yakutsk": "RU",
  "Asia/Khandyga": "RU", "Asia/Vladivostok": "RU", "Asia/Ust-Nera": "RU",
  "Asia/Magadan": "RU", "Asia/Sakhalin": "RU", "Asia/Srednekolymsk": "RU",
  "Asia/Kamchatka": "RU", "Asia/Anadyr": "RU", "Europe/Minsk": "BY",
  "Europe/Kiev": "UA", "Europe/Kyiv": "UA", "Europe/Chisinau": "MD",
  "Europe/Istanbul": "TR", "Asia/Istanbul": "TR", "Europe/Vilnius": "LT",
  "Europe/Riga": "LV", "Europe/Tallinn": "EE", "Asia/Shanghai": "CN",
  "Asia/Urumqi": "CN", "Asia/Chongqing": "CN", "Asia/Harbin": "CN",
  "Asia/Kashgar": "CN", "PRC": "CN", "Asia/Hong_Kong": "HK",
  "Asia/Macau": "MO", "Asia/Taipei": "TW", "Asia/Kabul": "AF",
  "Asia/Tehran": "IR", "Asia/Karachi": "PK", "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN", "Asia/Ulaanbaatar": "MN", "Asia/Hovd": "MN",
  "Asia/Seoul": "KR", "Asia/Pyongyang": "KP", "Asia/Tokyo": "JP",
  "Asia/Ho_Chi_Minh": "VN", "Asia/Saigon": "VN", "Asia/Bangkok": "TH",
  "Asia/Kuala_Lumpur": "MY", "Asia/Jakarta": "ID", "Asia/Manila": "PH",
  "Asia/Singapore": "SG", "Asia/Dhaka": "BD", "Asia/Colombo": "LK",
  "Asia/Kathmandu": "NP", "Asia/Yangon": "MM", "Asia/Dubai": "AE",
  "Asia/Riyadh": "SA", "Asia/Qatar": "QA", "Asia/Kuwait": "KW",
  "Asia/Bahrain": "BH", "Asia/Muscat": "OM", "Asia/Baghdad": "IQ",
  "Asia/Damascus": "SY", "Asia/Amman": "JO", "Asia/Beirut": "LB",
  "Asia/Jerusalem": "IL", "Asia/Tel_Aviv": "IL", "Asia/Gaza": "PS",
  "Asia/Aden": "YE", "Europe/Warsaw": "PL", "Europe/Berlin": "DE",
  "Europe/Paris": "FR", "Europe/Rome": "IT", "Europe/Madrid": "ES",
  "Europe/London": "GB", "Europe/Amsterdam": "NL", "Europe/Brussels": "BE",
  "Europe/Zurich": "CH", "Europe/Vienna": "AT", "Europe/Prague": "CZ",
  "Europe/Bratislava": "SK", "Europe/Budapest": "HU", "Europe/Bucharest": "RO",
  "Europe/Sofia": "BG", "Europe/Athens": "GR", "Europe/Belgrade": "RS",
  "Europe/Zagreb": "HR", "Europe/Ljubljana": "SI", "Europe/Sarajevo": "BA",
  "Europe/Skopje": "MK", "Europe/Podgorica": "ME", "Europe/Tirane": "AL",
  "Europe/Copenhagen": "DK", "Europe/Stockholm": "SE", "Europe/Oslo": "NO",
  "Europe/Helsinki": "FI", "Atlantic/Reykjavik": "IS", "Europe/Dublin": "IE",
  "Europe/Lisbon": "PT", "Europe/Luxembourg": "LU", "Europe/Malta": "MT",
  "Asia/Nicosia": "CY", "Europe/Nicosia": "CY", "America/New_York": "US",
  "America/Chicago": "US", "America/Denver": "US", "America/Los_Angeles": "US",
  "America/Phoenix": "US", "America/Anchorage": "US", "America/Toronto": "US",
  "America/Vancouver": "US", "America/Mexico_City": "MX", "America/Sao_Paulo": "BR",
  "America/Argentina/Buenos_Aires": "AR", "America/Santiago": "CL", "America/Bogota": "CO",
  "America/Caracas": "VE", "America/Lima": "PE", "America/Havana": "CU",
  "Africa/Cairo": "EG", "Africa/Johannesburg": "ZA", "Africa/Casablanca": "MA",
  "Africa/Algiers": "DZ", "Africa/Tunis": "TN", "Africa/Lagos": "NG",
  "Africa/Nairobi": "KE", "Africa/Addis_Ababa": "ET", "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU", "Australia/Perth": "AU", "Australia/Brisbane": "AU",
  "Pacific/Auckland": "NZ",
};

/**
 * Odam turgan davlatning kodi — vaqt mintaqasidan, bo'lmasa til
 * hududidan («zh-CN»), u ham bo'lmasa O'zbekiston.
 */
export function taxminiyKod(zona?: string | null, til?: string | null): PhoneCode {
  const iso = (zona && ZONA[zona]) || (til && /^[a-z]{2,3}[-_]([A-Z]{2})$/.exec(til)?.[1]) || "UZ";
  return PHONE_CODES.find((c) => c.iso === iso) ?? PHONE_CODES[0];
}
