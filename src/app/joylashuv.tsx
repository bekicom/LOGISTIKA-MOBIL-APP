/**
 * Joylashuv ruxsati — TUSHUNTIRISH EKRANI (TZ §6.3).
 *
 * TIZIM OYNASIDAN OLDIN chiqadi va ikki narsani beradi:
 *
 *  1. Ruxsat berish ehtimoli sezilarli oshadi. Tizim oynasi darrov
 *     chiqsa, odam nima uchun kerakligini bilmay rad etadi — va
 *     rad javobdan keyin uni qayta so'rab bo'lmaydi, sozlamaga
 *     kirish kerak. Ya'ni bitta noto'g'ri so'rov kuzatuvni butunlay
 *     yo'qotadi.
 *  2. Do'kon tekshiruvidan o'tish: Apple (5.1.1, 2.5.4) ham, Google
 *     Play ham fonda yig'iladigan joylashuv uchun «nima, kimga, qachon»
 *     javobini tizim so'rovidan OLDIN, ilovaning ichida talab qiladi.
 *
 * ── BITTA RUXSAT (2026-09-19, B2 qarori) ────────────────────────
 *
 * Faqat «ilova ochiq paytda» so'raladi — «Doim» yo'q. Kuzatuv shu
 * ruxsat bilan ham fonda ishlaydi (sababi `gps.ts` da). Ilgari ikkinchi
 * qadam bor edi va «faqat ilova ochiqda bo'lsa, cho'ntakda yozilmaydi»
 * deb odamni keraksiz «Doim» ga undardi — bu noto'g'ri edi.
 *
 * Ekran reys kuzatuvidan oldin BIR MARTA ko'rsatiladi — ruxsat boshqa
 * ekranda (xarita, chat) berilgan bo'lsa ham (A15, `izohKorildi`).
 *
 * ⚠️ So'ralmagan ruxsat «rad etilgan» deb ko'rinmaydi (A9): ilgari
 * yangi haydovchiga darrov «Sozlamalarni oching» chiqib, ruxsat berish
 * tugmasiga yetib bo'lmasdi.
 */
import { useEffect, useState } from "react";
import { Linking, Platform, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { askForeground, ensureTrackingNotice, izohniBelgila, permState, start, type PermState } from "@/lib/gps";
import { t } from "@/lib/i18n";
import { color, font, radius, space, themed } from "@/lib/theme";

export default function Joylashuv() {
  const { trip } = useLocalSearchParams<{ trip?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [state, setState] = useState<PermState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void permState().then(setState);
  }, []);

  /** Kuzatuvni boshlab ortga qaytish — reys ekranidan kelinganda.
      Izoh o'qildi deb shu yerda belgilanadi: «Hozir emas» bosgan odamga
      keyingi safar ham ko'rsatiladi */
  async function boshlash() {
    await izohniBelgila();
    if (!trip) {
      router.back();
      return;
    }
    await ensureTrackingNotice();
    await start(trip);
    router.back();
  }

  async function allow() {
    setBusy(true);
    try {
      if (state !== "granted") {
        await askForeground();
        /* Javobni qayta O'QIYMIZ: rad etilgach `canAskAgain` ga qarab
           «denied» (sozlamalar) yoki yana «undetermined» bo'ladi */
        const next = await permState();
        setState(next);
        if (next !== "granted") return;
      }
      await boshlash();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.root}>
      <Header title={t("mob.geo.title")} />

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}>
        <View style={s.icon}>
          <Icon name="route" size={30} stroke={color.brand} />
        </View>

        <Text style={s.h1}>{t("mob.geo.why")}</Text>
        {/* «ilova yopiq yoki ishlatilmayotganda ham» — Google talabi (A5) */}
        <Text style={s.lead}>{t("mob.geo.whyText")}</Text>

        <View style={s.points}>
          <Point text={t("mob.geo.p1")} />
          <Point text={t("mob.geo.p2")} />
          <Point text={t("mob.geo.p3")} />
          {/* Android — foreground service bildirishnomasi; iOS'da
              bildirishnoma yo'q, fonda ekran tepasida belgi chiqadi */}
          <Point text={Platform.OS === "ios" ? t("mob.geo.p4Ios") : t("mob.geo.p4")} last />
        </View>

        {/* Rad etilgan va qayta so'rab bo'lmaydi — faqat sozlamalar */}
        {state === "denied" ? (
          <View style={s.warn}>
            <Icon name="alert" size={17} stroke={color.warning} />
            <Text style={s.warnText}>{t("mob.geo.deniedText")}</Text>
          </View>
        ) : null}

        <View style={{ gap: 10, marginTop: space.xl }}>
          {state === "denied" ? (
            <Button title={t("mob.geo.openSettings")} onPress={() => void Linking.openSettings()} />
          ) : state === "granted" ? (
            <Button title={t("mob.geo.startTracking")} loading={busy} onPress={allow} />
          ) : (
            <Button title={t("mob.geo.allow")} loading={busy} onPress={allow} />
          )}
          <Pressable onPress={() => router.back()} accessibilityRole="button">
            <Text style={s.later}>{t("mob.geo.later")}</Text>
          </Pressable>
        </View>

        {/* Ochiq gap: kuzatuvni istagan vaqtda to'xtatish mumkin */}
        <View style={s.note}>
          <Text style={s.noteText}>{t("mob.geo.stopAnytime")}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Point({ text, last }: { text: string; last?: boolean }) {
  return (
    <View style={[s.point, last ? null : s.pointLine]}>
      <Icon name="check" size={17} stroke={color.success} />
      <Text style={s.pointText}>{text}</Text>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: color.brand + "1f",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.lg,
  },
  h1: { fontSize: 24, fontWeight: "700", color: color.foreground, letterSpacing: -0.5 },
  lead: { fontSize: font.body, color: color.icon, marginTop: 10, lineHeight: 23 },

  points: {
    marginTop: space.xl,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    backgroundColor: color.card,
    overflow: "hidden",
  },
  point: { flexDirection: "row", alignItems: "center", gap: 11, padding: 14 },
  pointLine: { borderBottomWidth: 1, borderBottomColor: color.border },
  pointText: { flex: 1, fontSize: font.body, color: color.foreground },

  warn: {
    flexDirection: "row",
    gap: 10,
    marginTop: space.lg,
    padding: 14,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.warning + "66",
    backgroundColor: color.warning + "0d",
  },
  warnText: { flex: 1, fontSize: font.caption, color: color.warningText, lineHeight: 20 },

  later: {
    fontSize: font.body,
    fontWeight: "600",
    color: color.icon,
    textAlign: "center",
    paddingVertical: 12,
  },
  note: {
    marginTop: space.lg,
    padding: 14,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.iconFaint,
    backgroundColor: color.surface,
  },
  noteText: { fontSize: 12, color: color.icon, lineHeight: 19 },
}));
