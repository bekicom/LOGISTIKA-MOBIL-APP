/**
 * `Text` — ilovaning yagona shrifti (Manrope) bilan.
 *
 * ── NEGA O'RAMA ─────────────────────────────────────────────────
 *
 * React Native'da «butun ilova uchun shrift» degan sozlama yo'q:
 * har `Text` tizim shriftida chiqadi. Ikki yo'l bor edi — RN ning
 * `Text.render` ini yashirincha almashtirish (hack, versiya
 * o'zgarsa sinadi) yoki hamma ekranda shu o'ramani ishlatish.
 * Ikkinchisi tanlandi: 90+ faylda `import { Text } from
 * "react-native"` → `import { Text } from "@/components/Text"`.
 *
 * ── OG'IRLIK → FAYL ─────────────────────────────────────────────
 *
 * Manrope'ning har og'irligi alohida fayl. `fontWeight: "700"`
 * yozilsa RN o'zi to'g'ri faylni tanlamaydi (Android'da ustiga
 * sun'iy qalinlik ham qo'shadi). Shuning uchun og'irlik shu yerda
 * fayl nomiga aylanadi va `fontWeight` olib tashlanadi.
 *
 * Xitoy tili: Manrope'da ieroglif yo'q — tizim shrifti o'zi
 * to'ldiradi, hech narsa qilish shart emas.
 */
import { forwardRef } from "react";
import { Text as RNText, StyleSheet, type TextProps, type TextStyle } from "react-native";

const FAMILY: Record<string, string> = {
  "400": "Manrope_400Regular",
  "500": "Manrope_500Medium",
  "600": "Manrope_600SemiBold",
  "700": "Manrope_700Bold",
  "800": "Manrope_800ExtraBold",
};

/** `fontWeight` qiymatini yuklangan beshta og'irlikdan biriga yaqinlashtiradi */
export function familyOf(weight: TextStyle["fontWeight"]): string {
  const raw = weight === undefined ? 400 : weight === "bold" ? 700 : weight === "normal" ? 400 : Number(weight);
  const w = Number.isFinite(raw) ? raw : 400;
  const key = w <= 400 ? "400" : w <= 500 ? "500" : w <= 600 ? "600" : w <= 700 ? "700" : "800";
  return FAMILY[key];
}

export const Text = forwardRef<RNText, TextProps>(function Text({ style, ...rest }, ref) {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  /* `monospace` kabi aniq shrift so'ralgan bo'lsa — tegmaymiz */
  const family = flat.fontFamily ?? familyOf(flat.fontWeight);
  return <RNText ref={ref} {...rest} style={[style, { fontFamily: family, fontWeight: undefined }]} />;
});
