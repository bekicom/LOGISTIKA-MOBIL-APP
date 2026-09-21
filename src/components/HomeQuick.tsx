/**
 * Bosh sahifa tugmalari (TZ-05, 2026-09-19) — web bosh sahifasining
 * telefon ko'rinishi bilan bir xil (`furam/src/app/page.tsx`).
 *
 *   ┌──────┬──────┬──────┬──────┬──────┐
 *   │ 🚚+  │ 📦+  │  📦  │  ↝   │  🚚  │   besh ASOSIY — hamma rolda
 *   └──────┴──────┴──────┴──────┴──────┘
 *   [Yuk qidirish] [Navbat olish] [Ish qidirish] [Reyslar]  Yana (2) ›
 *                                                  rolga xos, 4 + «Yana»
 *
 * Ilgari ilovada ikkalasi ham yo'q edi: bosh sahifada haydovchiga to'rtta
 * qattiq yozilgan tugma turardi (biri — SOS — bosilmasdi ham), boshqa
 * rollarga esa hech narsa. Mijoz aytgan muammo aynan shu: 114 dispetcherdan
 * 104 tasi hech narsa qo'ymagan — ularda «Yuk qo'shish» ham ko'rinmasdi.
 *
 * Ilova ekranida yo'q manzil (masalan yo'lovchi tashish) chizilmaydi:
 * bosilganda hech qayerga olib bormaydigan tugma — Apple 2.1 rad sababi.
 */
import { useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { ASOSIY, ASOSIY_USTUN, QUICK_TELEFON, ikonkasi, yorliqKaliti, type TezkorTugma } from "@/lib/bosh-tugmalar";
import { webToApp } from "@/lib/routes";
import { color, radius, shadow, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

/**
 * Katak yozuvi — TOR EKRANDA kichrayadi (2026-09-21, do'kon
 * skrinshotida topildi).
 *
 * «Transportlarim» 10.5 px da 75.5 px — 360 px li telefonda (eng
 * keng tarqalgan Android kengligi) katakda esa 73.5 px joy bor edi va
 * so'z O'RTASIDAN bo'linardi: «Transportlari / m». `adjustsFontSizeToFit`
 * bu yerda yordam bermaydi — bitta uzun so'z harfma-harf bo'linganda
 * matn ikki qatorga «sig'di» hisoblanadi va kichraymaydi.
 *
 * Shuning uchun dizayn 375 px da tekshirildi (u yerda hamma 8 tilning
 * eng uzun so'zi sig'adi, eng kami 5 px zaxira bilan) va undan tor
 * ekranda yozuv katak kengligiga PROPORSIONAL kichrayadi — zaxira
 * nisbati o'zgarmaydi. 50 = sahifa chekkalari (2 × 16) + 3 oraliq (3 × 6).
 */
const ASOS = 375;
function yozuvOlchami(kenglik: number) {
  if (kenglik >= ASOS) return null;
  const k = (kenglik - 50) / (ASOS - 50);
  return { fontSize: 10.5 * k, lineHeight: 13 * k };
}

export function AsosiyTugmalar() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const kichik = yozuvOlchami(width);
  /* To'r: 4 ustun (webdagi telefon to'ri — 4 + 3). Qatorlar alohida,
     oxirgisi bo'sh kataklar bilan to'ldiriladi — kenglik foizda emas,
     aniq teng bo'lib chiqadi */
  const bor = ASOSIY.flatMap((a) => {
    const to = webToApp(a.web);
    return to ? [{ ...a, to }] : [];
  });
  const qatorlar = Array.from({ length: Math.ceil(bor.length / ASOSIY_USTUN) }, (_, i) =>
    bor.slice(i * ASOSIY_USTUN, (i + 1) * ASOSIY_USTUN),
  );
  return (
    <View style={s.asosiy}>
      {qatorlar.map((qator, i) => (
        <View key={i} style={s.asosiyQator}>
          {qator.map((a) => {
            const nomi = t(`${a.ns}.${a.key}`);
            return (
              <Pressable
                key={a.key}
                onPress={() => router.push(a.to as never)}
                accessibilityRole="button"
                accessibilityLabel={nomi}
                style={({ pressed }) => [s.tile, pressed && { opacity: 0.7 }]}
              >
                <View style={s.tileIcon}>
                  <Icon name={a.ikonka} size={20} stroke={color.brand} />
                  {a.qoshish ? (
                    <View style={s.plus}>
                      <Icon name="plus" size={10} stroke="#ffffff" />
                    </View>
                  ) : null}
                </View>
                <Text style={[s.tileText, kichik]} numberOfLines={2}>
                  {nomi}
                </Text>
              </Pressable>
            );
          })}
          {Array.from({ length: ASOSIY_USTUN - qator.length }, (_, j) => (
            <View key={`bosh-${j}`} style={s.tileBosh} />
          ))}
        </View>
      ))}
    </View>
  );
}

export function RolTugmalari({ quick }: { quick: readonly TezkorTugma[] }) {
  const router = useRouter();
  const [yana, setYana] = useState(false);

  /* Faqat ilovada ochiladigan va lug'atda yorlig'i bor tugmalar */
  const tugmalar = quick.flatMap((q) => {
    const to = webToApp(q.href);
    const kalit = yorliqKaliti(q);
    return to && kalit ? [{ ...q, to, kalit }] : [];
  });
  if (!tugmalar.length) return null;

  const korinadi = yana ? tugmalar : tugmalar.slice(0, QUICK_TELEFON);
  const qolgan = tugmalar.length - QUICK_TELEFON;

  return (
    <View style={s.quick}>
      {korinadi.map((q) => (
        <Pressable
          key={q.href}
          onPress={() => router.push(q.to as never)}
          accessibilityRole="button"
          style={({ pressed }) => [s.pill, pressed && { opacity: 0.85 }]}
        >
          <Icon name={ikonkasi(q.icon)} size={16} stroke="#ffffff" />
          <Text style={s.pillText} numberOfLines={1}>
            {t(q.kalit)}
          </Text>
        </Pressable>
      ))}
      {qolgan > 0 && !yana ? (
        <Pressable onPress={() => setYana(true)} hitSlop={8} accessibilityRole="button" style={s.more}>
          <Text style={s.moreText}>
            {t("pgHome.quickMore")} ({qolgan})
          </Text>
          <Icon name="chevron" size={14} stroke={color.brand} />
        </Pressable>
      ) : null}
    </View>
  );
}

const s = themed(() => ({
  asosiy: { gap: 6 },
  asosiyQator: { flexDirection: "row", gap: 6 },
  tileBosh: { flex: 1 },
  tile: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: 6,
    paddingTop: 10,
    paddingBottom: 9,
    /* 0 — yozuv katakning butun kengligini oladi (375 px da 81 px) */
    paddingHorizontal: 0,
    borderRadius: radius.card,
    backgroundColor: color.card,
    ...shadow.card,
  },
  tileIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.brandSoft,
  },
  plus: {
    position: "absolute",
    right: -3,
    top: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.brand,
    borderWidth: 1.5,
    borderColor: color.card,
  },
  tileText: { fontSize: 10.5, lineHeight: 13, fontWeight: "700", color: color.foreground, textAlign: "center" },

  quick: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    height: 38,
    paddingHorizontal: 13,
    borderRadius: 12,
    backgroundColor: color.brand,
    maxWidth: "100%",
  },
  pillText: { flexShrink: 1, fontSize: 13, fontWeight: "700", color: "#ffffff" },
  more: { flexDirection: "row", alignItems: "center", gap: 3, height: 38, paddingHorizontal: 4 },
  moreText: { fontSize: 13, fontWeight: "700", color: color.brandText },
}));
