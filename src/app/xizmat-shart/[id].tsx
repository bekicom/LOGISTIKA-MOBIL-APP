/**
 * X3 — servis buyurtmasi shartlari (oferta).
 *
 * ── NEGA ALOHIDA HUJJAT ─────────────────────────────────────────
 *
 * Taklifdagi narx — «shuncha bo'lsa kerak». Oferta esa KELISHUV:
 * nima ish qilinadi, qancha turadi, qachon to'lanadi va kafolat
 * qancha. Usta yozadi, mijoz rozilik beradi va shundan keyin
 * ikkalasi ham bir xil matnga qaraydi.
 *
 * ── O'ZGARISH — QAYTA ROZILIK ───────────────────────────────────
 *
 * Yangi versiya kelsa NIMA O'ZGARGANI yoziladi (`diff`), butun
 * matn qayta o'qitilmaydi. Aks holda bitta harf almashtirilib
 * qayta rozilik olinardi.
 */
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { Button, Field, Header, Notice } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

const CURRENCIES = ["UZS", "USD", "KZT", "RUB"];

type Terms = {
  no: number;
  price: number;
  currency: string;
  payTerm: string;
  work: string | null;
  workHours: number | null;
  warrantyMonths: number | null;
  warrantyKm: number | null;
  note: string | null;
  createdAt: string;
};
type Consent = { userId: string; name: string; me: boolean; approved: boolean | null };
type Feed = {
  iAmClient: boolean;
  iAmMaster: boolean;
  canOffer: boolean;
  hasMaster: boolean;
  contract: {
    number: string;
    status: string;
    stage: string;
    current: Terms | null;
    pending: Terms | null;
    diff: string[];
    consent: Consent[];
  } | null;
};

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(n);

export default function XizmatShart() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data, loading, error, refreshing, refresh, reload } = useApi<Feed>(
    id ? `/api/service/${id}/terms` : null,
    [id],
  );

  const [open, setOpen] = useState(false);
  const [work, setWork] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("UZS");
  const [payTerm, setPayTerm] = useState("");
  const [hours, setHours] = useState("");
  const [wMonths, setWMonths] = useState("");
  const [wKm, setWKm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const num = (v: string) => {
    const n = Number(v.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const value = num(price);
  const ready = work.trim().length >= 3 && value != null && payTerm.trim().length >= 2;

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/service/${id}/terms`, { method: "POST", body });
      setOpen(false);
      reload();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  const c = data?.contract ?? null;
  /* Mendan javob kutilyaptimi — serverning `stage` qarori */
  const waitsMe = c?.stage === "WAIT_ME" || c?.stage === "CHANGE_WAIT_ME";

  return (
    <View style={s.root}>
      <Header title={t("mob.terms.title")} subtitle={c?.number} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.lead}>{t("mob.terms.lead")}</Text>

        {loading && !data ? <Skeleton rows={3} /> : null}
        {error && !data ? <ErrorBox message={error} onRetry={reload} /> : null}
        {err ? <Notice tone="danger">{err}</Notice> : null}

        {data && !c ? (
          <Empty
            icon="doc"
            title={t("mob.terms.none")}
            text={data.canOffer ? t("mob.terms.noneMaster") : t("mob.terms.noneClient")}
          />
        ) : null}

        {c?.current ? <TermsCard label={t("mob.terms.current")} v={c.current} /> : null}

        {/* Yangi taklif — nima o'zgargani bilan */}
        {c?.pending ? (
          <View style={[s.card, { borderWidth: 1.5, borderColor: color.warning + "66" }]}>
            <Text style={s.group}>{t("mob.terms.pending")}</Text>
            {c.diff.length > 0 ? (
              <Text style={s.changed}>
                {t("mob.terms.changed", {
                  f: c.diff.map((d) => t(`mob.terms.f_${d}`)).join(", "),
                })}
              </Text>
            ) : null}
            <Rows v={c.pending} />
          </View>
        ) : null}

        {/* Kim rozi */}
        {c && c.consent.length > 0 ? (
          <View style={s.card}>
            <Text style={s.group}>{t("mob.terms.consent")}</Text>
            <View style={{ gap: 9, marginTop: 8 }}>
              {c.consent.map((x) => (
                <View key={x.userId} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Icon
                    name={x.approved ? "check" : "clock"}
                    size={16}
                    stroke={x.approved ? color.success : color.warning}
                  />
                  <Text style={s.name} numberOfLines={1}>
                    {x.name}
                    {x.me ? ` · ${t("mob.tpart.you")}` : ""}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Amallar */}
        {waitsMe ? (
          <Button
            title={t("mob.terms.agree")}
            loading={busy}
            onPress={() => post({ action: "consent" })}
            icon={<Icon name="check" size={18} stroke="#fff" />}
          />
        ) : null}

        {data?.canOffer ? (
          <Button
            title={c?.current ? t("mob.terms.change") : t("mob.terms.offer")}
            variant="secondary"
            onPress={() => setOpen(true)}
            icon={<Icon name="doc" size={18} stroke={color.foreground} />}
          />
        ) : null}
      </ScrollView>

      <Sheet open={open} onClose={() => setOpen(false)} title={t("mob.terms.offer")}>
        <View style={{ gap: space.md }}>
          <Field
            label={t("mob.terms.work")}
            placeholder={t("mob.terms.workPh")}
            value={work}
            onChangeText={setWork}
            multiline
            maxLength={500}
          />
          <Field
            label={t("mob.money.amount")}
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            placeholder="0"
          />
          <View style={s.chips}>
            {CURRENCIES.map((x) => (
              <Pressable key={x} onPress={() => setCurrency(x)} style={[s.chip, currency === x && s.chipOn]}>
                <Text style={[s.chipText, currency === x && { color: "#fff" }]}>{x}</Text>
              </Pressable>
            ))}
          </View>
          <Field
            label={t("mob.terms.payTerm")}
            placeholder={t("mob.terms.payTermPh")}
            value={payTerm}
            onChangeText={setPayTerm}
            maxLength={40}
          />
          <View style={{ flexDirection: "row", gap: 9 }}>
            <View style={{ flex: 1 }}>
              <Field
                label={t("mob.terms.hours")}
                value={hours}
                onChangeText={setHours}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label={t("mob.terms.wMonths")}
                value={wMonths}
                onChangeText={setWMonths}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label={t("mob.terms.wKm")}
                value={wKm}
                onChangeText={setWKm}
                keyboardType="numeric"
              />
            </View>
          </View>

          {err ? <Notice tone="danger">{err}</Notice> : null}

          <Button
            title={t("mob.common.save")}
            loading={busy}
            disabled={!ready}
            onPress={() =>
              post({
                action: "offer",
                work: work.trim(),
                price: value,
                currency,
                payTerm: payTerm.trim(),
                workHours: num(hours),
                warrantyMonths: num(wMonths),
                warrantyKm: num(wKm),
              })
            }
          />
        </View>
      </Sheet>
    </View>
  );
}

function TermsCard({ label, v }: { label: string; v: Terms }) {
  return (
    <View style={s.card}>
      <Text style={s.group}>{label}</Text>
      <Rows v={v} />
    </View>
  );
}

function Rows({ v }: { v: Terms }) {
  return (
    <View style={{ marginTop: 8, gap: 7 }}>
      <Text style={s.price}>
        {fmt(v.price)} {v.currency}
      </Text>
      {v.work ? <Text style={s.work}>{v.work}</Text> : null}
      <Line k={t("mob.terms.payTerm")} v={v.payTerm} />
      {v.workHours != null ? (
        <Line k={t("mob.terms.hours")} v={String(v.workHours)} />
      ) : null}
      {v.warrantyMonths != null || v.warrantyKm != null ? (
        <Line
          k={t("mob.svcOrder.warranty")}
          v={[
            v.warrantyMonths != null ? t("mob.terms.months", { n: v.warrantyMonths }) : null,
            v.warrantyKm != null ? `${fmt(v.warrantyKm)} km` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
      ) : null}
      {v.note ? <Text style={s.work}>{v.note}</Text> : null}
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

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },
  lead: { fontSize: 13, color: color.mutedForeground, lineHeight: 19 },

  card: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.lg,
    ...shadow.card,
  },
  group: { fontSize: 12, fontWeight: "800", color: color.mutedForeground, letterSpacing: 0.3 },
  changed: { fontSize: 12.5, fontWeight: "700", color: color.warning, marginTop: 6 },
  price: { fontSize: 21, fontWeight: "800", color: color.foreground, fontVariant: ["tabular-nums"] },
  work: { fontSize: 13.5, color: color.foreground, lineHeight: 20 },
  name: { flex: 1, fontSize: 14, fontWeight: "600", color: color.foreground },
  lineK: { fontSize: 12.5, color: color.mutedForeground },
  lineV: { flex: 1, fontSize: 12.5, fontWeight: "600", color: color.foreground, textAlign: "right" },

  chips: { flexDirection: "row", gap: 7 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: color.muted,
  },
  chipOn: { backgroundColor: color.brand },
  chipText: { fontSize: 13, fontWeight: "700", color: color.mutedForeground },
}));
