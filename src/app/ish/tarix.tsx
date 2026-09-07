/**
 * I4 — tasdiqlangan ish tarixi (TZ 13 §29).
 *
 * ── NEGA IKKI TOMON TASDIQLAYDI ─────────────────────────────────
 *
 * «Uch yil haydovchi bo'lganman» degan gapning qiymati uni ISH
 * BERUVCHI tasdiqlaganida paydo bo'ladi. Shuning uchun qo'lda
 * yozilgan yozuv `PENDING` bo'lib tug'iladi va hech qayerda
 * tasdiqlangandek ko'rinmaydi.
 *
 * ⚠️ «Tasdiqlangan» belgisini SERVERNING `verified` bayrog'idan
 * chizamiz — holat nomini ilova o'zi talqin qilmaydi. Aks holda
 * bitta holat unutilib, tasdiqlanmagan yozuv tasdiqlangandek
 * ko'rinib ketardi.
 *
 * ── STAJ OYDA ──────────────────────────────────────────────────
 *
 * Kesishgan davrlar birlashtirilgan: yarim stavkada ikki joyda
 * ishlagan odamning staji ikkilanib ketmasin. Hisob serverda.
 */
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { Button, Field, Header, Notice } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space } from "@/lib/theme";
import { jobDirectionLabel, jobProfessionLabel, t } from "@/lib/i18n";

/** `furam/src/lib/jobs.ts:DIRECTIONS` — asosiylari */
const DIRECTIONS = ["DRIVER", "LOGISTICS", "WORKSHOP", "WAREHOUSE", "OFFICE", "OTHER"];

type Row = {
  id: string;
  side: "worker" | "employer";
  worker: { furamId: number; name: string };
  employer: { furamId: number; name: string };
  companyName: string | null;
  direction: string;
  profession: string | null;
  title: string | null;
  location: string | null;
  startedAt: string;
  endedAt: string | null;
  months: number;
  status: string;
  verified: boolean;
  disputeNote: string | null;
  canConfirm: boolean;
  canObject: boolean;
};
type Feed = {
  verifiedMonths: number;
  awaiting: Row[];
  asWorker: Row[];
  asEmployer: Row[];
};

const day = (v: string | null) => (v ? v.slice(0, 10) : null);

export default function IshTarixi() {
  const insets = useSafeAreaInsets();
  const { data, loading, error, refreshing, refresh, reload } = useApi<Feed>("/api/jobs/history");

  const [open, setOpen] = useState(false);
  const [furamId, setFuramId] = useState("");
  const [asEmployer, setAsEmployer] = useState(false);
  const [direction, setDirection] = useState("DRIVER");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [endedAt, setEndedAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const who = Number(furamId.trim());
  const ready = Number.isInteger(who) && who > 0 && /^\d{4}-\d{2}-\d{2}$/.test(startedAt);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    try {
      await api("/api/jobs/history", { method: "POST", body });
      setOpen(false);
      setFuramId("");
      setTitle("");
      reload();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  const years = data ? Math.floor(data.verifiedMonths / 12) : 0;
  const restMonths = data ? data.verifiedMonths % 12 : 0;

  return (
    <View style={s.root}>
      <Header title={t("mob.jhist.title")} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.lead}>{t("mob.jhist.lead")}</Text>

        {loading && !data ? <Skeleton rows={3} /> : null}
        {error && !data ? <ErrorBox message={error} onRetry={reload} /> : null}
        {err ? <Notice tone="danger">{err}</Notice> : null}

        {data ? (
          <View style={s.hero}>
            <Text style={s.heroNum}>
              {years > 0 ? t("mob.jhist.yearsMonths", { y: years, m: restMonths }) : t("mob.jhist.monthsOnly", { m: restMonths })}
            </Text>
            <Text style={s.heroLabel}>{t("mob.jhist.verifiedTotal")}</Text>
          </View>
        ) : null}

        {/* Mendan javob kutayotganlar — eng tepada */}
        {(data?.awaiting ?? []).length > 0 ? (
          <View>
            <Text style={s.group}>{t("mob.jhist.awaiting")}</Text>
            <View style={{ gap: 8 }}>
              {data!.awaiting.map((r) => (
                <HistoryCard
                  key={r.id}
                  r={r}
                  busy={busy}
                  onConfirm={() => post({ action: "confirm", id: r.id })}
                  onObject={() => post({ action: "dispute", id: r.id, note: "" })}
                />
              ))}
            </View>
          </View>
        ) : null}

        {(data?.asWorker ?? []).length > 0 ? (
          <View>
            <Text style={s.group}>{t("mob.jhist.asWorker")}</Text>
            <View style={{ gap: 8 }}>
              {data!.asWorker.map((r) => (
                <HistoryCard key={r.id} r={r} busy={busy} />
              ))}
            </View>
          </View>
        ) : null}

        {(data?.asEmployer ?? []).length > 0 ? (
          <View>
            <Text style={s.group}>{t("mob.jhist.asEmployer")}</Text>
            <View style={{ gap: 8 }}>
              {data!.asEmployer.map((r) => (
                <HistoryCard
                  key={r.id}
                  r={r}
                  busy={busy}
                  onConfirm={r.canConfirm ? () => post({ action: "confirm", id: r.id }) : undefined}
                />
              ))}
            </View>
          </View>
        ) : null}

        {data &&
        data.awaiting.length === 0 &&
        data.asWorker.length === 0 &&
        data.asEmployer.length === 0 ? (
          <Empty icon="briefcase" title={t("mob.jhist.empty")} text={t("mob.jhist.emptyHint")} />
        ) : null}

        <Button
          title={t("mob.jhist.add")}
          variant="secondary"
          onPress={() => setOpen(true)}
          icon={<Icon name="plus" size={18} stroke={color.foreground} />}
        />
      </ScrollView>

      <Sheet open={open} onClose={() => setOpen(false)} title={t("mob.jhist.add")}>
        <Text style={s.lead}>{t("mob.jhist.addLead")}</Text>

        <View style={[s.chips, { marginTop: space.md }]}>
          <Pressable onPress={() => setAsEmployer(false)} style={[s.chip, !asEmployer && s.chipOn]}>
            <Text style={[s.chipText, !asEmployer && { color: "#fff" }]}>
              {t("mob.jhist.iWorked")}
            </Text>
          </Pressable>
          <Pressable onPress={() => setAsEmployer(true)} style={[s.chip, asEmployer && s.chipOn]}>
            <Text style={[s.chipText, asEmployer && { color: "#fff" }]}>
              {t("mob.jhist.iEmployed")}
            </Text>
          </Pressable>
        </View>

        <View style={{ gap: space.md, marginTop: space.md }}>
          <Field
            label={t("mob.own.toFuramId")}
            hint={t("mob.tpart.furamIdHint")}
            value={furamId}
            onChangeText={setFuramId}
            keyboardType="number-pad"
            maxLength={9}
          />
          <View>
            <Text style={s.label}>{t("mob.job.direction")}</Text>
            <View style={s.chips}>
              {DIRECTIONS.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setDirection(d)}
                  style={[s.chip, direction === d && s.chipOn]}
                >
                  <Text style={[s.chipText, direction === d && { color: "#fff" }]}>
                    {jobDirectionLabel(d)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Field label={t("mob.jhist.position")} value={title} onChangeText={setTitle} maxLength={80} />
          <Field label={t("mob.jhist.company")} value={company} onChangeText={setCompany} maxLength={120} />
          <Field
            label={t("mob.jhist.from")}
            value={startedAt}
            onChangeText={setStartedAt}
            placeholder="2024-03-01"
            maxLength={10}
          />
          <Field
            label={t("mob.jhist.to")}
            value={endedAt}
            onChangeText={setEndedAt}
            placeholder="2026-01-31"
            maxLength={10}
          />

          {err ? <Notice tone="danger">{err}</Notice> : null}

          <Button
            title={t("mob.common.save")}
            loading={busy}
            disabled={!ready}
            onPress={() =>
              post({
                action: "add",
                counterpartFuramId: who,
                as: asEmployer ? "employer" : "worker",
                direction,
                title: title.trim() || null,
                companyName: company.trim() || null,
                startedAt,
                endedAt: /^\d{4}-\d{2}-\d{2}$/.test(endedAt) ? endedAt : null,
              })
            }
          />
        </View>
      </Sheet>
    </View>
  );
}

function HistoryCard({
  r,
  busy,
  onConfirm,
  onObject,
}: {
  r: Row;
  busy: boolean;
  onConfirm?: () => void;
  onObject?: () => void;
}) {
  const other = r.side === "worker" ? r.employer : r.worker;
  return (
    <View style={s.card}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon
          name={r.verified ? "check" : "clock"}
          size={16}
          stroke={r.verified ? color.success : color.warning}
        />
        <Text style={s.name} numberOfLines={1}>
          {r.title || jobProfessionLabel(r.profession ?? r.direction)}
        </Text>
      </View>
      <Text style={s.meta} numberOfLines={1}>
        {[r.companyName || other.name, r.location].filter(Boolean).join(" · ")}
      </Text>
      <Text style={s.meta}>
        {[day(r.startedAt), day(r.endedAt) ?? t("mob.jhist.now")].join(" — ")} ·{" "}
        {t("mob.jhist.monthsN", { n: r.months })}
      </Text>
      {r.disputeNote ? <Text style={s.dispute}>{r.disputeNote}</Text> : null}

      {onConfirm || onObject ? (
        <View style={{ flexDirection: "row", gap: 9, marginTop: space.md }}>
          {onConfirm ? (
            <View style={{ flex: 1 }}>
              <Button title={t("mob.jhist.confirm")} loading={busy} onPress={onConfirm} />
            </View>
          ) : null}
          {onObject ? (
            <View style={{ flex: 1 }}>
              <Button
                title={t("mob.jhist.object")}
                variant="secondary"
                loading={busy}
                onPress={onObject}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },
  lead: { fontSize: 13, color: color.mutedForeground, lineHeight: 19 },

  hero: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.lg,
    ...shadow.card,
  },
  heroNum: {
    fontSize: 28,
    fontWeight: "800",
    color: color.foreground,
    letterSpacing: -0.5,
  },
  heroLabel: { fontSize: 12.5, color: color.mutedForeground, marginTop: 3 },

  group: {
    fontSize: 12,
    fontWeight: "700",
    color: color.mutedForeground,
    letterSpacing: 0.4,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.md,
    ...shadow.card,
  },
  name: { flex: 1, fontSize: 14.5, fontWeight: "700", color: color.foreground },
  meta: { fontSize: 12.5, color: color.mutedForeground, marginTop: 3 },
  dispute: { fontSize: 12.5, color: color.danger, marginTop: 6, lineHeight: 18 },

  label: { fontSize: 12, fontWeight: "700", color: color.mutedForeground, marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: color.muted,
  },
  chipOn: { backgroundColor: color.brand },
  chipText: { fontSize: 12.5, fontWeight: "700", color: color.mutedForeground },
});
