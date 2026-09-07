/**
 * I3 — ish kelishuvlari (TZ 13).
 *
 * ── NEGA ARIZADAN ALOHIDA ───────────────────────────────────────
 *
 * Ariza — «meni oling» degan so'rov. Kelishuv esa shartnoma:
 * maosh, boshlanish sanasi, grafik va alohida shartlar. Ish beruvchi
 * yozadi, xodim rozilik beradi yoki qarshi taklif yuboradi.
 *
 * ── O'ZGARISH — QAYTA ROZILIK ───────────────────────────────────
 *
 * Yangi versiya kelsa NIMA O'ZGARGANI yoziladi (`diff`), butun matn
 * qayta o'qitilmaydi: bitta harf almashtirilib qayta imzolatilmasin.
 *
 * ── ROZILIK — IKKI TOMONDAN ─────────────────────────────────────
 *
 * Kim javob berganini ODAM NOMI bilan ko'rsatamiz. «1/2 rozi» degan
 * yozuv kimni kutayotganini aytmaydi.
 */
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { Button, Field, Header, Notice } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { TariffNotice } from "@/components/TariffNotice";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space } from "@/lib/theme";
import { jobProfessionLabel, t, tOr } from "@/lib/i18n";

const CURRENCIES = ["UZS", "USD", "KZT", "RUB"];

type Terms = {
  no: number;
  pay: number;
  currency: string;
  payTerm: string;
  startDate: string | null;
  endDate: string | null;
  schedule: string | null;
  terms: string | null;
  note: string | null;
};
type Item = {
  applicationId: string;
  title: string | null;
  profession: string | null;
  place: string | null;
  iAmEmployer: boolean;
  other: { name: string; furamId: number };
  canOffer: boolean;
  contract: {
    id: string;
    number: string;
    stage: string;
    current: Terms | null;
    pending: Terms | null;
    diff: string[];
    consent: { userId: string; name: string; me: boolean; approved: boolean | null }[];
  } | null;
};

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(n);
const today = () => new Date().toISOString().slice(0, 10);

export default function IshKelishuvlari() {
  const insets = useSafeAreaInsets();
  const { data, loading, error, refreshing, refresh, reload } = useApi<{ items: Item[] }>(
    "/api/jobs/agreement",
  );

  const [offer, setOffer] = useState<Item | null>(null);
  const [pay, setPay] = useState("");
  const [currency, setCurrency] = useState("UZS");
  const [payTerm, setPayTerm] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [schedule, setSchedule] = useState("");
  const [terms, setTerms] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const num = (v: string) => {
    const n = Number(v.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const value = num(pay);
  const ready = value != null && payTerm.trim().length >= 2 && startDate.length >= 4;

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    try {
      await api("/api/jobs/agreement", { method: "POST", body });
      setOffer(null);
      setPay("");
      setTerms("");
      reload();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  const rows = data?.items ?? [];

  return (
    <View style={s.root}>
      <Header title={t("mob.jagree.title")} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.lead}>{t("mob.jagree.lead")}</Text>

        {/* Qoida 5: to'siq OLDINDAN. Kelishuv yozish «Vakansiya
            joylash» tarifiga kiradi — shart to'ldirilgandan keyin
            aytish kech bo'lardi. */}
        <TariffNotice feature="vacancies" />

        {loading && !data ? <Skeleton rows={3} /> : null}
        {error && !data ? <ErrorBox message={error} onRetry={reload} /> : null}
        {err ? <Notice tone="danger">{err}</Notice> : null}

        {data && rows.length === 0 ? (
          <Empty
            icon="briefcase"
            title={t("mob.jagree.empty")}
            text={t("mob.jagree.emptyHint")}
          />
        ) : null}

        {rows.map((x) => {
          const c = x.contract;
          const waitsMe = c?.stage === "WAIT_ME" || c?.stage === "CHANGE_WAIT_ME";
          return (
            <View key={x.applicationId} style={s.card}>
              <Text style={s.name}>
                {x.title || (x.profession ? jobProfessionLabel(x.profession) : "—")}
              </Text>
              <Text style={s.meta}>
                {[x.other.name, x.place, c?.number].filter(Boolean).join(" · ")}
              </Text>

              {c?.stage ? (
                <View style={[s.stage, waitsMe && { backgroundColor: color.warningSoft }]}>
                  <Text style={[s.stageText, waitsMe && { color: color.warning }]}>
                    {tOr(`mob.jagree.st_${c.stage}`, c.stage)}
                  </Text>
                </View>
              ) : null}

              {c?.current ? <TermsRows v={c.current} /> : null}

              {c?.pending ? (
                <View style={s.pending}>
                  <Text style={s.pendingTitle}>{t("mob.terms.pending")}</Text>
                  {c.diff.length > 0 ? (
                    <Text style={s.changed}>
                      {t("mob.terms.changed", {
                        f: c.diff.map((d) => tOr(`mob.jagree.f_${d}`, d)).join(", "),
                      })}
                    </Text>
                  ) : null}
                  <TermsRows v={c.pending} />
                </View>
              ) : null}

              {c && c.consent.length > 0 ? (
                <View style={{ gap: 7, marginTop: space.md }}>
                  {c.consent.map((r) => (
                    <View key={r.userId} style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                      <Icon
                        name={r.approved ? "check" : "clock"}
                        size={15}
                        stroke={r.approved ? color.success : color.warning}
                      />
                      <Text style={s.meta} numberOfLines={1}>
                        {r.name}
                        {r.me ? ` · ${t("mob.tpart.you")}` : ""}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={{ gap: 9, marginTop: space.md }}>
                {waitsMe && c ? (
                  <Button
                    title={t("mob.jagree.agree")}
                    loading={busy}
                    onPress={() =>
                      post(
                        c.pending
                          ? { action: "answer_change", contractId: c.id, accept: true }
                          : { action: "consent", contractId: c.id },
                      )
                    }
                  />
                ) : null}
                {x.canOffer ? (
                  <Button
                    title={c?.current ? t("mob.jagree.counter") : t("mob.jagree.offer")}
                    variant="secondary"
                    onPress={() => {
                      setOffer(x);
                      if (c?.current) {
                        setPay(String(c.current.pay));
                        setCurrency(c.current.currency);
                        setPayTerm(c.current.payTerm);
                        setStartDate(c.current.startDate?.slice(0, 10) ?? today());
                        setSchedule(c.current.schedule ?? "");
                        setTerms(c.current.terms ?? "");
                      }
                    }}
                  />
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Sheet open={offer !== null} onClose={() => setOffer(null)} title={t("mob.jagree.offer")}>
        <View style={{ gap: space.md }}>
          <Field
            label={t("mob.jagree.pay")}
            value={pay}
            onChangeText={setPay}
            keyboardType="numeric"
            placeholder="0"
          />
          <View style={s.chips}>
            {CURRENCIES.map((c) => (
              <Pressable key={c} onPress={() => setCurrency(c)} style={[s.chip, currency === c && s.chipOn]}>
                <Text style={[s.chipText, currency === c && { color: "#fff" }]}>{c}</Text>
              </Pressable>
            ))}
          </View>
          <Field
            label={t("mob.terms.payTerm")}
            placeholder={t("mob.jagree.payTermPh")}
            value={payTerm}
            onChangeText={setPayTerm}
            maxLength={40}
          />
          <Field
            label={t("mob.jagree.start")}
            value={startDate}
            onChangeText={setStartDate}
            placeholder="2026-09-15"
            maxLength={10}
          />
          <Field
            label={t("mob.jagree.schedule")}
            placeholder={t("mob.jagree.schedulePh")}
            value={schedule}
            onChangeText={setSchedule}
            maxLength={60}
          />
          <Field
            label={t("mob.jagree.terms")}
            value={terms}
            onChangeText={setTerms}
            multiline
            maxLength={1000}
          />

          {err ? <Notice tone="danger">{err}</Notice> : null}

          <Button
            title={t("mob.common.save")}
            loading={busy}
            disabled={!ready}
            onPress={() =>
              post({
                action: "offer",
                applicationId: offer!.applicationId,
                pay: value,
                currency,
                payTerm: payTerm.trim(),
                startDate,
                schedule: schedule.trim() || null,
                terms: terms.trim() || null,
              })
            }
          />
        </View>
      </Sheet>
    </View>
  );
}

function TermsRows({ v }: { v: Terms }) {
  return (
    <View style={{ marginTop: 10, gap: 6 }}>
      <Text style={s.pay}>
        {fmt(v.pay)} {v.currency}
      </Text>
      <Line k={t("mob.terms.payTerm")} v={v.payTerm} />
      {v.startDate ? <Line k={t("mob.jagree.start")} v={v.startDate.slice(0, 10)} /> : null}
      {v.schedule ? <Line k={t("mob.jagree.schedule")} v={v.schedule} /> : null}
      {v.terms ? <Text style={s.terms}>{v.terms}</Text> : null}
    </View>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <Text style={s.lineK}>{k}</Text>
      <Text style={s.lineV} numberOfLines={2}>
        {v}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },
  lead: { fontSize: 13, color: color.mutedForeground, lineHeight: 19 },

  card: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.lg,
    ...shadow.card,
  },
  name: { fontSize: 15.5, fontWeight: "800", color: color.foreground },
  meta: { flex: 1, fontSize: 12.5, color: color.mutedForeground, marginTop: 3 },
  stage: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: color.muted,
  },
  stageText: { fontSize: 11.5, fontWeight: "700", color: color.mutedForeground },

  pay: { fontSize: 20, fontWeight: "800", color: color.foreground, fontVariant: ["tabular-nums"] },
  terms: { fontSize: 13, color: color.foreground, lineHeight: 19, marginTop: 4 },
  lineK: { fontSize: 12.5, color: color.mutedForeground },
  lineV: { flex: 1, fontSize: 12.5, fontWeight: "600", color: color.foreground, textAlign: "right" },

  pending: {
    marginTop: space.md,
    borderRadius: radius.control,
    backgroundColor: color.warningSoft,
    padding: space.md,
  },
  pendingTitle: { fontSize: 12, fontWeight: "800", color: color.warning },
  changed: { fontSize: 12, fontWeight: "600", color: color.warning, marginTop: 4 },

  chips: { flexDirection: "row", gap: 7 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: color.muted,
  },
  chipOn: { backgroundColor: color.brand },
  chipText: { fontSize: 13, fontWeight: "700", color: color.mutedForeground },
});
