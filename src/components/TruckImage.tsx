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
import { useState } from "react";
import { Image, View, type ImageStyle, type StyleProp } from "react-native";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { Tap } from "@/components/Tap";
import { color, radius, themed } from "@/lib/theme";

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

/* ─────────────────────────────────────────── transport turi tanlagichi */

const USTUN = 3;
const ORALIQ = 8;

/**
 * Transport turini tanlash — asl rasmlar bilan (2026-09-21).
 *
 * Bekzod: «bu yerdagi rasmlarni ham original rasmlar qilib ber, yuklarda
 * qilding-ku». Ilgari filtrda va «Yuk joylash» da chiziqli ikonka turardi,
 * bazadagi 21 turning 7 tasida esa «?» (ikonkasi chizilmagan edi). Endi
 * ikkala joy ham shu bitta panjarani ishlatadi.
 *
 * UCH USTUN, to'rt emas: rasm nisbati 2:1 dan 4.5:1 gacha, ya'ni uning
 * bo'yini KATAK ENI cheklaydi. To'rt ustunda katak ~84 dp — fura 19 dp
 * bo'yga tushardi. Web ikki ustun qiladi (panel keng), telefonda esa
 * ikki ustun 11 qator bo'lib «Hozir tayyor» kalitini ancha pastga
 * itarardi. Uchtada 21 tur — roppa-rosa 7 qator.
 *
 * Katak eni O'LCHAB hisoblanadi (`onLayout`). Ilgari `flexGrow` edi va
 * oxirgi qatorda yolg'iz qolgan katak («Boshqa») butun enga cho'zilardi.
 *
 * Rasmi yo'q 7 tur (samosval, sisterna, …) «boshqa» rasmini oladi —
 * web ham shunday qiladi (`truck-image.tsx` → `TruckArt` → boshqa).
 */
export function TruckTypeGrid<T extends { id: number; key: string; name: string }>({
  items,
  isOn,
  onPress,
  multi = false,
}: {
  items: readonly T[];
  isOn: (item: T) => boolean;
  onPress: (item: T) => void;
  /** Bir nechtasi tanlanadimi (filtr) yoki bittasi (e'lon berish) */
  multi?: boolean;
}) {
  const [en, setEn] = useState(0);
  const katak = en ? Math.floor((en - ORALIQ * (USTUN - 1)) / USTUN) : null;

  return (
    <View style={s.grid} onLayout={(e) => setEn(e.nativeEvent.layout.width)}>
      {items.map((it) => {
        const on = isOn(it);
        return (
          <Tap
            key={it.id}
            onPress={() => onPress(it)}
            feel="select"
            accessibilityRole={multi ? "button" : "radio"}
            accessibilityLabel={it.name}
            selected={on}
            style={[s.cell, katak ? { width: katak } : s.cellTaxmin, on && s.cellOn]}
          >
            <TruckImage typeKey={it.key} style={s.img} />
            <Text style={[s.name, on && s.nameOn]} numberOfLines={2}>
              {it.name}
            </Text>
            {on ? (
              <View style={s.check}>
                <Icon name="check" size={12} stroke="#ffffff" />
              </View>
            ) : null}
          </Tap>
        );
      })}
    </View>
  );
}

const s = themed(() => ({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: ORALIQ },
  cell: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.control,
    backgroundColor: color.card,
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 6,
  },
  /* O'lchanguncha bir lahza — keyin aniq en qo'yiladi */
  cellTaxmin: { width: "31%" },
  /* Chegara 2 px bo'lganda ichki bo'shliq 1 px kamayadi — katak ichidagi
     rasm va yozuv tanlanganda joyidan «sakramaydi» */
  cellOn: {
    borderWidth: 2,
    borderColor: color.brand,
    backgroundColor: color.brandSoft,
    paddingTop: 9,
    paddingBottom: 7,
    paddingHorizontal: 5,
  },
  img: { width: "100%", height: 40 },
  /* Ikki qatorlik joy doim band: bir qatordagi kataklar bo'yi teng */
  name: {
    fontSize: 11.5,
    lineHeight: 14,
    minHeight: 28,
    fontWeight: "600",
    color: color.mutedForeground,
    textAlign: "center",
  },
  nameOn: { fontWeight: "700", color: color.brandText },
  check: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
  },
}));
