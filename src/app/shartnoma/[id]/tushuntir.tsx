/**
 * Sh4 — «bu shart nima degani» (AI tushuntirish).
 *
 * ── NIMA UCHUN KERAK ────────────────────────────────────────────
 *
 * Shartnomani ko'pchilik o'qimaydi — chunki tushunmaydi. «To'lov
 * muddati: yuk topshirilgandan keyin 15 bank kuni» degan qatorning
 * ma'nosi haydovchi uchun «pulni qachon olaman» degani, lekin
 * bunday yozilmagan. AI shu farqni yopadi.
 *
 * ── JAVOB HUJJAT EMAS ───────────────────────────────────────────
 *
 * Pastda ochiq aytiladi: asosiy hujjat shartnomaning o'zi. Model
 * shartni noto'g'ri o'qishi mumkin va odam «AI shunday dedi» deb
 * bahs qilib qolmasin.
 */
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Icon } from "@/components/Icon";
import { Button, Header, Notice } from "@/components/ui";
import { TariffNotice } from "@/components/TariffNotice";
import { api, FuramError } from "@/lib/api";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

export default function ShartnomaTushuntir() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ answer: string }>(`/api/contracts/${id}/explain`, { method: "POST" });
      setText(r.answer);
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.root}>
      <Header title={t("mob.cexp.title")} />
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.card}>
          <View style={s.head}>
            <View style={s.icon}>
              <Icon name="sparkle" size={20} stroke={color.purple} />
            </View>
            <Text style={s.title}>{t("mob.cexp.title")}</Text>
          </View>
          <Text style={s.lead}>{t("mob.cexp.lead")}</Text>
        </View>

        {/* Qoida 5: shartnomani tushuntirish — model chaqiruvi,
            «AI yordamchi» tarifiga kiradi. Tugma bosilgandan keyin
            aytish kech bo'lardi. */}
        <TariffNotice feature="ai" />

        {text ? (
          <View style={s.card}>
            {text
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line, i) => (
                <Text key={i} style={s.line}>
                  {line}
                </Text>
              ))}
            <Text style={s.note}>{t("mob.cexp.note")}</Text>
          </View>
        ) : null}

        {err ? <Notice tone="danger">{err}</Notice> : null}

        <Button
          title={busy ? t("mob.cexp.running") : text ? t("mob.aiSum.again") : t("mob.cexp.run")}
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
  title: { flex: 1, fontSize: 16, fontWeight: "800", color: color.foreground },
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
