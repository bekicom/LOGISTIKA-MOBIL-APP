/**
 * D4 — mashinaning texnik holati: nosozliklar va xarajatlar.
 *
 * ── NEGA IKKALASI BITTA EKRANDA ─────────────────────────────────
 *
 * «Tormoz shaqirlayapti» va «tormoz kolodkasiga 400 ming» — bitta
 * voqeaning ikki tomoni. Ular alohida ekranlarda tursa, xarajat
 * qaysi nosozlik uchun ekanini hech kim bog'lamaydi.
 *
 * ── OCHIQ MUAMMO TEPADA ─────────────────────────────────────────
 *
 * Server ro'yxatni holat bo'yicha saralab beradi: ochig'i birinchi.
 * Tuzatilganini pastga surish — «hammasi joyida» degan yolg'on
 * taassurot bermaslik uchun.
 *
 * ⚠️ Valyutalar QO'SHILMAYDI (qoida 2).
 */
import { useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { Button, Field, Header, Notice } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { api, apiUpload, FuramError } from "@/lib/api";
import { pickPhotos, takePhoto, toUpload, type Photo } from "@/lib/photo";
import { afterSheet } from "@/lib/native-ui";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

const CURRENCIES = ["UZS", "USD", "KZT", "RUB"];
/** `furam/src/lib/vehicle-units.ts:UNIT_LABELS` */
const UNITS = [
  "MOTOR", "GEARBOX", "AXLE", "BRAKES", "PADS", "DISCS", "TIRES", "BODY",
  "ELECTRICS", "BATTERY", "OIL", "FILTERS", "CHASSIS", "COOLING", "OTHER",
];

type Issue = {
  id: string; title: string; note: string | null; status: string;
  hasPhoto: boolean; tripNo: number | null; byName: string | null;
  createdAt: string; fixedAt: string | null; fixNote: string | null;
};
type Cost = {
  id: string; title: string; unit: string | null; amount: number;
  currency: string; odometer: number | null; tripNo: number | null; spentAt: string;
};
type Feed = {
  canWrite: boolean;
  issues: Issue[];
  costs: Cost[];
  totals: { currency: string; amount: number }[];
};

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(n);

export default function Texnik() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, loading, error, refreshing, refresh, reload } = useApi<Feed>(
    id ? `/api/fleet/vehicles/${id}/tech` : null,
    [id],
  );

  const [tab, setTab] = useState<"issues" | "costs">("issues");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("UZS");
  const [odometer, setOdometer] = useState("");
  const [unit, setUnit] = useState("OTHER");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const value = Number(amount.replace(/\s/g, "").replace(",", "."));
  const ready = title.trim().length > 0 && Number.isFinite(value) && value > 0;

  async function addCost() {
    setBusy(true);
    setErr(null);
    try {
      await apiUpload(
        `/api/fleet/vehicles/${id}/tech`,
        {
          kind: "cost",
          title: title.trim(),
          amount: value,
          currency,
          unit,
          odometer: odometer.trim() || undefined,
        },
        photo ? [toUpload(photo, "photo")] : [],
      );
      setOpen(false);
      setTitle("");
      setAmount("");
      setOdometer("");
      setPhoto(null);
      reload();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(issue: Issue, status: "OPEN" | "FIXED" | "IGNORED") {
    try {
      await api(`/api/fleet/issues/${issue.id}`, { method: "PATCH", body: { status } });
      reload();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    }
  }

  function askStatus(issue: Issue) {
    if (issue.status !== "OPEN") {
      Alert.alert(issue.title, undefined, [
        { text: t("mob.common.cancel"), style: "cancel" },
        { text: t("mob.tstate.reopen"), onPress: () => void setStatus(issue, "OPEN") },
      ]);
      return;
    }
    Alert.alert(issue.title, issue.note ?? undefined, [
      { text: t("mob.common.cancel"), style: "cancel" },
      { text: t("mob.tstate.markIgnored"), onPress: () => void setStatus(issue, "IGNORED") },
      { text: t("mob.tstate.markFixed"), onPress: () => void setStatus(issue, "FIXED") },
    ]);
  }

  function pick(from: "camera" | "gallery") {
    void afterSheet(
      () => setOpen(false),
      async () => {
        const r = from === "camera" ? await takePhoto() : await pickPhotos(1);
        if (r[0]) setPhoto(r[0]);
        setOpen(true);
      },
    );
  }

  const openCount = data?.issues.filter((i) => i.status === "OPEN").length ?? 0;

  return (
    <View style={s.root}>
      <Header title={t("mob.tstate.title")} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.lead}>{t("mob.tstate.lead")}</Text>

        {loading && !data ? <Skeleton rows={3} /> : null}
        {error && !data ? <ErrorBox message={error} onRetry={reload} /> : null}
        {err ? <Notice tone="danger">{err}</Notice> : null}

        {data ? (
          <View style={s.tabs}>
            <Pressable
              onPress={() => setTab("issues")}
              style={[s.tab, tab === "issues" && s.tabOn]}
            >
              <Text style={[s.tabText, tab === "issues" && s.tabTextOn]}>
                {t("mob.tstate.issues")}
                {openCount > 0 ? ` · ${openCount}` : ""}
              </Text>
            </Pressable>
            <Pressable onPress={() => setTab("costs")} style={[s.tab, tab === "costs" && s.tabOn]}>
              <Text style={[s.tabText, tab === "costs" && s.tabTextOn]}>
                {t("mob.tstate.costs")}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {data && tab === "issues" ? (
          data.issues.length === 0 ? (
            <Empty
              icon="wrench"
              title={t("mob.tstate.noIssues")}
              text={t("mob.tstate.noIssuesHint")}
            />
          ) : (
            <View style={{ gap: 8 }}>
              {data.issues.map((i) => {
                const on = i.status === "OPEN";
                return (
                  <Pressable
                    key={i.id}
                    onPress={() => askStatus(i)}
                    style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}
                  >
                    <View style={[s.icon, { backgroundColor: on ? color.warningSoft : color.muted }]}>
                      <Icon
                        name={on ? "alert" : i.status === "FIXED" ? "check" : "close"}
                        size={18}
                        stroke={on ? color.warning : i.status === "FIXED" ? color.success : color.mutedForeground}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.name}>{i.title}</Text>
                      <Text style={s.meta} numberOfLines={1}>
                        {t(`issueStatus.${i.status}`)}
                        {i.tripNo ? ` · FURAM #${i.tripNo}` : ""}
                        {i.byName ? ` · ${i.byName}` : ""}
                      </Text>
                      {i.note ? (
                        <Text style={s.note} numberOfLines={2}>
                          {i.note}
                        </Text>
                      ) : null}
                    </View>
                    {i.hasPhoto ? <Icon name="image" size={16} stroke="#cbd5e1" /> : null}
                  </Pressable>
                );
              })}
            </View>
          )
        ) : null}

        {data && tab === "costs" ? (
          <>
            {data.totals.length > 0 ? (
              <View style={s.totals}>
                {data.totals.map((x) => (
                  <Text key={x.currency} style={s.totalsValue}>
                    {fmt(x.amount)} {x.currency}
                  </Text>
                ))}
              </View>
            ) : null}

            {data.costs.length === 0 ? (
              <Empty icon="wallet" title={t("mob.tstate.noCosts")} />
            ) : (
              <View style={{ gap: 8 }}>
                {data.costs.map((c) => (
                  <View key={c.id} style={s.row}>
                    <View style={[s.icon, { backgroundColor: color.blueSoft }]}>
                      <Icon name="wrench" size={18} stroke={color.blue} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.name}>{c.title}</Text>
                      <Text style={s.meta} numberOfLines={1}>
                        {[
                          c.unit ? t(`vehUnit.${c.unit}`) : null,
                          c.odometer ? `${fmt(c.odometer)} km` : null,
                          c.spentAt.slice(0, 10),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </View>
                    <Text style={s.amount}>
                      {fmt(c.amount)} {c.currency}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <Button
              title={t("mob.tstate.costs")}
              variant="secondary"
              onPress={() => setOpen(true)}
              icon={<Icon name="plus" size={18} stroke={color.foreground} />}
            />
          </>
        ) : null}

        {data && tab === "issues" ? (
          <Button
            title={t("mob.trip.tech")}
            variant="secondary"
            onPress={() =>
              router.push({ pathname: "/parkim/[id]/nosozlik", params: { id: String(id) } })
            }
            icon={<Icon name="plus" size={18} stroke={color.foreground} />}
          />
        ) : null}
      </ScrollView>

      <Sheet open={open} onClose={() => setOpen(false)} title={t("mob.tstate.costs")}>
        <Field
          label={t("mob.svcRec.what")}
          value={title}
          onChangeText={setTitle}
          maxLength={120}
        />

        <View style={{ marginTop: space.md }}>
          <Field
            label={t("mob.svcRec.cost")}
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

        <Text style={[s.label, { marginTop: space.md }]}>{t("mob.svcRec.unit")}</Text>
        <View style={s.chips}>
          {UNITS.map((u) => (
            <Pressable key={u} onPress={() => setUnit(u)} style={[s.chip, unit === u && s.chipOn]}>
              <Text style={[s.chipText, unit === u && { color: "#fff" }]}>{t(`vehUnit.${u}`)}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ marginTop: space.md }}>
          <Field
            label={t("mob.svcRec.odometer")}
            value={odometer}
            onChangeText={setOdometer}
            keyboardType="numeric"
            placeholder="km"
          />
        </View>

        <View style={{ marginTop: space.md, gap: 9 }}>
          <Button
            title={photo ? t("mob.common.renew") : t("mob.tech.photo")}
            variant="secondary"
            onPress={() => pick(photo ? "gallery" : "camera")}
            icon={<Icon name="image" size={17} stroke={color.foreground} />}
          />
          <Button title={t("mob.common.save")} onPress={addCost} loading={busy} disabled={!ready} />
        </View>
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },
  lead: { fontSize: 13, color: color.mutedForeground, lineHeight: 19 },

  tabs: { flexDirection: "row", gap: 7 },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: radius.control,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  tabOn: { backgroundColor: color.foreground },
  tabText: { fontSize: 13.5, fontWeight: "700", color: color.mutedForeground },
  tabTextOn: { color: "#fff" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.md,
    ...shadow.card,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 14, fontWeight: "700", color: color.foreground },
  meta: { fontSize: 12, color: color.mutedForeground, marginTop: 2 },
  note: { fontSize: 12.5, color: color.mutedForeground, marginTop: 3, lineHeight: 18 },
  amount: { fontSize: 14, fontWeight: "800", color: color.foreground, fontVariant: ["tabular-nums"] },

  totals: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.lg,
    ...shadow.card,
  },
  totalsValue: {
    fontSize: 19,
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
});
