/**
 * Sh3 — shartnoma to'lovlari.
 *
 * ── BIR TOMON AYTGANI DALIL EMAS ────────────────────────────────
 *
 * «To'ladim» degan gap bilan qarz yopilmaydi: ikkinchi tomon
 * «oldim» deyishi kerak (TZ 23-band). Aks holda kelishmovchilikda
 * platforma yolg'on tarafda qolardi.
 *
 * Ekranda shu ikki holat ALOHIDA rangda: tasdiqlangani yashil,
 * kutayotgani sariq. Va tasdiqlash tugmasi aynan shu qatorning
 * yonida — boshqa ekranda emas.
 *
 * ── QOLDIQ ASOSIY RAQAM ─────────────────────────────────────────
 *
 * Moliya bo'limidagi qoida shu yerda ham: «9 500 000» degan narx
 * 3 600 000 to'langan bo'lsa chalg'itadi.
 *
 * ── VALYUTA ARALASHSA — JIM TASHLAB KETILMAYDI ──────────────────
 *
 * `paymentSummary()` shartnoma valyutasidan boshqa to'lovni
 * qo'shmaydi (kurs manbasi yo'q). Buni aytmasak odam qoldiqni
 * xato deb o'ylardi.
 */
import { useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Header, Button, Field } from "@/components/ui";
import { Sheet } from "@/components/Sheet";
import { Icon } from "@/components/Icon";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { api, apiUpload, FuramError } from "@/lib/api";
import { openRemoteFile } from "@/lib/files";
import { pickPhotos, takePhoto, toUpload, type Photo } from "@/lib/photo";
import { afterSheet } from "@/lib/native-ui";
import { useApi } from "@/lib/use-api";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

/** `furam/src/app/api/contracts/[id]/payments/route.ts:KINDS` */
const PAY_KINDS = ["ADVANCE", "PARTIAL", "FINAL"];
/** `furam/src/lib/contract-pay.ts:PAY_METHODS` */
const PAY_METHODS = ["CASH", "BANK", "CARD", "OTHER"];
const CURRENCIES = ["USD", "UZS", "KZT", "RUB"];

type Payment = {
  id: string;
  kind: string;
  method: string | null;
  amount: number;
  currency: string;
  note: string | null;
  hasProof: boolean;
  confirmed: boolean;
  mine: boolean;
  byName: string | null;
  paidAt: string | null;
};

type Detail = {
  label: string;
  current: { price: number; currency: string } | null;
  payments: Payment[];
  pay: {
    confirmed: number;
    claimed: number;
    remaining: number;
    currency: string;
    status: string;
    mixedCurrency: boolean;
  } | null;
};

export default function Tolovlar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState<string | null>(null);

  const { data, loading, error, refreshing, refresh, reload } = useApi<Detail>(
    `/api/contracts/${id}`,
    [id],
  );

  async function confirm(payId: string) {
    setBusy(payId);
    try {
      await api(`/api/contracts/${id}/payments/${payId}`, { method: "PATCH" });
      reload();
    } catch (e) {
      Alert.alert(t("mob.ctr.payments"), (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  /* «To'ladim» oynasi */
  const [add, setAdd] = useState(false);
  const [kind, setKind] = useState("PARTIAL");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [method, setMethod] = useState("BANK");
  const [proof, setProof] = useState<Photo | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const payValue = Number(amount.replace(/\s/g, "").replace(",", "."));
  const payReady = Number.isFinite(payValue) && payValue > 0;

  /* ⚠️ iOS varaq USTIDAN tizim tanlagichini ocholmaydi */
  function pickProof() {
    void afterSheet(
      () => setAdd(false),
      async () => {
        const r = (await takePhoto())[0] ?? (await pickPhotos(1))[0] ?? null;
        if (r) setProof(r);
        setAdd(true);
      },
    );
  }

  async function declare() {
    setSaving(true);
    setErr(null);
    try {
      await apiUpload(
        `/api/contracts/${id}/payments`,
        { kind, amount: payValue, currency, method },
        proof ? [toUpload(proof, "proof")] : [],
      );
      setAdd(false);
      setAmount("");
      setProof(null);
      reload();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setSaving(false);
    }
  }

  const pay = data?.pay ?? null;
  const price = data?.current?.price ?? 0;
  const list = data?.payments ?? [];
  /* Mendan tasdiq kutayotganlar — o'zim aytganim o'zimni kutmaydi */
  const waiting = list.filter((p) => !p.confirmed && !p.mine);

  const okPct = price > 0 && pay ? Math.min(100, (pay.confirmed / price) * 100) : 0;
  const waitPct = price > 0 && pay ? Math.min(100 - okPct, (pay.claimed / price) * 100) : 0;

  return (
    <View style={s.root}>
      <Header title={t("mob.ctr.payments")} subtitle={data?.label} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {loading && !data ? (
          <Skeleton rows={3} />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : !pay ? (
          <Empty icon="doc" title={t("mob.ctr.noTermsTitle")} text={t("mob.ctr.noTermsHint")} />
        ) : (
          <>
            {/* ══ QOLDIQ ══ */}
            <View style={s.hero}>
              <Text style={s.heroKey}>{t("mob.ctr.remaining")}</Text>
              <Text style={s.heroBig}>
                {fmtNum(pay.remaining)} <Text style={s.heroCur}>{pay.currency}</Text>
              </Text>

              <View style={s.track}>
                <View style={[s.trackOk, { width: `${okPct}%` }]} />
                <View style={[s.trackWait, { width: `${waitPct}%` }]} />
              </View>

              <View style={s.legend}>
                <View style={s.dot} />
                <Text style={s.legendText}>
                  {t("mob.ctr.confirmedSum", { sum: fmtNum(pay.confirmed) })}
                </Text>
              </View>
              {pay.claimed > 0 && (
                <View style={s.legend}>
                  <View style={[s.dot, { backgroundColor: "#e0a33abf" }]} />
                  <Text style={s.legendText}>
                    {t("mob.ctr.claimedSum", { sum: fmtNum(pay.claimed) })}
                  </Text>
                </View>
              )}
            </View>

            {/* ══ SIZDAN KUTILADIGAN QADAM ══ */}
            {waiting.map((p) => (
              <View key={p.id} style={[s.card, s.cardHot]}>
                <View style={[s.tag, { backgroundColor: color.brand + "1f" }]}>
                  <Text style={[s.tagText, { color: color.brandText }]}>
                    {t("mob.ctr.waitYourOk")}
                  </Text>
                </View>

                <View style={s.hotRow}>
                  <Text style={s.hotSum}>
                    {fmtNum(p.amount)} <Text style={s.hotCur}>{p.currency}</Text>
                  </Text>
                  <Text style={s.hotMeta}>
                    {[t(`contractPayKind.${p.kind}`), p.method ? t(`payMethod.${p.method}`) : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>

                {/* Tasdiqlagach qaytarib bo'lmaydi — shuni aytamiz */}
                <Text style={s.hotNote}>
                  {t("mob.ctr.claimedBy", { name: p.byName ?? t("mob.ctr.unknownParty") })}
                </Text>

                {/* ⚠️ Dalil BOSILADI (2026-09-06): ilgari u shunchaki
                    yozuv edi va chekni ilovada ko'rib bo'lmasdi.
                    `openRemoteFile` — oddiy havola `Authorization`
                    sarlavhasisiz boradi va 401 oladi. */}
                {p.hasProof && (
                  <Pressable
                    onPress={() =>
                      void openRemoteFile(
                        `/api/contracts/${id}/payments/${p.id}/proof`,
                        `chek-${p.id.slice(-6)}`,
                      )
                    }
                    style={({ pressed }) => [s.proof, pressed && { opacity: 0.75 }]}
                  >
                    <Icon name="doc" size={16} stroke={color.brand} />
                    <Text style={[s.proofText, { color: color.brand, fontWeight: "600" }]}>
                      {t("mob.cpay.viewProof")}
                    </Text>
                  </Pressable>
                )}

                <View style={{ marginTop: 12 }}>
                  <Button
                    title={t("mob.ctr.gotIt")}
                    loading={busy === p.id}
                    onPress={() => confirm(p.id)}
                  />
                </View>
              </View>
            ))}

            {/* ══ TARIX ══ */}
            {list.length > 0 && (
              <View>
                <Text style={s.group}>{t("mob.ctr.history")}</Text>
                <View style={[s.card, { padding: 0 }]}>
                  {list.map((p, i) => (
                    <View key={p.id} style={[s.row, i < list.length - 1 && s.rowLine]}>
                      <Icon
                        name={p.confirmed ? "check" : "clock"}
                        size={18}
                        stroke={p.confirmed ? color.success : color.warning}
                      />
                      <View style={{ flexGrow: 1, minWidth: 0 }}>
                        <Text style={s.rowSum}>
                          {fmtNum(p.amount)} {p.currency}
                        </Text>
                        <Text style={s.rowMeta} numberOfLines={1}>
                          {[
                            t(`contractPayKind.${p.kind}`),
                            p.method ? t(`payMethod.${p.method}`) : null,
                            p.paidAt ? new Date(p.paidAt).toLocaleDateString() : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </Text>
                      </View>
                      <Text
                        style={[
                          s.rowState,
                          { color: p.confirmed ? color.success : color.warning },
                        ]}
                      >
                        {t(p.confirmed ? "mob.ctr.stConfirmed" : "mob.ctr.stPending")}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {list.length === 0 && (
              <Empty icon="doc" title={t("mob.ctr.noPayTitle")} text={t("mob.ctr.noPayHint")} />
            )}

            {/* ══ VALYUTA ARALASHGANDA ══ */}
            {pay.mixedCurrency && (
              <View style={s.note}>
                <Icon name="alert" size={16} stroke={color.mutedForeground} />
                <Text style={s.noteText}>{t("mob.ctr.mixedPay")}</Text>
              </View>
            )}

            {/* «To'ladim» — chek surati bilan. Ilgari to'lovni
                faqat webda qayd qilib bo'lardi. */}
            <Button
              title={t("mob.cpay.proof")}
              variant="secondary"
              onPress={() => setAdd(true)}
              icon={<Icon name="plus" size={18} stroke={color.foreground} />}
            />
          </>
        )}
      </ScrollView>

      <Sheet open={add} onClose={() => setAdd(false)} title={t("mob.cpay.proof")}>
        <Text style={s.label}>{t("mob.money.kind")}</Text>
        <View style={s.chips}>
          {PAY_KINDS.map((k) => (
            <Pressable key={k} onPress={() => setKind(k)} style={[s.chip, kind === k && s.chipOn]}>
              <Text style={[s.chipText, kind === k && { color: "#fff" }]}>
                {t(`contractPayKind.${k}`)}
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

        <Text style={[s.label, { marginTop: space.md }]}>{t("mob.ctr.payTerm")}</Text>
        <View style={s.chips}>
          {PAY_METHODS.map((m) => (
            <Pressable
              key={m}
              onPress={() => setMethod(m)}
              style={[s.chip, method === m && s.chipOn]}
            >
              <Text style={[s.chipText, method === m && { color: "#fff" }]}>
                {t(`payMethod.${m}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ marginTop: space.md, gap: 9 }}>
          <Button
            title={proof ? t("mob.common.renew") : t("mob.cpay.addProof")}
            variant="secondary"
            onPress={pickProof}
            icon={<Icon name="image" size={17} stroke={color.foreground} />}
          />
          {err ? <Text style={s.err}>{err}</Text> : null}
          <Button
            title={t("mob.common.save")}
            onPress={declare}
            loading={saving}
            disabled={!payReady}
          />
        </View>
      </Sheet>
    </View>
  );
}

const s = themed(() => ({
  label: { fontSize: 12, fontWeight: "700", color: color.mutedForeground, marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: radius.pill, backgroundColor: color.muted,
  },
  chipOn: { backgroundColor: color.brand },
  chipText: { fontSize: 12.5, fontWeight: "700", color: color.mutedForeground },
  err: { fontSize: 12.5, color: color.danger },

  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.lg },
  group: {
    fontSize: 12,
    fontWeight: "600",
    color: color.mutedForeground,
    letterSpacing: 0.3,
    marginBottom: 7,
    marginLeft: 4,
  },

  hero: { backgroundColor: color.navy, borderRadius: radius.card, padding: 17 },
  heroKey: { fontSize: 12, color: "#f1f5f9a6", letterSpacing: 0.3 },
  heroBig: { fontSize: 30, fontWeight: "700", color: "#fff", letterSpacing: -0.8, marginTop: 7 },
  heroCur: { fontSize: 15, color: "#f1f5f999" },
  track: {
    flexDirection: "row",
    height: 7,
    borderRadius: 4,
    backgroundColor: "#ffffff1f",
    marginTop: 15,
    overflow: "hidden",
  },
  trackOk: { height: "100%", backgroundColor: "#4ade80" },
  trackWait: { height: "100%", backgroundColor: "#e0a33abf" },
  legend: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 2, backgroundColor: "#4ade80" },
  legendText: { fontSize: 12, color: "#f1f5f9cc" },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.md,
  },
  cardHot: { borderWidth: 2, borderColor: color.brand },

  tag: { alignSelf: "flex-start", height: 21, paddingHorizontal: 8, borderRadius: 6, justifyContent: "center" },
  tagText: { fontSize: 10, fontWeight: "700" },
  hotRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 11 },
  hotSum: { fontSize: 21, fontWeight: "700", color: color.foreground },
  hotCur: { fontSize: 13, color: color.mutedForeground },
  hotMeta: { fontSize: 12, color: color.mutedForeground },
  hotNote: { fontSize: 12.5, color: color.mutedForeground, marginTop: 4, lineHeight: 19 },
  proof: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 11,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: 9,
    backgroundColor: color.muted,
  },
  proofText: { flexGrow: 1, fontSize: 12.5, color: color.foreground },

  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: space.md },
  rowLine: { borderBottomWidth: 1, borderBottomColor: color.muted },
  rowSum: { fontSize: 14, fontWeight: "600", color: color.foreground },
  rowMeta: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },
  rowState: { fontSize: 11.5, fontWeight: "500" },

  note: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: color.mutedForeground + "12",
  },
  noteText: { flex: 1, fontSize: 12.5, color: color.mutedForeground, lineHeight: 19 },
}));
