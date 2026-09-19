/**
 * Saqlangan qidiruv — ilova tomoni mantig'i (TZ-03 mobil qismi, 2026-09-19).
 *
 * Mijoz: «katak ichidagi hududlarni o'chirib tashlab, faqat mijoz o'zi
 * saqlagan filtrlar tursin — doim filtrga kirmaydi, o'sha hudud ustiga
 * bossa yuklar chiqaveradi».
 *
 * Yorliq bosilganda qidiruv ilova FILTRIGA aylanadi (qidiruv kartasida
 * joy nomi, pastda transport turi — odam o'zgartira oladi). Bir nechta
 * «qayerdan» ham sig'adi (2026-09-19 dan filtr ro'yxat oladi). Webda
 * saqlangan qidiruvda og'irlik chegarasi bo'lishi mumkin — ilova filtri
 * uni ko'tarmaydi; bunday qidiruv lentaga XOM so'rov bo'lib ketadi, hech
 * narsa jimgina tashlanmaydi.
 */
/* ⚠️ IMPORT YO'Q — ataylab (`rollar.ts` dagi sabab): furam'dagi sinov bu
   faylni to'g'ridan-to'g'ri import qiladi. */

/** `furam/src/lib/saved-search.ts:SearchParams` */
export type QidiruvParams = {
  fromId?: number[];
  toId?: number[];
  vehicleTypeId?: number[];
  weightMin?: number;
  weightMax?: number;
};

/** `GET /api/saved-search` qatori (`saved-search-server.ts:IlovaQidiruv`) */
export type SaqlanganQidiruv = {
  id: string;
  kind: "load" | "truck";
  /** Odam qo'ygan nom yoki joy nomlaridan yasalgan (o'quvchi tilida); bo'sh bo'lishi mumkin */
  nomi: string;
  name: string | null;
  soni: number;
  notify: boolean;
  params: QidiruvParams;
  /** `params` dagi ID lar tartibida */
  nomlar: { from: string[]; to: string[]; tur: string[] };
};

/** Filtrdagi joy (`FiltrSheet.Joy` bilan mos; bayroq kodi bu yerda kerak emas) */
export type JoyQismi = { id: number; name: string };

/** Ilova filtrining shu yerga kerakli qismi (`FiltrSheet.Filtr` bilan mos) */
export type FiltrQismi = {
  from: JoyQismi[];
  to: JoyQismi[];
  vehicleTypeIds: number[];
  vehicleNames: string[];
};

/**
 * Ilova filtriga sig'adimi — og'irlik chegarasisiz bo'lsa ha (joylar
 * nechta bo'lsa ham). Sig'sa — filtr qismi, sig'masa `null` (unda
 * `qidiruvSorovi`). Nom topilmagan joy (o'chirilgan) «—» bo'lib turadi.
 */
export function filtrga(r: Pick<SaqlanganQidiruv, "params" | "nomlar">): FiltrQismi | null {
  const p = r.params;
  if (p.weightMin != null || p.weightMax != null) return null;
  const joylar = (ids: number[] | undefined, nomlar: string[]) =>
    (ids ?? []).map((id, i) => ({ id, name: nomlar[i] || "—" }));
  const turlar = p.vehicleTypeId ?? [];
  return {
    from: joylar(p.fromId, r.nomlar.from),
    to: joylar(p.toId, r.nomlar.to),
    vehicleTypeIds: [...turlar],
    vehicleNames: turlar.map((_, i) => r.nomlar.tur[i] ?? ""),
  };
}

/**
 * Lenta so'rovi (`/api/loads/list?…`, `/api/trucks/list?…`) — webdagi
 * `qidiruvHref` bilan bir xil kalitlar (server `parseFilters` o'qiydi).
 */
export function qidiruvSorovi(p: QidiruvParams): string {
  const q = new URLSearchParams();
  if (p.fromId?.length) q.set("fromId", p.fromId.join(","));
  if (p.toId?.length) q.set("toId", p.toId.join(","));
  if (p.vehicleTypeId?.length) q.set("vehicleTypeId", p.vehicleTypeId.join(","));
  if (p.weightMin != null) q.set("weightMin", String(p.weightMin));
  if (p.weightMax != null) q.set("weightMax", String(p.weightMax));
  return q.toString();
}

/**
 * Qidiruv kaliti — server `paramsKaliti` bilan BIR XIL (takror to'sig'i).
 * Ilovada: hozirgi filtr qaysi yorliqqa teng — o'sha yorliq ajratiladi.
 */
export function paramsKaliti(p: QidiruvParams): string {
  const s = (a?: number[]) => (a?.length ? [...a].sort((x, y) => x - y).join(",") : "");
  return [s(p.fromId), s(p.toId), s(p.vehicleTypeId), p.weightMin ?? "", p.weightMax ?? ""].join("|");
}

/** Ilova filtri → saqlanadigan shart (server `paramsSchema` kutgan ko'rinish) */
export function filtrdanParams(f: Pick<FiltrQismi, "from" | "to" | "vehicleTypeIds">): QidiruvParams {
  const p: QidiruvParams = {};
  if (f.from.length) p.fromId = f.from.map((j) => j.id);
  if (f.to.length) p.toId = f.to.map((j) => j.id);
  if (f.vehicleTypeIds.length) p.vehicleTypeId = [...f.vehicleTypeIds];
  return p;
}
