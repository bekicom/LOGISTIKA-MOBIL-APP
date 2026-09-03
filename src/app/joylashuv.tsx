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
 *  2. App Store tekshiruvidan o'tish osonlashadi (§11.2): Apple
 *     fon rejimidagi joylashuvni ALOHIDA tekshiradi va «nima uchun»
 *     savoliga javob ilovaning ichida bo'lishini talab qiladi.
 *
 * IKKI BOSQICH. Avval «ilova ochiq bo'lganda», keyin — reys
 * boshlangach — «doim». Birdan «doim» so'ralmaydi.
 */
import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { askBackground, askForeground, permState, start, type PermState } from "@/lib/gps";
import { t } from "@/lib/i18n";
import { color, font, radius, space } from "@/lib/theme";

export default function Joylashuv() {
  const { trip } = useLocalSearchParams<{ trip?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [state, setState] = useState<PermState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void permState().then(setState);
  }, []);

  async function allow() {
    setBusy(true);
    try {
      if (state === "denied" || state === null) {
        const ok = await askForeground();
        if (!ok) {
          setState("denied");
          return;
        }
      }
      /* «Doim» ruxsati SHU YERDA so'raladi, chunki haydovchi
         telefonni cho'ntagiga soladi va ilova fonga o'tadi —
         o'shanda kuzatuv to'xtab qolmasligi kerak. */
      const next = await askBackground();
      setState(next);
      if (trip && (next === "granted" || next === "foregroundOnly")) {
        await start(trip);
        router.back();
      }
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
        <Text style={s.lead}>{t("mob.geo.whyText")}</Text>

        <View style={s.points}>
          <Point text={t("mob.geo.p1")} />
          <Point text={t("mob.geo.p2")} />
          <Point text={t("mob.geo.p3")} last />
        </View>

        {/* Rad etilgan bo'lsa — tizim oynasi boshqa chiqmaydi */}
        {state === "denied" ? (
          <View style={s.warn}>
            <Icon name="alert" size={17} stroke={color.warning} />
            <Text style={s.warnText}>{t("mob.geo.deniedText")}</Text>
          </View>
        ) : state === "foregroundOnly" ? (
          <View style={s.warn}>
            <Icon name="alert" size={17} stroke={color.warning} />
            <Text style={s.warnText}>{t("mob.geo.fgOnlyText")}</Text>
          </View>
        ) : null}

        <View style={{ gap: 10, marginTop: space.xl }}>
          {state === "denied" ? (
            <Button title={t("mob.geo.openSettings")} onPress={() => void Linking.openSettings()} />
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

const s = StyleSheet.create({
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
  lead: { fontSize: font.body, color: "#475569", marginTop: 10, lineHeight: 23 },

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
  warnText: { flex: 1, fontSize: font.caption, color: "#92400e", lineHeight: 20 },

  later: {
    fontSize: font.body,
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
    paddingVertical: 12,
  },
  note: {
    marginTop: space.lg,
    padding: 14,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
  },
  noteText: { fontSize: 12, color: "#475569", lineHeight: 19 },
});
