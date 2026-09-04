/**
 * Sh2 — shartnoma va muzokara.
 *
 * ── VERSIYA EMAS, O'ZGARISH ─────────────────────────────────────
 *
 * «V2» degan yozuv odamga hech nima aytmaydi: u eski shartni
 * eslab turmaydi. Har taklif yonida OLDINGISIDAN NIMA FARQ
 * QILGANI yoziladi — narx ko'tarildimi, sana surildimi.
 *
 * ── KIM KUTILAYOTGANI — RAQAM EMAS, ODAM ────────────────────────
 *
 * «1/2 tasdiqladi» kimni kutayotganini aytmaydi. Tomonlar ro'yxati
 * bilan ko'rsatiladi va o'zim alohida belgilanaman.
 *
 * ── BEKOR QILISH SABABI REYTINGGA TEGADIMI ──────────────────────
 *
 * `BLAMELESS_CANCELS` — chegara yopilishi yoki mashina buzilishi
 * odamning aybi emas. Buni yashirsak odam eng «xavfsiz» ko'ringan
 * sababni tanlab, ro'yxatni ma'nosiz qilardi.
 */
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Field, Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, radius, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Party = {
  role: string;
  me: boolean;
  name: string | null;
  furamId: number | null;
  approved: boolean;
  rejected: boolean;
};

type Version = {
  no: number;
  price: number;
  currency: string;
  note: string | null;
  at: string;
  byMe: boolean;
  byName: string | null;
  changed: { field: string; dir?: "up" | "down" }[];
};

type Detail = {
  id: string;
  label: string;
  status: string;
  myRole: string;
  load: { title: string; weightT: number | null; from: string | null; to: string | null } | null;
  trip: { furamNo: number } | null;
  parties: Party[];
  approvals: { approved: number; total: number; allApproved: boolean };
  canDecide: boolean;
  canAnswerChange: boolean;
  pendingChange: {
    price: number;
    currency: string;
    paymentTerm: string;
    reason: string | null;
    byMe: boolean;
    byName: string | null;
    changed: { field: string; dir?: "up" | "down" }[];
  } | null;
  current: {
    no: number;
    price: number;
    currency: string;
    paymentTerm: string;
    dispatcherFee: number | null;
    dispatcherFeeCurrency: string | null;
    specialTerms: string | null;
    share: { amount: number; currency: string } | null;
  } | null;
  versions: Version[];
  pay: { confirmed: number; remaining: number; currency: string; status: string } | null;
  cancel: { blameless: string[]; windowDays: number; freeLimit: number; used: number };
};

/** `furam/src/lib/contract.ts:REJECT_REASONS` */
const REJECT = ["PRICE", "DATE", "VEHICLE", "DOCS", "ROUTE", "OTHER"];
/** `CANCEL_REASONS` */
const CANCEL = ["LOAD_CANCELLED", "VEHICLE_BROKEN", "BORDER", "DOCS", "AGREED", "FORCE_MAJEURE", "OTHER"];

export default function Shartnoma() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [sheet, setSheet] = useState<"reject" | "cancel" | "counter" | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data, loading, error, refreshing, refresh, reload } = useApi<Detail>(
    `/api/contracts/${id}`,
    [id],
  );

  async function decide(body: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/contracts/${id}`, { method: "PATCH", body });
      setSheet(null);
      reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const c = data;

  return (
    <View style={s.root}>
      <Header
        title={c?.label ?? t("mob.ctr.one")}
        subtitle={c ? t(`contractStatus.${c.status}`) : undefined}
      />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {loading && !c ? (
          <Skeleton rows={4} />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : !c ? null : (
          <>
            {!!err && (
              <View style={s.errBox}>
                <Text style={s.errText}>{err}</Text>
              </View>
            )}

            {/* ══ KIM TASDIQLADI ══ */}
            <View style={[s.card, { padding: 0 }]}>
              {c.parties.map((p, i) => (
                <View
                  key={`${p.role}-${i}`}
                  style={[s.party, i < c.parties.length - 1 && s.partyLine]}
                >
                  <Icon
                    name={p.approved ? "check" : p.rejected ? "close" : "clock"}
                    size={18}
                    stroke={p.approved ? color.success : p.rejected ? color.danger : color.brand}
                  />
                  <View style={{ flexGrow: 1, minWidth: 0 }}>
                    <Text style={s.partyName}>
                      {p.me ? t("mob.ctr.you") : (p.name ?? t("mob.ctr.unknownParty"))}
                    </Text>
                    <Text
                      style={[
                        s.partyMeta,
                        !p.approved && !p.rejected && p.me && { color: color.brand },
                      ]}
                    >
                      {t(`contractRole.${p.role}`)} ·{" "}
                      {p.approved
                        ? t("mob.ctr.stApproved")
                        : p.rejected
                          ? t("mob.ctr.stRejected")
                          : p.me
                            ? t("mob.ctr.stYouWait")
                            : t("mob.ctr.stWaiting")}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* ══ AMALDAGI SHART ══ */}
            {c.current && (
              <View>
                <Text style={s.group}>{t("mob.ctr.terms")}</Text>
                <View style={[s.card, { padding: 0 }]}>
                  <Row k={t("mob.ctr.price")} v={`${fmtNum(c.current.price)} ${c.current.currency}`} />
                  <Row k={t("mob.ctr.payTerm")} v={c.current.paymentTerm} />
                  {c.current.dispatcherFee != null && (
                    <Row
                      k={t("mob.ctr.dispFee")}
                      v={`${fmtNum(c.current.dispatcherFee)} ${c.current.dispatcherFeeCurrency ?? c.current.currency}`}
                    />
                  )}
                  {c.load?.from && c.load?.to && (
                    <Row k={t("mob.ctr.route")} v={`${c.load.from} → ${c.load.to}`} />
                  )}

                  {/* SIZGA QOLADIGAN SUMMA. Dispetcher haqi alohida
                      qatorda turgani yetarli emas — odam ayirishni
                      o'zi qilishi kerak bo'lardi. */}
                  {c.myRole === "CARRIER" && c.current.share && (
                    <View style={s.shareRow}>
                      <Text style={s.shareKey}>{t("mob.ctr.yourShare")}</Text>
                      <Text style={s.shareVal}>
                        {fmtNum(c.current.share.amount)} {c.current.share.currency}
                      </Text>
                    </View>
                  )}
                  {/* Valyuta har xil bo'lsa ayirilmaydi — kurs
                      manbasi yo'q va taxminiy hisob pulda yaramaydi */}
                  {c.myRole === "CARRIER" && !c.current.share && c.current.dispatcherFee != null && (
                    <View style={s.shareRow}>
                      <Text style={s.mixNote}>{t("mob.ctr.mixedFee")}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* ══ MUZOKARA ══ */}
            {c.versions.length > 1 && (
              <View>
                <Text style={s.group}>{t("mob.ctr.chain")}</Text>
                <View style={s.card}>
                  {c.versions.map((v, i) => (
                    <View key={v.no} style={s.stepRow}>
                      <View style={s.stepRail}>
                        <View
                          style={[s.dot, { backgroundColor: i === 0 ? color.brand : "#cbd5e1" }]}
                        />
                        {i < c.versions.length - 1 && <View style={s.line} />}
                      </View>
                      <View style={{ flexGrow: 1, minWidth: 0, paddingBottom: i < c.versions.length - 1 ? 15 : 0 }}>
                        <Text style={s.stepTitle}>
                          {t(v.byMe ? "mob.ctr.youOffered" : "mob.ctr.theyOffered", {
                            name: v.byName ?? "",
                            sum: `${fmtNum(v.price)} ${v.currency}`,
                          })}
                        </Text>
                        {/* NIMA O'ZGARGANI — «V2» dan foydaliroq */}
                        {v.changed.length > 0 && (
                          <Text style={s.stepDiff}>
                            {v.changed
                              .map((ch) =>
                                ch.field === "price"
                                  ? t(ch.dir === "up" ? "mob.ctr.dPriceUp" : "mob.ctr.dPriceDown")
                                  : t(`mob.ctrDiff.${ch.field}`),
                              )
                              .join(" · ")}
                          </Text>
                        )}
                        {!!v.note && <Text style={s.stepNote}>«{v.note}»</Text>}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ══ TASDIQDAN KEYINGI O'ZGARTIRISH ══
                Bu boshqa qaror: rad etilsa shartnoma bekor
                BO'LMAYDI, eski shart kuchda qoladi. Shuni
                aytmasak odam qo'rqib qabul qilib yuborardi. */}
            {c.pendingChange && (
              <View style={[s.card, s.cardHot]}>
                <Text style={s.changeTitle}>
                  {t(c.pendingChange.byMe ? "mob.ctr.chgMine" : "mob.ctr.chgTheirs", {
                    name: c.pendingChange.byName ?? "",
                  })}
                </Text>
                <Text style={s.changeSum}>
                  {fmtNum(c.pendingChange.price)} {c.pendingChange.currency}
                </Text>
                {c.pendingChange.changed.length > 0 && (
                  <Text style={s.changeDiff}>
                    {c.pendingChange.changed
                      .map((ch) =>
                        ch.field === "price"
                          ? t(ch.dir === "up" ? "mob.ctr.dPriceUp" : "mob.ctr.dPriceDown")
                          : t(`mob.ctrDiff.${ch.field}`),
                      )
                      .join(" · ")}
                  </Text>
                )}
                {!!c.pendingChange.reason && (
                  <Text style={s.changeNote}>«{c.pendingChange.reason}»</Text>
                )}
                <Text style={s.changeSafe}>{t("mob.ctr.chgSafe")}</Text>

                {c.canAnswerChange ? (
                  <View style={{ gap: 9, marginTop: 12 }}>
                    <Button
                      title={t("mob.ctr.chgAccept")}
                      loading={busy}
                      onPress={() => decide({ action: "answer_change", accept: true })}
                    />
                    <Button
                      title={t("mob.ctr.chgDecline")}
                      variant="secondary"
                      onPress={() => decide({ action: "answer_change", accept: false })}
                    />
                  </View>
                ) : (
                  <Text style={s.changeWait}>{t("mob.ctr.chgWaiting")}</Text>
                )}
              </View>
            )}

            {/* ══ QAROR ══ */}
            {c.canDecide && (
              <View style={{ gap: 9 }}>
                <Button
                  title={t("mob.ctr.approve")}
                  loading={busy}
                  onPress={() => decide({ action: "approve" })}
                />
                <View style={{ flexDirection: "row", gap: 9 }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      title={t("mob.ctr.counter")}
                      variant="secondary"
                      onPress={() => setSheet("counter")}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Danger title={t("mob.ctr.reject")} onPress={() => setSheet("reject")} />
                  </View>
                </View>
              </View>
            )}

            {/* ══ TO'LOVLARGA ══ */}
            <Pressable
              style={s.card}
              onPress={() =>
                router.push({ pathname: "/shartnoma/[id]/tolovlar", params: { id: c.id } })
              }
            >
              <View style={s.linkRow}>
                <View style={[s.icon, { backgroundColor: color.foreground + "0f" }]}>
                  <Icon name="doc" size={20} stroke={color.foreground} />
                </View>
                <View style={{ flexGrow: 1, minWidth: 0 }}>
                  <Text style={s.linkTitle}>{t("mob.ctr.payments")}</Text>
                  <Text style={s.linkSub}>
                    {c.pay && c.current
                      ? t("mob.ctr.paidOf", {
                          a: fmtNum(c.pay.confirmed),
                          b: fmtNum(c.current.price),
                          cur: c.pay.currency,
                        })
                      : t("mob.ctr.noPayments")}
                  </Text>
                </View>
                <Icon name="chevron" size={17} stroke={color.mutedForeground} />
              </View>
            </Pressable>

            {/* ══ BEKOR QILISH ══ */}
            {!["CLOSED", "CANCELLED", "REJECTED"].includes(c.status) && (
              <Pressable onPress={() => setSheet("cancel")} style={s.cancelLink}>
                <Text style={s.cancelText}>{t("mob.ctr.cancelContract")}</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>

      <ReasonSheet
        open={sheet === "reject" || sheet === "cancel"}
        kind={sheet === "cancel" ? "cancel" : "reject"}
        blameless={c?.cancel.blameless ?? []}
        used={c?.cancel.used ?? 0}
        limit={c?.cancel.freeLimit ?? 3}
        windowDays={c?.cancel.windowDays ?? 90}
        busy={busy}
        onClose={() => setSheet(null)}
        onSend={(reason, note) =>
          decide({ action: sheet === "cancel" ? "cancel" : "reject", reason, note })
        }
      />

      <CounterSheet
        open={sheet === "counter"}
        current={c?.current ?? null}
        busy={busy}
        onClose={() => setSheet(null)}
        /* `counter` — muzokara davomidagi qarshi taklif.
           `change` esa TASDIQDAN KEYINGI o'zgartirish so'rovi va
           unga sabab majburiy; ikkisi aralashtirilmaydi. */
        onSend={(price, paymentTerm) =>
          decide({
            action: "counter",
            price,
            currency: c?.current?.currency ?? "UZS",
            paymentTerm,
          })
        }
      />
    </View>
  );
}

/**
 * Qizil tugma.
 *
 * `Button` da `danger` varianti yo'q — ataylab: ilovada
 * qaytarib bo'lmaydigan qadam kam va har biri o'z joyida
 * yoziladi. Umumiy variant qo'shilsa u tez orada oddiy
 * tugmalarga ham tarqab ketardi.
 */
function Danger({
  title,
  onPress,
  loading,
  disabled,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const off = disabled || loading;
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={({ pressed }) => [
        s.danger,
        pressed && { backgroundColor: color.danger + "14" },
        off && { opacity: 0.45 },
      ]}
    >
      <Text style={s.dangerText}>{title}</Text>
    </Pressable>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.r}>
      <Text style={s.rk}>{k}</Text>
      <Text style={s.rv}>{v}</Text>
    </View>
  );
}

/**
 * Sabab varag'i — rad etish va bekor qilish uchun bitta.
 *
 * Bekor qilishda har sabab yonida REYTINGGA TEGADIMI yoziladi va
 * chegaraga qancha qolgani ham. Odam «nega reytingim tushdi» degan
 * savol bilan qolmasin.
 */
function ReasonSheet({
  open,
  kind,
  blameless,
  used,
  limit,
  windowDays,
  busy,
  onClose,
  onSend,
}: {
  open: boolean;
  kind: "reject" | "cancel";
  blameless: string[];
  used: number;
  limit: number;
  windowDays: number;
  busy: boolean;
  onClose: () => void;
  onSend: (reason: string, note?: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const list = kind === "cancel" ? CANCEL : REJECT;

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.sheetBack}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[s.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <View style={s.grab} />
          <Text style={s.sheetTitle}>
            {t(kind === "cancel" ? "mob.ctr.cancelTitle" : "mob.ctr.rejectTitle")}
          </Text>
          <Text style={s.sheetSub}>
            {t(kind === "cancel" ? "mob.ctr.cancelSub" : "mob.ctr.rejectSub")}
          </Text>

          <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ gap: 8, paddingTop: 14 }}>
            {list.map((r) => {
              const on = reason === r;
              const free = blameless.includes(r);
              return (
                <Pressable key={r} style={[s.opt, on && s.optOn]} onPress={() => setReason(r)}>
                  <View style={[s.radio, on && s.radioOn]} />
                  <Text style={[s.optText, on && { fontWeight: "600" }]}>
                    {t(`${kind === "cancel" ? "cancelReason" : "rejectReason"}.${r}`)}
                  </Text>
                  {kind === "cancel" && (
                    <Text style={[s.optTag, { color: free ? color.success : color.warning }]}>
                      {t(free ? "mob.ctr.noPenalty" : "mob.ctr.penalty")}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {kind === "cancel" && (
            <View style={s.limitBox}>
              <Text style={s.limitText}>
                {t("mob.ctr.cancelLimit", { n: used, days: windowDays, limit })}
              </Text>
            </View>
          )}

          <View style={{ marginTop: 12 }}>
            <Field
              label={t("mob.ctr.note")}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={{ marginTop: 12 }}>
            <Danger
              title={t(kind === "cancel" ? "mob.ctr.cancelDo" : "mob.ctr.rejectDo")}
              loading={busy}
              disabled={!reason}
              onPress={() => reason && onSend(reason, note.trim() || undefined)}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Qarshi taklif — narx va to'lov sharti */
function CounterSheet({
  open,
  current,
  busy,
  onClose,
  onSend,
}: {
  open: boolean;
  current: Detail["current"];
  busy: boolean;
  onClose: () => void;
  onSend: (price: number, paymentTerm: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [price, setPrice] = useState("");
  const [term, setTerm] = useState("");

  const n = Number(price.replace(/\s/g, ""));
  const ok = Number.isFinite(n) && n > 0 && (term.trim() || current?.paymentTerm);

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.sheetBack}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[s.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <View style={s.grab} />
          <Text style={s.sheetTitle}>{t("mob.ctr.counter")}</Text>
          <Text style={s.sheetSub}>
            {current
              ? t("mob.ctr.nowIs", { sum: `${fmtNum(current.price)} ${current.currency}` })
              : ""}
          </Text>

          <View style={{ marginTop: 14, gap: 10 }}>
            <Field
              label={t("mob.ctr.newPrice")}
              value={price}
              onChangeText={setPrice}
              keyboardType="number-pad"
              placeholder={current ? String(current.price) : ""}
            />
            <Field
              label={t("mob.ctr.payTerm")}
              value={term}
              onChangeText={setTerm}
              placeholder={current?.paymentTerm ?? ""}
            />
          </View>

          <Text style={s.sheetNote}>{t("mob.ctr.counterNote")}</Text>

          <View style={{ marginTop: 12 }}>
            <Button
              title={t("mob.ctr.send")}
              loading={busy}
              disabled={!ok}
              onPress={() => onSend(n, term.trim() || current?.paymentTerm || "")}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
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

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.md,
  },

  cardHot: { borderWidth: 2, borderColor: color.brand },

  changeTitle: { fontSize: 14, fontWeight: "600", color: color.foreground },
  changeSum: { fontSize: 21, fontWeight: "700", color: color.foreground, marginTop: 6 },
  changeDiff: { fontSize: 12.5, color: color.brand, marginTop: 3 },
  changeNote: { fontSize: 12.5, color: color.mutedForeground, marginTop: 4, fontStyle: "italic" },
  changeSafe: { fontSize: 12.5, color: color.mutedForeground, marginTop: 9, lineHeight: 19 },
  changeWait: { fontSize: 13, color: color.mutedForeground, marginTop: 11 },

  errBox: {
    padding: space.md,
    borderRadius: radius.control,
    backgroundColor: color.danger + "14",
    borderWidth: 1,
    borderColor: color.danger + "3d",
  },
  errText: { fontSize: 13, color: color.danger },

  party: { flexDirection: "row", alignItems: "center", gap: 10, padding: space.md },
  partyLine: { borderBottomWidth: 1, borderBottomColor: color.muted },
  partyName: { fontSize: 13.5, fontWeight: "600", color: color.foreground },
  partyMeta: { fontSize: 11.5, color: color.mutedForeground, marginTop: 1 },

  r: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.muted,
  },
  rk: { fontSize: 13, color: color.mutedForeground },
  rv: { flexShrink: 1, fontSize: 13.5, fontWeight: "600", color: color.foreground, textAlign: "right" },
  shareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: space.md,
    backgroundColor: color.muted,
  },
  shareKey: { fontSize: 13, fontWeight: "600", color: color.foreground },
  shareVal: { fontSize: 16, fontWeight: "700", color: color.foreground },
  mixNote: { flex: 1, fontSize: 12, color: color.mutedForeground, lineHeight: 18 },

  stepRow: { flexDirection: "row", gap: 11 },
  stepRail: { width: 10, alignItems: "center" },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 4 },
  line: { flexGrow: 1, width: 1, backgroundColor: color.border, marginVertical: 3 },
  stepTitle: { fontSize: 13.5, fontWeight: "600", color: color.foreground },
  stepDiff: { fontSize: 12, color: color.brand, marginTop: 2 },
  stepNote: { fontSize: 12, color: color.mutedForeground, marginTop: 2, fontStyle: "italic" },

  linkRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  icon: { width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  linkTitle: { fontSize: 14, fontWeight: "600", color: color.foreground },
  linkSub: { fontSize: 12.5, color: color.mutedForeground, marginTop: 1 },

  cancelLink: { alignSelf: "center", paddingVertical: 10, paddingHorizontal: 16 },
  cancelText: { fontSize: 13.5, color: color.danger, fontWeight: "500" },

  sheetBack: { flex: 1, backgroundColor: "#0f172acc", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: color.card,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.lg,
    paddingTop: 8,
  },
  grab: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 19, fontWeight: "700", color: color.foreground, letterSpacing: -0.3 },
  sheetSub: { fontSize: 13, color: color.mutedForeground, marginTop: 4, lineHeight: 19 },
  sheetNote: { fontSize: 12, color: color.mutedForeground, marginTop: 11, lineHeight: 18 },

  opt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 11,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  optOn: { borderWidth: 2, borderColor: color.foreground },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#cbd5e1" },
  radioOn: { borderWidth: 6, borderColor: color.foreground },
  optText: { flexGrow: 1, fontSize: 14, color: color.foreground },
  optTag: { fontSize: 11, fontWeight: "600" },

  limitBox: {
    marginTop: 12,
    padding: 13,
    borderRadius: 11,
    backgroundColor: color.warning + "14",
  },
  limitText: { fontSize: 12.5, color: "#78350f", lineHeight: 19 },

  danger: {
    height: 46,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.danger + "59",
    backgroundColor: color.card,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerText: { fontSize: 14, fontWeight: "600", color: color.danger },
});
