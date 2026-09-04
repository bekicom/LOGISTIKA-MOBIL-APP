/**
 * Serverdagi himoyalangan rasmlar uchun manba.
 *
 * MUAMMO: `<Image source={{ uri }}>` sarlavha yubormaydi. Bizning
 * rasm yo'llarimiz esa `Authorization: Bearer` talab qiladi, ya'ni
 * oddiy `uri` bilan 401 kelib, ekranda buzilgan rasm turadi.
 *
 * React Native `source` ichida `headers` ni qo'llab-quvvatlaydi —
 * shu yerda qo'shiladi.
 */
import { API_BASE } from "./api";
import { tokenNow } from "./session";

export type ImgSource = { uri: string; headers?: Record<string, string> };

/** Ichki yo'ldan (`/api/...`) rasm manbasi */
export function authImage(path: string): ImgSource {
  const token = tokenNow();
  return {
    uri: `${API_BASE}${path}`,
    headers: token
      ? { Authorization: `Bearer ${token}`, "X-Client": "mobile" }
      : undefined,
  };
}

/**
 * Parkdagi mashinaning surati.
 *
 * Yo'l bazada nisbiy saqlanadi (`uploads` ichida), rasm esa shu
 * marshrut orqali beriladi. Tizimga kirgan har kim ko'ra oladi —
 * mashina surati yuk egasiga ko'rsatish uchun.
 */
export function vehiclePhoto(vehicleId: string, key: string): ImgSource {
  return authImage(`/api/fleet/vehicles/${vehicleId}/photos?p=${encodeURIComponent(key)}`);
}

/**
 * Sotuv e'loni rasmi.
 *
 * Yo'l `furam/src/lib/sale.ts:salePhotoSrc` bilan bir xil bo'lishi
 * SHART: fayllar `public/` dan berilmaydi, faqat shu marshrut
 * orqali. Manzil o'zgarsa ikkala tomonda birga o'zgaradi.
 */
export function salePhoto(saleId: string, key: string): ImgSource {
  return authImage(`/api/market/${saleId}/photos?p=${encodeURIComponent(key)}`);
}

/**
 * Servis buyurtmasi rasmi.
 *
 * Sotuv e'lonidan farqi: bu rasm OCHIQ EMAS. Uni faqat mijoz,
 * tanlangan usta va taklif bergan ustalar ko'radi — marshrutning
 * o'zi shuni tekshiradi.
 */
export function servicePhoto(orderId: string, key: string): ImgSource {
  return authImage(`/api/service/${orderId}/photos?p=${encodeURIComponent(key)}`);
}
