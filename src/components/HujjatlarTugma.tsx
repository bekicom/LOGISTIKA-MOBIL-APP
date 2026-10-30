/**
 * Hujjatlar tugmalari (TZ 29-okt §5.1).
 *
 * `HujjatlarTugma` — har rolning «Mening ishim» ekranida tepada katta
 * tugma: chap qismi «Hujjatlarim», o'ng qismi darhol skaner.
 * `SkanerKattaTugma` — Hujjatlar bo'limining eng tepasida
 * «📷 Skanerlash — PDF qilish» va «PDF hujjatlarim».
 */
import { Pressable, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Text } from "@/components/Text";
import { t } from "@/lib/i18n";
import { color, font, radius, space, themed } from "@/lib/theme";

export function HujjatlarTugma() {
  const router = useRouter();
  return (
    <View style={s.quti}>
      <Pressable style={s.chap} onPress={() => router.push("/hujjatlarim")} accessibilityRole="button">
        <View style={s.belgi}>
          <Text style={{ fontSize: 22 }}>📄</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.sarlavha}>{t("skaner.homeBtn")}</Text>
          <Text style={s.izoh} numberOfLines={1}>
            {t("skaner.homeBtnHint")}
          </Text>
        </View>
      </Pressable>
      <Pressable style={s.skaner} onPress={() => router.push("/hujjatlarim/skaner")} accessibilityRole="button">
        <Text style={s.skanerMatn}>📷 {t("skaner.pdfQilish")}</Text>
      </Pressable>
    </View>
  );
}

export function SkanerKattaTugma() {
  const router = useRouter();
  return (
    <View style={{ gap: space.sm }}>
      <Pressable style={s.katta} onPress={() => router.push("/hujjatlarim/skaner")} accessibilityRole="button">
        <Text style={{ fontSize: 30 }}>📷</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.kattaSarlavha}>{t("skaner.bigBtn").replace(/^📷\s*/u, "")}</Text>
          <Text style={s.kattaIzoh}>{t("skaner.bigBtnHint")}</Text>
        </View>
      </Pressable>
      <Pressable style={s.royxat} onPress={() => router.push("/hujjatlarim/pdflar")} accessibilityRole="button">
        <Text style={s.royxatMatn}>🗂 {t("skaner.list")} →</Text>
      </Pressable>
    </View>
  );
}

const s = themed(() => ({
  quti: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: color.brand + "4D",
    backgroundColor: color.card,
  },
  chap: { flex: 1, flexDirection: "row" as const, alignItems: "center" as const, gap: space.md, paddingHorizontal: space.xs },
  belgi: {
    width: 44,
    height: 44,
    borderRadius: radius.control,
    backgroundColor: color.brandSoft,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  sarlavha: { fontSize: font.bodyLg, fontWeight: "800" as const, color: color.foreground },
  izoh: { fontSize: font.micro, color: color.mutedForeground },
  skaner: { paddingHorizontal: space.md, paddingVertical: space.md, borderRadius: radius.control, backgroundColor: color.brand },
  skanerMatn: { fontSize: font.caption, fontWeight: "800" as const, color: color.brandForeground },
  katta: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.card,
    backgroundColor: color.brand,
  },
  kattaSarlavha: { fontSize: font.title, fontWeight: "800" as const, color: color.brandForeground },
  kattaIzoh: { fontSize: font.caption, color: color.brandForeground, opacity: 0.9, marginTop: 2 },
  royxat: {
    padding: space.md,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
  },
  royxatMatn: { fontSize: font.body, fontWeight: "700" as const, color: color.brand },
}));

/**
 * «PDF qilish» (TZ 29-okt §5.5) — rasm yoki hujjat yuborish tugmasi bor
 * har joyda uning yonida. Skanerga qaysi joydan kelinganini olib boradi:
 * tayyor PDF o'sha reys, mashina yoki chatga tushadi.
 */
export function PdfQilishTugma({ trip, vehicle, chat }: { trip?: string; vehicle?: string; chat?: string }) {
  const router = useRouter();
  return (
    <Pressable
      style={p.tugma}
      accessibilityRole="button"
      hitSlop={6}
      onPress={() => {
        const q = new URLSearchParams();
        if (trip) q.set("trip", trip);
        if (vehicle) q.set("vehicle", vehicle);
        if (chat) q.set("chat", chat);
        const qs = q.toString();
        router.push(`/hujjatlarim/skaner${qs ? `?${qs}` : ""}` as Href);
      }}
    >
      <Text style={p.matn}>📷 {t("skaner.pdfQilish")}</Text>
    </Pressable>
  );
}

const p = themed(() => ({
  tugma: {
    alignSelf: "flex-start" as const,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.brand + "66",
    backgroundColor: color.brandSoft,
  },
  matn: { fontSize: font.caption, fontWeight: "800" as const, color: color.brand },
}));
