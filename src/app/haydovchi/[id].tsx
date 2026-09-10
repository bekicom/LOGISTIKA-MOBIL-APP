/**
 * D8 — haydovchi kartasi va ish haqi (TZ 03, 29-30-band).
 *
 * ── NEGA «TO'LANGAN» VA «USHLAB QOLINGAN» ALOHIDA ───────────────
 *
 * Ular bitta songa qo'shilmaydi. «Qancha berdim» va «qancha
 * ushladim» — boshqa-boshqa savol: birinchisi hisob-kitob, ikkinchisi
 * bahs. Bitta «jami» raqami ikkalasini ham yashirardi.
 *
 * ⚠️ Valyutalar ham qo'shilmaydi (qoida 2).
 *
 * ── FAQAT EGASI KO'RADI ─────────────────────────────────────────
 *
 * Ekranda telefon, prava muddati va oylik bor. Server ham shunday
 * tekshiradi (`ownerId: user.id`) — bu yerda takrorlanmaydi.
 */
import { useState } from "react";
import { Linking, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { Button, Field, Header, Notice } from "@/components/ui";
import { ErrorBox, Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t, tripStatusLabel } from "@/lib/i18n";

const KINDS = ["SALARY", "ADVANCE", "TRIP_FEE", "BONUS", "DEDUCTION"];
const CURRENCIES = ["UZS", "USD", "KZT", "RUB"];

type Money = { currency: string; amount: number };
type Feed = {
  driver: {
    id: string; fullName: string; phone: string; isActive: boolean; note: string | null;
    licenseUntil: string | null; furamId: number | null; avatarUrl: string | null;
    hasAccount: boolean; onTrip: boolean;
  };
  vehicles: { id: string; plate: string; no: number; main: boolean }[];
  trips: { id: string; no: number; status: string; from: string; to: string; at: string }[];
  payments: {
    id: string; kind: string; amount: number; currency: string;
    period: string | null; note: string | null; paidAt: string;
  }[];
  totals: { paid: Money[]; held: Money[] };
};

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(n);
/** Joriy oy — `period` uchun boshlang'ich qiymat */
const thisMonth = () => new Date().toISOString().slice(0, 7);

export default function Haydovchi() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, loading, error, refreshing, refresh, reload } = useApi<Feed>(
    id ? `/api/fleet/drivers/${id}` : null,
    [id],
  );

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("SALARY");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("UZS");
  const [period, setPeriod] = useState(thisMonth());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const value = Number(amount.replace(/\s/g, "").replace(",", "."));
  const ready = Number.isFinite(value) && value > 0;
  /* Davr faqat oylik va avansda ma'noli — reys haqi reysga tegishli */
  const needPeriod = kind === "SALARY" || kind === "ADVANCE";

  async function addPay() {
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/fleet/drivers/${id}/payments`, {
        method: "POST",
        body: {
          kind,
          amount: value,
          currency,
          period: needPeriod ? period : null,
          note: note.trim() || null,
        },
      });
      setOpen(false);
      setAmount("");
      setNote("");
      reload();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  const d = data?.driver;

  return (
    <View style={s.root}>
      <Header title={d?.fullName ?? t("mob.drv.title")} subtitle={d ? d.phone : undefined} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading && !data ? <Skeleton rows={3} /> : null}
        {error && !data ? <ErrorBox message={error} onRetry={reload} /> : null}
        {err ? <Notice tone="danger">{err}</Notice> : null}

        {data && d ? (
          <>
            {/* Karta */}
            <View style={s.card}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>
                    {d.fullName
                      .split(" ")
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.name}>{d.fullName}</Text>
                  <Text style={s.meta}>
                    {d.furamId ? `FURAM-${d.furamId}` : t("mob.drv.noAccount")}
                  </Text>
                </View>
                <Pressable style={s.call} onPress={() => Linking.openURL(`tel:${d.phone}`)}>
                  <Icon name="phone" size={17} stroke={color.brand} />
                </Pressable>
              </View>

              <View style={s.tags}>
                {d.onTrip ? (
                  <View style={[s.tag, { backgroundColor: color.blueSoft }]}>
                    <Text style={[s.tagText, { color: color.blue }]}>{t("mob.drv.onTrip")}</Text>
                  </View>
                ) : null}
                {d.licenseUntil ? (
                  <View style={s.tag}>
                    <Text style={s.tagText}>
                      {t("mob.drv.license")}: {d.licenseUntil.slice(0, 10)}
                    </Text>
                  </View>
                ) : null}
              </View>

              {!d.hasAccount ? (
                <Text style={s.hint}>{t("mob.drv.noAccount")}</Text>
              ) : null}
            </View>

            {/* Hisob */}
            <View style={s.card}>
              <Text style={s.group}>{t("mob.drv.payroll")}</Text>
              <View style={{ flexDirection: "row", gap: space.lg, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.sumLabel}>{t("mob.drv.paid")}</Text>
                  {data.totals.paid.length === 0 ? (
                    <Text style={s.sumValue}>—</Text>
                  ) : (
                    data.totals.paid.map((m) => (
                      <Text key={m.currency} style={s.sumValue}>
                        {fmt(m.amount)} {m.currency}
                      </Text>
                    ))
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.sumLabel}>{t("mob.drv.held")}</Text>
                  {data.totals.held.length === 0 ? (
                    <Text style={[s.sumValue, { color: color.mutedForeground }]}>—</Text>
                  ) : (
                    data.totals.held.map((m) => (
                      <Text key={m.currency} style={[s.sumValue, { color: color.danger }]}>
                        {fmt(m.amount)} {m.currency}
                      </Text>
                    ))
                  )}
                </View>
              </View>

              <View style={{ marginTop: space.md }}>
                <Button
                  title={t("mob.drv.addPay")}
                  variant="secondary"
                  onPress={() => setOpen(true)}
                  icon={<Icon name="plus" size={17} stroke={color.foreground} />}
                />
              </View>
            </View>

            {/* To'lov tarixi */}
            {data.payments.length === 0 ? (
              <Text style={s.hint}>{t("mob.drv.noPay")}</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {data.payments.map((p) => {
                  const minus = p.kind === "DEDUCTION";
                  return (
                    <View key={p.id} style={s.row}>
                      <View
                        style={[
                          s.icon,
                          { backgroundColor: minus ? color.dangerSoft : color.successSoft },
                        ]}
                      >
                        <Icon
                          name="wallet"
                          size={17}
                          stroke={minus ? color.danger : color.success}
                        />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.rowTitle}>{t(`payrollKind.${p.kind}`)}</Text>
                        <Text style={s.meta} numberOfLines={1}>
                          {[p.period, p.paidAt.slice(0, 10), p.note].filter(Boolean).join(" · ")}
                        </Text>
                      </View>
                      <Text style={[s.amount, minus && { color: color.danger }]}>
                        {minus ? "−" : ""}
                        {fmt(p.amount)} {p.currency}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Mashinalari */}
            {data.vehicles.length > 0 ? (
              <View>
                <Text style={s.group}>{t("mob.drv.vehicles")}</Text>
                <View style={{ gap: 8 }}>
                  {data.vehicles.map((v) => (
                    <Pressable
                      key={`${v.id}-${v.main}`}
                      onPress={() => router.push(`/parkim/${v.id}`)}
                      style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}
                    >
                      <View style={[s.icon, { backgroundColor: color.muted }]}>
                        <Icon name="truck" size={17} stroke={color.mutedForeground} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.rowTitle}>{v.plate}</Text>
                        <Text style={s.meta}>
                          {v.main ? t("mob.vehicle.mainDriver") : t("mob.vehicle.coDriver")}
                        </Text>
                      </View>
                      <Icon name="chevron" size={17} stroke="#cbd5e1" />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Reyslari */}
            {data.trips.length > 0 ? (
              <View>
                <Text style={s.group}>{t("mob.drv.trips")}</Text>
                <View style={{ gap: 8 }}>
                  {data.trips.map((tr) => (
                    <Pressable
                      key={tr.id}
                      onPress={() => router.push(`/reys/${tr.id}`)}
                      style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}
                    >
                      <View style={[s.icon, { backgroundColor: color.blueSoft }]}>
                        <Icon name="route" size={17} stroke={color.blue} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.rowTitle} numberOfLines={1}>
                          {tr.from} → {tr.to}
                        </Text>
                        <Text style={s.meta}>
                          FURAM #{tr.no} · {tripStatusLabel(tr.status)}
                        </Text>
                      </View>
                      <Icon name="chevron" size={17} stroke="#cbd5e1" />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <Sheet open={open} onClose={() => setOpen(false)} title={t("mob.drv.addPay")}>
        <Text style={s.label}>{t("mob.money.kind")}</Text>
        <View style={s.chips}>
          {KINDS.map((k) => (
            <Pressable key={k} onPress={() => setKind(k)} style={[s.chip, kind === k && s.chipOn]}>
              <Text style={[s.chipText, kind === k && { color: "#fff" }]}>
                {t(`payrollKind.${k}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ marginTop: space.md }}>
          <Field
            label={t("mob.money.amount")}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0"
          />
        </View>
        <View style={[s.chips, { marginTop: 8 }]}>
          {CURRENCIES.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCurrency(c)}
              style={[s.chip, currency === c && s.chipOn]}
            >
              <Text style={[s.chipText, currency === c && { color: "#fff" }]}>{c}</Text>
            </Pressable>
          ))}
        </View>

        {needPeriod ? (
          <View style={{ marginTop: space.md }}>
            <Field
              label={t("mob.drv.period")}
              value={period}
              onChangeText={setPeriod}
              placeholder={t("mob.drv.periodPh")}
              maxLength={7}
            />
          </View>
        ) : null}

        <View style={{ marginTop: space.md }}>
          <Field
            placeholder={t("mob.money.notePh")}
            value={note}
            onChangeText={setNote}
            maxLength={500}
          />
        </View>

        {err ? <Notice tone="danger">{err}</Notice> : null}

        <View style={{ marginTop: space.md }}>
          <Button title={t("mob.common.save")} onPress={addPay} loading={busy} disabled={!ready} />
        </View>
      </Sheet>
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: color.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "800", color: color.brand },
  name: { fontSize: 16.5, fontWeight: "800", color: color.foreground },
  meta: { fontSize: 12.5, color: color.mutedForeground, marginTop: 2 },
  call: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: color.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: color.muted,
  },
  tagText: { fontSize: 11.5, fontWeight: "700", color: color.mutedForeground },
  hint: { fontSize: 12, color: color.mutedForeground, marginTop: 10, lineHeight: 18 },

  group: {
    fontSize: 12,
    fontWeight: "700",
    color: color.mutedForeground,
    letterSpacing: 0.4,
    marginBottom: 8,
    marginLeft: 4,
  },
  sumLabel: { fontSize: 11.5, fontWeight: "700", color: color.mutedForeground },
  sumValue: {
    fontSize: 17,
    fontWeight: "800",
    color: color.foreground,
    marginTop: 3,
    fontVariant: ["tabular-nums"],
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.md,
    ...shadow.card,
  },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 14, fontWeight: "700", color: color.foreground },
  amount: {
    fontSize: 14,
    fontWeight: "800",
    color: color.foreground,
    fontVariant: ["tabular-nums"],
  },

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
}));
