/**
 * Transport turi rasmi — FURAM brendli yuk mashinasi (2026-09-21).
 *
 * Web'dagi bilan BIR XIL rasmlar (`furam/public/trucks/*.webp`),
 * Bekzod: «webda mashinalar rasmi bilan ko'rinadi, juda zo'r — bu
 * yerda ham shunday bo'lsin, kattaroq qilib». Ilgari ilovada o'rnida
 * bo'sh kulrang quti va chiziqli ikonka turardi.
 *
 * ── ILOVA ICHIDA, SERVERDAN EMAS ────────────────────────────────
 *
 * Lentada har kartada chiziladi — tarmoqdan olinsa sekin internetda
 * kartalar rasmsiz «sakrab» ochilardi. 800 px asl rasm 360 px ga
 * kichraytirilgan (telefonda karta rasmi ~120 dp × 3 zichlik), 14 tasi
 * jami 177 KB.
 *
 * Bazada rasmi yo'q turlar ham bor (samosval, avtotsisterna, …) —
 * ular uchun «boshqa» rasmi. Web shu holatda SVG chizadi; ilovada
 * bitta umumiy mashina ko'rinishi yetarli.
 *
 * Rasm nisbati turga qarab 2:1 dan 4.5:1 gacha (fura juda uzun) —
 * shuning uchun doim `contain`: quti o'lchamini chaqiruvchi beradi,
 * mashina unga sig'dirib chiziladi, qirqilmaydi.
 */
import { Image, type ImageStyle, type StyleProp } from "react-native";

const RASM = {
  avtovoz: require("../../assets/trucks/avtovoz.webp"),
  bongo: require("../../assets/trucks/bongo.webp"),
  boshqa: require("../../assets/trucks/boshqa.webp"),
  fura: require("../../assets/trucks/fura.webp"),
  furgon: require("../../assets/trucks/furgon.webp"),
  isuzu: require("../../assets/trucks/isuzu.webp"),
  isuzu10: require("../../assets/trucks/isuzu10.webp"),
  izoterm: require("../../assets/trucks/izoterm.webp"),
  konteyner: require("../../assets/trucks/konteyner.webp"),
  labo: require("../../assets/trucks/labo.webp"),
  platforma: require("../../assets/trucks/platforma.webp"),
  ref: require("../../assets/trucks/ref.webp"),
  tent: require("../../assets/trucks/tent.webp"),
  tral: require("../../assets/trucks/tral.webp"),
} as const;

export function truckImageFor(key: string | null | undefined) {
  return (key && RASM[key as keyof typeof RASM]) || RASM.boshqa;
}

export function TruckImage({ typeKey, style }: { typeKey?: string | null; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={truckImageFor(typeKey)}
      style={style}
      resizeMode="contain"
      /* Bezak — tur nomi yonida yozilgan, ekran o'quvchi takrorlamasin */
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
