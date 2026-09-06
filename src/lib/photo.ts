/**
 * Surat olish — kamera yoki galereya.
 *
 * Hujjat skanerlash uchun tizim kamerasi ishlatiladi. Dizaynda chekkani
 * avtomatik aniqlaydigan skaner chizilgan; uni Expo Go ichida qurib
 * bo'lmaydi (native modul kerak). Tizim kamerasi ham toza natija beradi
 * va hoziroq ishlaydi — chekka aniqlash keyingi bosqichda, development
 * build bilan qo'shiladi.
 */
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import type { Upload } from "./api";

export type Photo = { uri: string; name: string; type: string };

/** Fayl nomini URI dan chiqaramiz — server nomni saqlaydi */
function nameOf(uri: string, fallback: string): string {
  const last = uri.split("/").pop() ?? "";
  return last.includes(".") ? last : fallback;
}

function mimeOf(uri: string): string {
  const ext = uri.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "heic") return "image/heic";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

async function shape(r: ImagePicker.ImagePickerResult): Promise<Photo[]> {
  if (r.canceled) return [];
  return r.assets.map((a, i) => ({
    uri: a.uri,
    name: a.fileName ?? nameOf(a.uri, `surat-${Date.now()}-${i}.jpg`),
    type: a.mimeType ?? mimeOf(a.uri),
  }));
}

/** Kamerada olish. Ruxsat berilmasa bo'sh ro'yxat qaytadi. */
export async function takePhoto(): Promise<Photo[]> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return [];
  return shape(
    await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      // Sifat 0.7 — hujjat o'qiladi, lekin fayl 3-4 barobar yengil.
      // Haydovchi mobil internetda yuboradi, har megabayt sezilarli.
      quality: 0.7,
    }),
  );
}

/** Galereyadan tanlash — bir nechta bo'lishi mumkin */
export async function pickPhotos(limit = 5): Promise<Photo[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return [];
  return shape(
    await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: limit > 1,
      selectionLimit: limit,
      quality: 0.7,
    }),
  );
}

/** `apiUpload` kutgan ko'rinishga o'giradi */
export function toUpload(p: Photo, field: string): Upload {
  return { field, uri: p.uri, name: p.name, type: p.type };
}

/**
 * Hujjat tanlash — PDF, Word, Excel, rasm yoki video (chat va
 * suhbat hujjatlari uchun). Bekor qilinsa `null`.
 */
export async function pickDocument(): Promise<Photo | null> {
  const r = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: [
      "application/pdf",
      "image/*",
      "video/*",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
  });
  if (r.canceled || !r.assets[0]) return null;
  const a = r.assets[0];
  return { uri: a.uri, name: a.name, type: a.mimeType ?? "application/octet-stream" };
}
