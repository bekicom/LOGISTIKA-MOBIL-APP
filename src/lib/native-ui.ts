/**
 * Tizim oynasini VARAQ YOPILGANDAN KEYIN ochish.
 *
 * ── MUAMMO (2026-09-06) ─────────────────────────────────────────
 *
 * Kamera, galereya, hujjat tanlash va joylashuv ruxsati — hammasi
 * tizimning o'z oynasini ochadi. iOS ularni ildiz oynasidan
 * ko'rsatadi; ekranda `Modal` (bizning `Sheet`) turgan bo'lsa yoki
 * u hali yopilib ulgurmagan bo'lsa, oyna UMUMAN chiqmaydi va
 * chaqiruv «bekor qilindi» bo'lib qaytadi. Tashqaridan bu «tugma
 * ishlamayapti» bo'lib ko'rinadi — xato ham chiqmaydi.
 *
 * Shuning uchun varaq yopiladi, animatsiya tugashi kutiladi
 * (`Sheet` 200 ms), keyin tizim oynasi ochiladi.
 */
import { InteractionManager } from "react-native";

/** `Sheet` yopilish animatsiyasi + kichik zaxira */
const SHEET_MS = 260;

export function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Varaqni yopib, tizim oynasini ochadi.
 *
 * @param close varaqni yopadigan funksiya (`() => setOpen(false)`)
 * @param run   tizim oynasini ochadigan chaqiruv
 */
export async function afterSheet<T>(close: () => void, run: () => Promise<T>): Promise<T> {
  close();
  await wait(SHEET_MS);
  /* Animatsiya tugagach ham bitta kadr kutamiz: `Modal` ildizdan
     shu paytda uziladi. */
  await new Promise<void>((r) => InteractionManager.runAfterInteractions(() => r()));
  return run();
}
