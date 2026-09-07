/**
 * M4 — budjet (TZ 16 «BUDJET»).
 *
 * ── NEGA KESIM UCHTA ────────────────────────────────────────────
 *
 * Budjet DAVR + XARAJAT TURI + MASHINA kesimida qo'yiladi. Uchtasi
 * ham ixtiyoriy emas-u, ikkitasi bo'sh qolishi mumkin: «sentabrda
 * hammasiga 20 mln» ham, «sentabrda 01A123AA ning yoqilg'isiga
 * 6 mln» ham to'g'ri gap. Server bitta kesimga bitta budjet
 * saqlaydi — ikkinchi marta yuborilsa borig'i yangilanadi.
 *
 * ── HOLAT SERVERDA HISOBLANADI ──────────────────────────────────
 *
 * «Yaqin» chegarasi (80%) bir joyda tursin: ilova o'zi hisoblasa,
 * web bilan ilova bir xil budjetni boshqacha rangda ko'rsatardi.
 * Bu yerda faqat raqamlar chiziladi.
 */
import { useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { Button, Field, Header, Notice } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { TariffNotice } from "@/components/TariffNotice";
import { api, FuramError } from "@/lib/api";
import { tariffBlocked } from "@/lib/features";
import { useApi } from "@/lib/use-api";
import { budgetCategoryLabel, t } from "@/lib/i18n";
import { color, radius, shadow, space } from "@/lib/theme";

const CURRENCIES = ["UZS", "USD", "KZT", "RUB"];
/** `furam/src/lib/labels.ts:EXPENSE_CAT_LABELS` */
const CATS = [
  "FUEL", "FOOD", "PARKING", "PARTS", "TOLL", "CUSTOMS",
  "WASH", "REPAIR", "FINE", "TAX", "OTHER",
];

type Budget = {
  id: string;
  period: string;
  category: string | null;
  vehicleId: string | null;
  plate: string | null;
  amount: number;
  currency: string;
  state: { limit: number; spent: number; left: number; pct: number; level: string } | null;
};
type Feed = { period: string; budgets: Budget[] };
type Vehicle = { id: string; plate: string };

const LEVEL: Record<string, string> = {
  ok: color.success,
  near: color.warning,
  over: color.danger,
};

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(Math.round(n));
/** Joriy oy — `period` uchun boshlang'ich qiymat */
const thisMonth = () => new Date().toISOString().slice(0, 7);

export default function Budjet() {
  const insets = useSafeAreaInsets();
  const { data, loading, error, refreshing, refresh, reload } = useApi<Feed>("/api/finance");
  const park = useApi<{ items: Vehicle[] }>("/api/fleet/vehicles");

  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState(thisMonth());
  const [category, setCategory] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("UZS");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const value = Number(amount.replace(/\s/g, "").replace(",", "."));
  const ready = /^\d{4}-\d{2}$/.test(period) && Number.isFinite(value) && value > 0;

  async function save() {
    if (tariffBlocked("money")) return;
    setBusy(true);
    setErr(null);
    try {
      await api("/api/finance/budgets", {
        method: "POST",
        body: { period, category, vehicleId, amount: value, currency },
      });
      setOpen(false);
      setAmount("");
      reload();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  function remove(b: Budget) {
    Alert.alert(t("mob.budget.delQ"), undefined, [
      { text: t("mob.common.cancel"), style: "cancel" },
      {
        text: t("mob.cdoc.del"),
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/api/finance/budgets?id=${encodeURIComponent(b.id)}`, { method: "DELETE" });
            reload();
          } catch (e) {
            setErr((e as FuramError).message ?? t("mob.common.failed"));
          }
        },
      },
    ]);
  }

  const rows = data?.budgets ?? [];

  return (
    <View style={s.root}>
      <Header title={t("mob.budget.title")} subtitle={data?.period} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.lead}>{t("mob.budget.lead")}</Text>

        <TariffNotice feature="money" />

        {loading && !data ? <Skeleton rows={3} /> : null}
        {error && !data ? <ErrorBox message={error} onRetry={reload} /> : null}
        {err ? <Notice tone="danger">{err}</Notice> : null}

        {data && rows.length === 0 ? (
          <Empty icon="wallet" title={t("mob.budget.empty")} text={t("mob.budget.emptyHint")} />
        ) : null}

        <View style={{ gap: 8 }}>
          {rows.map((b) => {
            const tone = b.state ? (LEVEL[b.state.level] ?? color.mutedForeground) : color.mutedForeground;
            return (
              <Pressable
                key={b.id}
                onLongPress={() => remove(b)}
                style={({ pressed }) => [s.card, pressed && { opacity: 0.9 }]}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={s.name} numberOfLines={1}>
                    {b.category ? budgetCategoryLabel(b.category) : t("mob.fin.allCats")}
                    {b.plate ? ` · ${b.plate}` : ""}
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Text style={s.period}>{b.period}</Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 8 }}>
                  <Text style={[s.spent, { color: tone }]}>
                    {b.state ? fmt(b.state.spent) : "0"}
                  </Text>
                  <Text style={s.limit}>
                    / {fmt(b.amount)} {b.currency}
                  </Text>
                  {b.state ? <Text style={[s.pct, { color: tone }]}>{b.state.pct}%</Text> : null}
                </View>

                {/* Eng kami 2% ko'rinadi: noldagi chiziq umuman
                    ko'rinmasa, karta buzilgandek tuyulardi */}
                <View style={s.bar}>
                  <View
                    style={[
                      s.barFill,
                      { width: `${Math.max(2, Math.min(100, b.state?.pct ?? 0))}%`, backgroundColor: tone },
                    ]}
                  />
                </View>

                {b.state ? (
                  <Text style={s.left}>
                    {b.state.left >= 0
                      ? t("mob.budget.left", { n: fmt(b.state.left), cur: b.currency })
                      : t("mob.budget.over", { n: fmt(-b.state.left), cur: b.currency })}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Text style={s.hint}>{t("mob.budget.delHint")}</Text>

        <Button
          title={t("mob.budget.add")}
          variant="secondary"
          onPress={() => setOpen(true)}
          icon={<Icon name="plus" size={18} stroke={color.foreground} />}
        />
      </ScrollView>

      <Sheet open={open} onClose={() => setOpen(false)} title={t("mob.budget.add")}>
        <Field
          label={t("mob.budget.period")}
          hint={t("mob.drv.periodPh")}
          value={period}
          onChangeText={setPeriod}
          maxLength={7}
        />

        <Text style={[s.label, { marginTop: space.md }]}>{t("mob.svcRec.unit")}</Text>
        <View style={s.chips}>
          <Pressable
            onPress={() => setCategory(null)}
            style={[s.chip, category === null && s.chipOn]}
          >
            <Text style={[s.chipText, category === null && { color: "#fff" }]}>
              {t("mob.fin.allCats")}
            </Text>
          </Pressable>
          {CATS.map((c) => (
            <Pressable key={c} onPress={() => setCategory(c)} style={[s.chip, category === c && s.chipOn]}>
              <Text style={[s.chipText, category === c && { color: "#fff" }]}>
                {budgetCategoryLabel(c)}
              </Text>
            </Pressable>
          ))}
        </View>

        {(park.data?.items ?? []).length > 0 ? (
          <>
            <Text style={[s.label, { marginTop: space.md }]}>{t("mob.park.title")}</Text>
            <View style={s.chips}>
              <Pressable
                onPress={() => setVehicleId(null)}
                style={[s.chip, vehicleId === null && s.chipOn]}
              >
                <Text style={[s.chipText, vehicleId === null && { color: "#fff" }]}>
                  {t("mob.common.all")}
                </Text>
              </Pressable>
              {(park.data?.items ?? []).map((v) => (
                <Pressable
                  key={v.id}
                  onPress={() => setVehicleId(v.id)}
                  style={[s.chip, vehicleId === v.id && s.chipOn]}
                >
                  <Text style={[s.chipText, vehicleId === v.id && { color: "#fff" }]}>{v.plate}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <View style={{ marginTop: space.md }}>
          <Field
            label={t("mob.budget.amount")}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0"
          />
        </View>
        <View style={[s.chips, { marginTop: 8 }]}>
          {CURRENCIES.map((c) => (
            <Pressable key={c} onPress={() => setCurrency(c)} style={[s.chip, currency === c && s.chipOn]}>
              <Text style={[s.chipText, currency === c && { color: "#fff" }]}>{c}</Text>
            </Pressable>
          ))}
        </View>

        {err ? <Notice tone="danger">{err}</Notice> : null}

        <View style={{ marginTop: space.md }}>
          <Button title={t("mob.common.save")} onPress={save} loading={busy} disabled={!ready} />
        </View>
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },
  lead: { fontSize: 13, color: color.mutedForeground, lineHeight: 19 },
  hint: { fontSize: 11.5, color: color.mutedForeground, textAlign: "center" },

  card: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.md,
    ...shadow.card,
  },
  name: { fontSize: 14, fontWeight: "700", color: color.foreground, flexShrink: 1 },
  period: { fontSize: 11.5, fontWeight: "700", color: color.mutedForeground },
  spent: { fontSize: 20, fontWeight: "800", fontVariant: ["tabular-nums"] },
  limit: { fontSize: 13, color: color.mutedForeground, fontVariant: ["tabular-nums"] },
  pct: { fontSize: 13, fontWeight: "800", marginLeft: "auto" },
  bar: { height: 7, borderRadius: 4, backgroundColor: color.muted, marginTop: 10, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  left: { fontSize: 12, color: color.mutedForeground, marginTop: 7 },

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
