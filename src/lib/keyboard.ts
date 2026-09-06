/**
 * Klaviatura ochiqmi.
 *
 * ── NEGA KERAK ──────────────────────────────────────────────────
 *
 * Yozish qatori pastda `paddingBottom: insets.bottom` bilan turadi —
 * iPhone'ning pastki chizig'i ustiga tushib qolmasin uchun. Lekin
 * klaviatura ochilganda o'sha joyni klaviaturaning o'zi egallaydi va
 * inset ORTIQCHA bo'lib qoladi: qator bilan klaviatura orasida bo'sh
 * oq chiziq paydo bo'ladi (2026-09-06 da Bekzod ko'rsatdi).
 *
 * Shuning uchun inset faqat klaviatura YOPIQ bo'lganda qo'shiladi.
 */
import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    /* iOS'da `Will*` hodisasi animatsiya bilan birga keladi — qator
       klaviatura bilan birga siljiydi. Android'da bunday hodisa yo'q. */
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const a = Keyboard.addListener(showEvt, () => setOpen(true));
    const b = Keyboard.addListener(hideEvt, () => setOpen(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);

  return open;
}

/** Yozish qatori uchun pastki bo'shliq: klaviatura ochiqda inset kerak emas */
export function composerPad(insetBottom: number, keyboardOpen: boolean, base = 8): number {
  return keyboardOpen ? base : insetBottom + base;
}
