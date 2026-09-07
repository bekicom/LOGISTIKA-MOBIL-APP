/**
 * I6 — nomzod qidirish (TZ 13).
 *
 * ── ODAM TILIDA SO'RALADI ───────────────────────────────────────
 *
 * «Xalqaro reysga E toifali, uch yildan ortiq tajribali haydovchi»
 * — filtr ro'yxatlaridan bunday so'rovni yig'ish uzoq. AI gapni
 * filtrga o'giradi, izlashni esa BAZA qiladi: qat'iy shartlar
 * (yo'nalish, kasb, tajriba) SQL da qo'yiladi.
 *
 * ── TUSHUNMASA — OCHIQ AYTADI ───────────────────────────────────
 *
 * Server `understood: false` qaytarsa, ro'yxat bo'sh bo'ladi. Butun
 * bazani «mos nomzodlar» deb ko'rsatish mumkin edi-yu, bu jim
 * yolg'on bo'lardi: odam so'raganini topdim deb o'ylardi.
 */
import { useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { Button, Field, Header, Notice } from "@/components/ui";
import { Empty } from "@/components/state";
import { TariffNotice } from "@/components/TariffNotice";
import { api, FuramError } from "@/lib/api";
import { color, radius, shadow, space } from "@/lib/theme";
import { jobDirectionLabel, jobProfessionLabel, t } from "@/lib/i18n";

type Candidate = {
  id: string;
  userId: string;
  direction: string;
  professions: string[];
  title: string | null;
  experienceY: number | null;
  licenseClasses: string[];
  payFrom: number | null;
  payCurrency: string | null;
  location: string | null;
  user: { furamId: number; firstName: string | null; lastName: string | null; isVerified: boolean };
  match: { score: number };
};
type Answer = {
  understood: boolean;
  total: number;
  candidates: Candidate[];
};

export default function Nomzodlar() {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Answer | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function search() {
    setBusy(true);
    setErr(null);
    try {
      const r = await api<Answer>("/api/jobs/search", {
        method: "POST",
        body: { question: q.trim() },
      });
      setRes(r);
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.root}>
      <Header title={t("mob.cand.title")} />

      <FlatList
        data={res?.candidates ?? []}
        keyExtractor={(x) => x.id}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + space.xxl }]}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: space.md, marginBottom: space.sm }}>
            <Text style={s.lead}>{t("mob.cand.lead")}</Text>
            <TariffNotice feature="ai_matching" />
            <Field
              placeholder={t("mob.cand.askPh")}
              value={q}
              onChangeText={setQ}
              maxLength={500}
              multiline
            />
            <Button
              title={busy ? t("mob.diag.thinking") : t("mob.cand.search")}
              onPress={search}
              loading={busy}
              disabled={q.trim().length < 3}
              icon={<Icon name="sparkle" size={18} stroke="#fff" />}
            />
            {err ? <Notice tone="danger">{err}</Notice> : null}

            {res && !res.understood ? (
              <Notice tone="warning">{t("mob.cand.notUnderstood")}</Notice>
            ) : null}
            {res?.understood && res.candidates.length > 0 ? (
              <Text style={s.found}>{t("mob.cand.found", { n: res.candidates.length })}</Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          res?.understood && res.candidates.length === 0 ? (
            <Empty icon="users" title={t("mob.cand.none")} text={t("mob.cand.noneHint")} />
          ) : null
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={s.name} numberOfLines={1}>
                {[item.user.firstName, item.user.lastName].filter(Boolean).join(" ") ||
                  `FURAM-${item.user.furamId}`}
              </Text>
              {item.user.isVerified ? <Icon name="shield" size={14} stroke={color.info} /> : null}
              <View style={{ flex: 1 }} />
              <View style={s.score}>
                <Text style={s.scoreText}>{item.match.score}%</Text>
              </View>
            </View>

            <Text style={s.meta} numberOfLines={2}>
              {[
                item.title,
                item.professions.map((p) => jobProfessionLabel(p)).join(", ") ||
                  jobDirectionLabel(item.direction),
                item.experienceY != null ? t("mob.cand.yearsN", { n: item.experienceY }) : null,
                item.location,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>

            {item.licenseClasses.length > 0 ? (
              <View style={s.chips}>
                {item.licenseClasses.map((c) => (
                  <View key={c} style={s.chip}>
                    <Text style={s.chipText}>{c}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {item.payFrom != null ? (
              <Text style={s.pay}>
                {t("mob.cand.payFrom", {
                  n: new Intl.NumberFormat("ru-RU").format(item.payFrom),
                  cur: item.payCurrency ?? "",
                })}
              </Text>
            ) : null}
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  list: { padding: space.lg },
  lead: { fontSize: 13, color: color.mutedForeground, lineHeight: 19 },
  found: { fontSize: 12.5, fontWeight: "700", color: color.mutedForeground },

  card: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.md,
    ...shadow.card,
  },
  name: { fontSize: 14.5, fontWeight: "700", color: color.foreground, flexShrink: 1 },
  meta: { fontSize: 12.5, color: color.mutedForeground, marginTop: 4, lineHeight: 18 },
  pay: { fontSize: 13, fontWeight: "700", color: color.foreground, marginTop: 6 },
  score: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: color.brandSoft,
  },
  scoreText: { fontSize: 11.5, fontWeight: "800", color: color.brand },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: color.muted,
  },
  chipText: { fontSize: 11.5, fontWeight: "700", color: color.mutedForeground },
});
