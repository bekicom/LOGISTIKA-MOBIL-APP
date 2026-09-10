/**
 * D6 — egalik, vaqtincha berish va holat (TZ 03, 20-22, 36-band).
 *
 * ── UCHTASI BITTA EKRANDA, CHUNKI BITTA SAVOL ───────────────────
 *
 * «Bu mashina hozir kimda?» — sotildimi, vaqtincha berildimi, yoki
 * ta'mirda turibdimi. Uchalasi bir-birini almashtiradi, shuning
 * uchun yonma-yon turadi.
 *
 * ── HOLATLARNING HAMMASI QO'LDA QO'YILMAYDI ─────────────────────
 *
 * «Reysda» va hujjat holatlarini TIZIM qo'yadi. Ular tanlovda
 * ko'rsatilmaydi va sababi ochiq yoziladi — aks holda odam
 * reysdagi mashinani «bo'sh» deb belgilab, ikkinchi reysga berib
 * yuborardi.
 */
import { useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, View } from "react-native";
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
import { t } from "@/lib/i18n";

/** `furam/src/lib/vehicle-ownership.ts:MANUAL_STATUSES` */
const MANUAL = ["FREE", "REPAIR", "INACTIVE"];
const CURRENCIES = ["USD", "UZS", "KZT", "RUB"];

type Transfer = {
  id: string; status: string; toName: string; toFuramId: number;
  price: number | null; currency: string | null; createdAt: string;
};
type Loan = {
  id: string; toName: string; toFuramId: number;
  startAt: string; endAt: string | null; open: boolean;
};
type Feed = { status: string; onTrip: boolean; transfers: Transfer[]; loans: Loan[] };

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(n);
const day = (iso: string) => iso.slice(0, 10);
/** Bugungi sana — `lend` uchun boshlang'ich qiymat */
const today = () => new Date().toISOString().slice(0, 10);

export default function Egalik() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, loading, error, refreshing, refresh, reload } = useApi<Feed>(
    id ? `/api/fleet/vehicles/${id}/ownership` : null,
    [id],
  );

  const [sheet, setSheet] = useState<"transfer" | "lend" | null>(null);
  const [furamId, setFuramId] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [startAt, setStartAt] = useState(today());
  const [endAt, setEndAt] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const who = Number(furamId.trim());
  const ready = Number.isInteger(who) && who > 0;

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/fleet/vehicles/${id}/ownership`, { method: "POST", body });
      setSheet(null);
      setFuramId("");
      setPrice("");
      setNote("");
      reload();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  function archive() {
    Alert.alert(t("mob.own.archive"), t("mob.own.archiveQ"), [
      { text: t("mob.common.cancel"), style: "cancel" },
      {
        text: t("mob.own.archive"),
        style: "destructive",
        onPress: async () => {
          await post({ action: "status", status: "ARCHIVED" });
          router.back();
        },
      },
    ]);
  }

  const pending = data?.transfers.find((tr) => tr.status === "PENDING") ?? null;
  const openLoan = data?.loans.find((l) => l.open) ?? null;

  return (
    <View style={s.root}>
      <Header title={t("mob.own.title")} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.lead}>{t("mob.own.lead")}</Text>

        {loading && !data ? <Skeleton rows={3} /> : null}
        {error && !data ? <ErrorBox message={error} onRetry={reload} /> : null}
        {err ? <Notice tone="danger">{err}</Notice> : null}

        {data ? (
          <>
            {/* Holat */}
            <View style={s.card}>
              <Text style={s.cardTitle}>{t("mob.own.statusNow")}</Text>
              <Text style={s.statusNow}>{t(`vehStatus.${data.status}`)}</Text>

              {MANUAL.includes(data.status) || data.status === "ON_TRIP" ? (
                <>
                  <Text style={[s.label, { marginTop: space.md }]}>{t("mob.own.statusPick")}</Text>
                  <View style={s.chips}>
                    {MANUAL.map((st) => (
                      <Pressable
                        key={st}
                        disabled={data.onTrip}
                        onPress={() => post({ action: "status", status: st })}
                        style={[
                          s.chip,
                          data.status === st && s.chipOn,
                          data.onTrip && { opacity: 0.45 },
                        ]}
                      >
                        <Text style={[s.chipText, data.status === st && { color: "#fff" }]}>
                          {t(`vehStatus.${st}`)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}

              <Text style={s.hint}>{t("mob.own.statusAuto")}</Text>
            </View>

            {data.onTrip ? <Notice tone="warning">{t("mob.own.onTripBlock")}</Notice> : null}

            {/* Kutilayotgan o'tkazma */}
            {pending ? (
              <View style={[s.card, { borderWidth: 1.5, borderColor: color.warning + "55" }]}>
                <Text style={s.cardTitle}>{t("transferStatus.PENDING")}</Text>
                <Text style={s.person}>
                  {pending.toName} · FURAM-{pending.toFuramId}
                </Text>
                {pending.price ? (
                  <Text style={s.meta}>
                    {fmt(pending.price)} {pending.currency}
                  </Text>
                ) : null}
                <Pressable
                  onPress={() => post({ action: "cancel_transfer", transferId: pending.id })}
                  hitSlop={8}
                >
                  <Text style={s.linkDanger}>{t("mob.own.cancelReq")}</Text>
                </Pressable>
              </View>
            ) : null}

            {/* Ochiq vaqtincha berish */}
            {openLoan ? (
              <View style={[s.card, { borderWidth: 1.5, borderColor: color.info + "44" }]}>
                <Text style={s.cardTitle}>{t("mob.own.openLoan")}</Text>
                <Text style={s.person}>
                  {openLoan.toName} · FURAM-{openLoan.toFuramId}
                </Text>
                <Text style={s.meta}>
                  {day(openLoan.startAt)}
                  {openLoan.endAt ? ` — ${day(openLoan.endAt)}` : ""}
                </Text>
                <Pressable
                  onPress={() => post({ action: "end_loan", loanId: openLoan.id })}
                  hitSlop={8}
                >
                  <Text style={s.link}>{t("mob.own.endLoan")}</Text>
                </Pressable>
              </View>
            ) : null}

            {/* Amallar */}
            {!data.onTrip && !pending ? (
              <View style={{ gap: 9 }}>
                <Button
                  title={t("mob.own.transfer")}
                  variant="secondary"
                  onPress={() => setSheet("transfer")}
                  icon={<Icon name="handshake" size={18} stroke={color.foreground} />}
                />
                {!openLoan ? (
                  <Button
                    title={t("mob.own.lend")}
                    variant="secondary"
                    onPress={() => setSheet("lend")}
                    icon={<Icon name="clock" size={18} stroke={color.foreground} />}
                  />
                ) : null}
              </View>
            ) : null}

            {/* Tarix */}
            {data.transfers.length > 0 ? (
              <View>
                <Text style={s.group}>{t("mob.own.history")}</Text>
                <View style={{ gap: 8 }}>
                  {data.transfers.map((tr) => (
                    <View key={tr.id} style={s.row}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.name}>{tr.toName}</Text>
                        <Text style={s.meta}>
                          {t(`transferStatus.${tr.status}`)} · {day(tr.createdAt)}
                          {tr.price ? ` · ${fmt(tr.price)} ${tr.currency}` : ""}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {data.loans.length > 0 ? (
              <View>
                <Text style={s.group}>{t("mob.own.loans")}</Text>
                <View style={{ gap: 8 }}>
                  {data.loans.map((l) => (
                    <View key={l.id} style={s.row}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.name}>{l.toName}</Text>
                        <Text style={s.meta}>
                          {day(l.startAt)}
                          {l.endAt ? ` — ${day(l.endAt)}` : ""}
                          {l.open ? ` · ${t("mob.own.openLoan")}` : ""}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {data.transfers.length === 0 && data.loans.length === 0 ? (
              <Text style={s.hint}>{t("mob.own.empty")}</Text>
            ) : null}

            {!data.onTrip ? (
              <Pressable onPress={archive} hitSlop={8}>
                <Text style={s.linkDanger}>{t("mob.own.archive")}</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {/* O'tkazish */}
      <Sheet open={sheet === "transfer"} onClose={() => setSheet(null)} title={t("mob.own.transfer")}>
        <Text style={s.lead}>{t("mob.own.transferHint")}</Text>
        <View style={{ marginTop: space.md, gap: space.md }}>
          <Field
            label={t("mob.own.toFuramId")}
            hint={t("mob.tpart.furamIdHint")}
            value={furamId}
            onChangeText={setFuramId}
            keyboardType="number-pad"
            placeholder="10042"
            maxLength={9}
          />
          <Field
            label={t("mob.own.price")}
            value={price}
            onChangeText={setPrice}
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
            placeholder={t("mob.money.notePh")}
            value={note}
            onChangeText={setNote}
            maxLength={500}
          />
          {err ? <Notice tone="danger">{err}</Notice> : null}
          <Button
            title={t("mob.own.send")}
            loading={busy}
            disabled={!ready}
            onPress={() => {
              const p = Number(price.replace(/\s/g, "").replace(",", "."));
              post({
                action: "transfer",
                toFuramId: who,
                price: Number.isFinite(p) && p > 0 ? p : null,
                currency: Number.isFinite(p) && p > 0 ? currency : null,
                note: note.trim() || null,
              });
            }}
          />
        </View>
      </Sheet>

      {/* Vaqtincha berish */}
      <Sheet open={sheet === "lend"} onClose={() => setSheet(null)} title={t("mob.own.lend")}>
        <Text style={s.lead}>{t("mob.own.lendHint")}</Text>
        <View style={{ marginTop: space.md, gap: space.md }}>
          <Field
            label={t("mob.own.toFuramId")}
            hint={t("mob.tpart.furamIdHint")}
            value={furamId}
            onChangeText={setFuramId}
            keyboardType="number-pad"
            placeholder="10042"
            maxLength={9}
          />
          <Field
            label={t("mob.own.startAt")}
            value={startAt}
            onChangeText={setStartAt}
            placeholder="2026-09-10"
            maxLength={10}
          />
          <Field
            label={t("mob.own.endAt")}
            value={endAt}
            onChangeText={setEndAt}
            placeholder="2026-10-10"
            maxLength={10}
          />
          {err ? <Notice tone="danger">{err}</Notice> : null}
          <Button
            title={t("mob.own.send")}
            loading={busy}
            disabled={!ready || startAt.length < 10}
            onPress={() =>
              post({
                action: "lend",
                toFuramId: who,
                startAt,
                endAt: endAt.length >= 10 ? endAt : null,
                note: note.trim() || null,
              })
            }
          />
        </View>
      </Sheet>
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
  cardTitle: { fontSize: 12, fontWeight: "800", color: color.mutedForeground, letterSpacing: 0.3 },
  statusNow: { fontSize: 20, fontWeight: "800", color: color.foreground, marginTop: 6 },
  hint: { fontSize: 11.5, color: color.mutedForeground, marginTop: 10, lineHeight: 17 },
  person: { fontSize: 15, fontWeight: "700", color: color.foreground, marginTop: 6 },
  meta: { fontSize: 12.5, color: color.mutedForeground, marginTop: 3 },
  link: { fontSize: 13, fontWeight: "700", color: color.brand, marginTop: 12 },
  linkDanger: { fontSize: 13, fontWeight: "700", color: color.danger, marginTop: 12 },

  group: {
    fontSize: 12,
    fontWeight: "700",
    color: color.mutedForeground,
    letterSpacing: 0.4,
    marginBottom: 8,
    marginLeft: 4,
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
  name: { fontSize: 14, fontWeight: "700", color: color.foreground },

  label: { fontSize: 12, fontWeight: "700", color: color.mutedForeground, marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: color.muted,
  },
  chipOn: { backgroundColor: color.brand },
  chipText: { fontSize: 13, fontWeight: "700", color: color.mutedForeground },
}));
