/**
 * E10 — AI reys yakuni (TZ 02, 39-band).
 *
 * ── RAQAMLAR MODELDAN EMAS ──────────────────────────────────────
 *
 * Server xulosani yozishdan oldin kun, masofa, xarajat, yoqilg'i
 * va hodisalarni O'ZI hisoblaydi va modelga tayyor son beradi.
 * Model faqat ularni odam tilida bog'laydi. Shuning uchun «foyda
 * qancha» degan savolga javob har safar bir xil chiqadi.
 *
 * ── TUGMA BOSILGANDAGINA ────────────────────────────────────────
 *
 * Ekran ochilganda so'ralmaydi: har reys ochilganda model
 * chaqirilsa, xarajat behuda oshardi va tarif limiti bir kunda
 * tugab qolardi.
 */
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Icon } from "@/components/Icon";
import { Button, Header, Notice } from "@/components/ui";
import { api, FuramError } from "@/lib/api";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

export default function ReysYakuni() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ summary: string }>(`/api/trips/${id}/summary`, { method: "POST" });
      setText(r.summary);
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.root}>
      <Header title={t("mob.aiSum.title")} />
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.card}>
          <View style={s.head}>
            <View style={s.icon}>
              <Icon name="sparkle" size={20} stroke={color.purple} />
            </View>
            <Text style={s.title}>{t("mob.aiSum.title")}</Text>
          </View>
          <Text style={s.lead}>{t("mob.aiSum.lead")}</Text>
        </View>

        {text ? (
          <View style={s.card}>
            {/* Model bandlarni yangi qator bilan ajratadi — o'sha
                bo'linish saqlanadi, aks holda bitta uzun devor
                bo'lib qolardi */}
            {text
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line, i) => (
                <Text key={i} style={s.line}>
                  {line}
                </Text>
              ))}
            <Text style={s.note}>{t("mob.aiSum.note")}</Text>
          </View>
        ) : null}

        {err ? <Notice tone="danger">{err}</Notice> : null}

        <Button
          title={busy ? t("mob.aiSum.running") : text ? t("mob.aiSum.again") : t("mob.aiSum.run")}
          onPress={run}
          loading={busy}
          variant={text ? "secondary" : "primary"}
        />
      </ScrollView>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },
  card: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.lg,
    ...shadow.card,
  },
  head: { flexDirection: "row", alignItems: "center", gap: 11 },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: color.purpleSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 16, fontWeight: "800", color: color.foreground },
  lead: { fontSize: 13, color: color.mutedForeground, marginTop: 10, lineHeight: 19 },
  line: { fontSize: 14, color: color.foreground, lineHeight: 21, marginBottom: 8 },
  note: {
    fontSize: 11.5,
    color: color.mutedForeground,
    marginTop: 6,
    lineHeight: 17,
    borderTopWidth: 1,
    borderTopColor: color.border,
    paddingTop: 10,
  },
}));
