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
import { Pressable, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { ASOSIY, ikonkasi, yorliqKaliti, type TezkorTugma } from "@/lib/bosh-tugmalar";
import { webToApp } from "@/lib/routes";
import { useAuth } from "@/lib/auth-context";
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

export function AsosiyTugmalar({ onIshim }: { onIshim?: () => void }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const kichik = yozuvOlchami(width);
  const { yashirin } = useAuth();
  /* 4 katta tugma bitta qatorda (TZ v3 §4). «Mening ishim» — shu ekran,
     bosilganda ish stoliga suriladi; qolganlari o'z ekraniga */
  const bor = ASOSIY.flatMap((a) => {
    if (a.web === "/") return [{ ...a, to: null as string | null }];
    const to = webToApp(a.web);
    /* Admin o'chirgan modul tugmasi chizilmaydi (TZ v2 §8.1) */
    return to && !yashirin(a.web) ? [{ ...a, to }] : [];
  });
  return (
    <View style={s.asosiyQator}>
      {bor.map((a) => {
        const nomi = t(`${a.ns}.${a.key}`);
        const ishim = a.to === null;
        return (
          <Pressable
            key={a.key}
            onPress={() => (ishim ? onIshim?.() : router.push(a.to as never))}
            accessibilityRole="button"
            accessibilityLabel={nomi}
            style={({ pressed }) => [s.tile, ishim && s.tileIshim, pressed && { opacity: 0.7 }]}
          >
            <View style={[s.tileIcon, ishim && s.tileIconIshim]}>
              <Icon name={a.ikonka} size={20} stroke={ishim ? "#ffffff" : color.brand} />
            </View>
            <Text style={[s.tileText, ishim && { color: "#ffffff" }, kichik]} numberOfLines={2}>
              {nomi}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Rolning ish stoli tugmalari (TZ v3 §6) — serverdan, web bilan bitta
 * jadval (`home.ts:QUICK`). 4–7 ta, hammasi ochiq: «Yana» yo'q — TZ
 * «tepada 4–6 ta asosiy tugma» deydi, ular yashirilmaydi.
 */
export function RolTugmalari({ quick }: { quick: readonly TezkorTugma[] }) {
  const router = useRouter();

  /* Faqat ilovada ochiladigan va lug'atda yorlig'i bor tugmalar */
  const tugmalar = quick.flatMap((q) => {
    const to = webToApp(q.href);
    const kalit = yorliqKaliti(q);
    return to && kalit ? [{ ...q, to, kalit }] : [];
  });
  if (!tugmalar.length) return null;

  return (
    <View style={s.quick}>
      {tugmalar.map((q) => (
        <Pressable
          key={q.href}
          onPress={() => router.push(q.to as never)}
          accessibilityRole="button"
          style={({ pressed }) => [s.stol, pressed && { opacity: 0.85 }]}
        >
          <View style={s.stolIcon}>
            <Icon name={ikonkasi(q.icon)} size={17} stroke="#ffffff" />
          </View>
          <Text style={s.stolText} numberOfLines={2}>
            {t(q.kalit)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = themed(() => ({
  asosiyQator: { flexDirection: "row", gap: 6 },
  tileIshim: { backgroundColor: color.brand },
  tileIconIshim: { backgroundColor: "#ffffff33" },
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

  quick: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  /* Ikki ustun: (100% − 8) / 2 */
  stol: {
    flexBasis: "48%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    minHeight: 56,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: color.brandSoft,
    borderWidth: 1,
    borderColor: color.brand + "33",
  },
  stolIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: color.brand },
  stolText: { flex: 1, fontSize: 13.5, fontWeight: "700", color: color.foreground },
}));
