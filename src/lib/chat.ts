/**
 * Suhbat — umumiy turlar va yordamchilar (A-qadam, 2026-09-06).
 *
 * Ilova endi web bilan BIR XIL marshrutni ishlatadi:
 * `/api/chat/[id]/messages` — tarjima, javob, pin, tasdiq, ovoz,
 * joylashuv, kontakt, ulashilgan e'lon. Eski `/api/chats/[id]`
 * faqat matn va fayl bilardi.
 */
import { authImage, type ImgSource } from "./img";
import { t } from "./i18n";

/** `lib/message.ts:MessageView` bilan bir xil + ilova holati */
export type ChatMsg = {
  id: string;
  type: string;
  kind: string | null;
  refId: string | null;
  refKind?: string | null;
  refCard?: { title: string; subtitle: string | null; meta: string | null; href: string } | null;
  text: string | null;
  /** Tarjima qilingan bo'lsa — ko'rsatiladigan matn */
  shown: string | null;
  translated: boolean;
  lang: string | null;
  hasAttachment: boolean;
  mimeType: string | null;
  durationSec: number | null;
  lat: number | null;
  lng: number | null;
  placeName: string | null;
  contact: { id: string; name: string; phone: string; furamId: number } | null;
  replyTo: { id: string; name: string; text: string } | null;
  pinned: boolean;
  senderId: string | null;
  senderName: string;
  createdAt: string;
  confirms: { userId: string; name: string }[];
  seenBy: number;
  seenTotal: number;
  /** Faqat ilovada — hali yuborilmagan */
  pending?: boolean;
};

/** Xabardagi fayl — himoyalangan marshrut, sarlavha bilan */
export function messageFile(chatId: string, messageId: string): ImgSource {
  return authImage(`/api/chat/${chatId}/messages/${messageId}/file`);
}

export function messageFilePath(chatId: string, messageId: string): string {
  return `/api/chat/${chatId}/messages/${messageId}/file`;
}

/** Fayl kengaytmasi — yuklab ochish uchun nom yasashda */
export function extOf(mime: string | null): string {
  const m: Record<string, string> = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
    "application/pdf": "pdf", "video/mp4": "mp4", "video/quicktime": "mov",
    "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/webm": "webm", "audio/ogg": "ogg",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  };
  return (mime && m[mime]) || "bin";
}

/* ── Yo'nalish guruhlari ──────────────────────────────────────────
   Nom serverdan o'zbekcha keladi; ilova uni KALITDAN o'z tilida
   yasaydi: «cn-ru» → 🇨🇳 Xitoy → 🇷🇺 Rossiya. Davlat nomlari
   `jobCatalog.countries.*` lug'atida sakkiz tilda bor. */
const FLAG: Record<string, string> = { cn: "🇨🇳", ru: "🇷🇺", uz: "🇺🇿", kz: "🇰🇿", tr: "🇹🇷", eu: "🇪🇺" };

export function groupTitle(key: string): string {
  if (key === "help") return `🛠 ${t("mob.routeGroup.help")}`;
  const [a, b] = key.split("-");
  if (!a || !b) return key;
  const name = (c: string) => t(`jobCatalog.countries.${c.toUpperCase()}`);
  return `${FLAG[a] ?? ""} ${name(a)} → ${FLAG[b] ?? ""} ${name(b)}`.trim();
}

export function groupAbout(key: string): string {
  return t(`mob.routeGroup.about.${key}`);
}

export const LISTING_KINDS = ["load", "truck", "ride", "sale", "part", "master", "job", "contract"] as const;
