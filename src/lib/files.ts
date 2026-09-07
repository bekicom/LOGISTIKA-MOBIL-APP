/**
 * Himoyalangan faylni yuklab, tizim orqali ochish/ulashish.
 *
 * Chatdagi fayl, hujjat va hisobotlar `Authorization` talab qiladi —
 * oddiy `Linking.openURL` sarlavhasiz boradi va 401 oladi. Shuning
 * uchun fayl avval keshga yuklanadi, keyin tizimning «ulashish /
 * ochish» oynasi chaqiriladi (u yerda PDF ko'rish, saqlash, boshqa
 * ilovaga yuborish bor).
 */
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { API_BASE, FuramError } from "./api";
import { tokenNow } from "./session";
import { t } from "./i18n";

export async function openRemoteFile(path: string, name: string): Promise<void> {
  const token = tokenNow();
  const target = `${FileSystem.cacheDirectory ?? ""}${name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const r = await FileSystem.downloadAsync(`${API_BASE}${path}`, target, {
    headers: token ? { Authorization: `Bearer ${token}`, "X-Client": "mobile" } : {},
  });
  if (r.status !== 200) {
    throw new FuramError({ error: "FILE_MISSING", message: t("mob.err.network"), status: r.status });
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(r.uri);
  }
}

/**
 * KATTA faylni XOM TANA bilan yuborish (video).
 *
 * ── NEGA `apiUpload` YARAMAYDI ──────────────────────────────────
 *
 * Server videoni `multipart` emas, XOM oqim bilan kutadi
 * (`market/[id]/video`): 400 MB li faylni `req.formData()` xotiraga
 * yig'ib olardi. Mos ravishda ilova tomonda ham fayl xotiraga
 * o'qilmasligi kerak.
 *
 * `FileSystem.uploadAsync` + `BINARY_CONTENT` faylni diskdan oqim
 * bilan uzatadi — 400 MB video telefon xotirasini to'ldirmaydi.
 * `XMLHttpRequest` bunga yaramaydi: u `FormData` dan boshqa fayl
 * shaklini bilmaydi.
 */
export async function uploadBinary(
  path: string,
  fileUri: string,
  mime: string,
): Promise<{ status: number; body: string }> {
  const token = tokenNow();
  const r = await FileSystem.uploadAsync(`${API_BASE}${path}`, fileUri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      "Content-Type": mime,
      "X-Client": "mobile",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  return { status: r.status, body: r.body ?? "" };
}
