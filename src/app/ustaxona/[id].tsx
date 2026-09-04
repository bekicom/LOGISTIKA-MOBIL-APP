/**
 * U2 — servis buyurtmasi.
 *
 * ── QO'SHIMCHA ISH EKRANNING TEPASIDA ───────────────────────────
 *
 * Bu bo'limdagi eng nozik joy. Usta mashinani ochib «yana shu ham
 * buzuq» deydi. Agar so'rov ko'rinmay qolsa ikki yomon narsadan
 * biri bo'ladi: usta kutib turadi, yoki ruxsatsiz qilib qo'yadi va
 * keyin hisob-kitobda janjal chiqadi.
 *
 * Yakuniy summa DARHOL ko'rsatiladi — odam «rozi bo'lsam jami
 * qancha bo'ladi» deb hisoblab o'tirmasin. Hisob serverda
 * (`totalPrice`), bu yerda faqat chiziladi.
 *
 * ── TAKLIFLAR TEZLIK BO'YICHA ───────────────────────────────────
 *
 * Tartibni server beradi. Yo'lda qolganda birinchi savol narx
 * emas, «qachon yetib keladi» — har soat pul.
 */
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Linking,
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
import { useLocalSearchParams } from "expo-router";
import { Button, Field, Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { api, FuramError } from "@/lib/api";
import { servicePhoto } from "@/lib/img";
import { useApi } from "@/lib/use-api";
import { color, font, radius, space } from "@/lib/theme";
import { serviceSpecLabel, serviceStatusLabel, t } from "@/lib/i18n";

type Offer = {
  id: string;
  price: number;
  currency: string;
  arrivalMin: number | null;
  workHours: number | null;
  note: string | null;
  mine: boolean;
  master: { id: string; name: string; mobile: boolean; verified: boolean; done: number };
};

type Extra = {
  id: string;
  problem: string;
  work: string;
  price: number;
  currency: string;
  photoUrls: string[];
  approvedAt: string | null;
  rejectedAt: string | null;
};

type Order = {
  id: string;
  orderNo: number;
  status: string;
  problem: string;
  services: string[];
  photos: string[];
  needMobile: boolean;
  location: string | null;
  address: string | null;
  vehicle: { id: string | null; plate: string | null; title: string } | null;
  price: number | null;
  currency: string | null;
  /* `totalPrice()` shakli: qo'shimchasi boshqa valyutada bo'lsa
     `mixed` bilan aytiladi — jim qo'shib yuborilmaydi. */
  total: { total: number | null; pending: number; mixed: boolean };
  warranty: { text: string; expired: boolean; soon: boolean } | null;
  resultNote: string | null;
  master: { id: string; name: string; phone: string | null; verified: boolean; done: number } | null;
  client: { name: string; phone: string | null } | null;
};

type Viewer = { isClient: boolean; isMaster: boolean; hasOffered: boolean; myOfferId: string | null };

const TONE: Record<string, string> = {
  NEW: color.mutedForeground,
  SEARCHING: color.mutedForeground,
  OFFERED: color.warning,
  ASSIGNED: color.warning,
  IN_WORK: color.warning,
  EXTRA_NEEDED: color.danger,
  DONE: color.success,
  CANCELLED: color.mutedForeground,
};

export default function Buyurtma() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const { data, loading, error, refreshing, refresh, reload } = useApi<{
    order: Order;
    offers: Offer[];
    extras: Extra[];
    pendingExtra: Extra | null;
    viewer: Viewer;
  }>(id ? `/api/service/${id}` : null, [id]);

  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState("");
  /* Qo'shimcha ish so'rovi ALOHIDA EKRAN EMAS: usta buyurtmaga
     qarab turib yozadi, ekran almashsa kontekst yo'qoladi. */
  const [extraForm, setExtraForm] = useState(false);

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setFailed("");
    try {
      await api("/api/service", { method: "POST", body: { ...body, orderId: id } });
      reload();
      return true;
    } catch (e) {
      setFailed((e as FuramError).message ?? t("mob.common.failed"));
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) {
    return (
      <View style={s.root}>
        <Header title={t("mob.svc.order")} />
        <View style={{ padding: space.lg }}>
          <Skeleton rows={4} />
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={s.root}>
        <Header title={t("mob.svc.order")} />
        <View style={{ padding: space.lg }}>
          <ErrorBox message={error ?? t("mob.state.noData")} onRetry={reload} />
        </View>
      </View>
    );
  }

  const { order: o, offers, extras, pendingExtra, viewer } = data;
  const tone = TONE[o.status] ?? color.mutedForeground;

  return (
    <View style={s.root}>
      <Header
        title={`${t("mob.svc.order")} #${o.orderNo}`}
        subtitle={serviceStatusLabel(o.status)}
      />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {failed ? (
          <View style={s.failed}>
            <Text style={s.failedText}>{failed}</Text>
          </View>
        ) : null}

        {/* ══ QO'SHIMCHA ISH — EKRANNING TEPASIDA ══ */}
        {pendingExtra && viewer.isClient && (
          <View style={[s.card, s.extraCard]}>
            <View style={s.extraHead}>
              <Icon name="alert" size={17} stroke={color.danger} />
              <Text style={s.extraTitle}>{t("mob.svc.extraTitle")}</Text>
            </View>

            <Text style={s.extraLine}>
              <Text style={s.extraKey}>{t("mob.svc.extraFound")}: </Text>
              {pendingExtra.problem}
            </Text>
            <Text style={s.extraLine}>
              <Text style={s.extraKey}>{t("mob.svc.extraWork")}: </Text>
              {pendingExtra.work}
            </Text>

            <View style={s.extraPrice}>
              <Text style={s.extraPriceKey}>{t("mob.svc.extraPrice")}</Text>
              <Text style={s.extraPriceValue}>
                {fmtNum(pendingExtra.price)} {pendingExtra.currency}
              </Text>
            </View>

            {/* YAKUNIY SUMMA DARHOL: hisoblab o'tirish shart emas */}
            <View style={s.extraTotal}>
              <Text style={s.extraTotalKey}>{t("mob.svc.ifAgree")}</Text>
              <Text style={s.extraTotalValue}>
                {fmtNum((o.total?.total ?? o.price ?? 0) + pendingExtra.price)}{" "}
                {pendingExtra.currency}
              </Text>
            </View>

            <View style={s.row2}>
              <Pressable
                style={[s.btn, s.btnGhost]}
                disabled={busy}
                onPress={() =>
                  void act({ action: "extra-decide", extraId: pendingExtra.id, approve: false })
                }
              >
                <Text style={s.btnGhostText}>{t("mob.svc.reject")}</Text>
              </Pressable>
              <Pressable
                style={[s.btn, s.btnPri]}
                disabled={busy}
                onPress={() =>
                  void act({ action: "extra-decide", extraId: pendingExtra.id, approve: true })
                }
              >
                <Text style={s.btnPriText}>{t("mob.svc.approve")}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Muammo */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <View style={[s.tag, { backgroundColor: tone + "1a" }]}>
              <Text style={[s.tagText, { color: tone }]}>{serviceStatusLabel(o.status)}</Text>
            </View>
            {o.needMobile && (
              <View style={[s.tag, s.tagMobile]}>
                <Text style={[s.tagText, { color: "#c2490f" }]}>{t("mob.svc.mobileNeeded")}</Text>
              </View>
            )}
          </View>

          <Text style={s.problem}>{o.problem}</Text>

          {o.services.length > 0 && (
            <View style={s.chips}>
              {o.services.map((k) => (
                <View key={k} style={s.chip}>
                  <Text style={s.chipText}>{serviceSpecLabel(k)}</Text>
                </View>
              ))}
            </View>
          )}

          {o.photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.shots}>
              {o.photos.map((p) => (
                <Image key={p} source={servicePhoto(o.id, p)} style={s.shot} resizeMode="cover" />
              ))}
            </ScrollView>
          )}

          {o.vehicle ? <Text style={s.meta}>{[o.vehicle.title, o.vehicle.plate].filter(Boolean).join(" · ")}</Text> : null}
          {(o.location || o.address) && (
            <View style={s.place}>
              <Icon name="border" size={15} stroke={color.mutedForeground} />
              <Text style={s.placeText}>{[o.location, o.address].filter(Boolean).join(" · ")}</Text>
            </View>
          )}
        </View>

        {/* ══ TAKLIFLAR — tezlik bo'yicha ══ */}
        {viewer.isClient && offers.length > 0 && !o.master && (
          <View>
            <Text style={s.group}>{t("mob.svc.byArrival")}</Text>
            <View style={{ gap: space.sm }}>
              {offers.map((x, i) => (
                <View key={x.id} style={[s.card, i === 0 && s.cardFirst]}>
                  <View style={s.offerHead}>
                    <View style={s.avatar}>
                      <Text style={s.avatarText}>{initials(x.master.name)}</Text>
                    </View>
                    <View style={{ flexGrow: 1, minWidth: 0 }}>
                      <View style={s.nameRow}>
                        <Text style={s.mName} numberOfLines={1}>
                          {x.master.name}
                        </Text>
                        {x.master.verified && <Icon name="check" size={14} stroke={color.success} />}
                      </View>
                      <Text style={s.mMeta}>
                        {[
                          t("mob.svc.doneN", { n: x.master.done }),
                          x.master.mobile ? t("mob.svc.mobileOnly") : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </View>
                  </View>

                  {/* IKKI RAQAM — qaror shularda */}
                  <View style={s.two}>
                    <View style={[s.box, i === 0 && s.boxGood]}>
                      <Text style={[s.boxKey, i === 0 && s.boxKeyGood]}>
                        {t("mob.svc.arrival")}
                      </Text>
                      <Text style={[s.boxValue, i === 0 && s.boxValueGood]}>
                        {x.arrivalMin != null ? mins(x.arrivalMin) : "—"}
                      </Text>
                    </View>
                    <View style={s.box}>
                      <Text style={s.boxKey}>{t("mob.svc.priceIs")}</Text>
                      <Text style={s.boxValue}>{fmtNum(x.price)}</Text>
                    </View>
                  </View>

                  {x.note ? <Text style={s.note}>{x.note}</Text> : null}

                  <Pressable
                    style={[s.btn, i === 0 ? s.btnPri : s.btnGhost, { marginTop: 11 }]}
                    disabled={busy}
                    onPress={() => void act({ action: "choose", offerId: x.id })}
                  >
                    <Text style={i === 0 ? s.btnPriText : s.btnGhostText}>
                      {t("mob.svc.pickMaster")}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
            <Text style={s.hint}>{t("mob.svc.pickHint")}</Text>
          </View>
        )}

        {/* ── Tanlangan usta / mijoz */}
        {(o.master || o.client) && (
          <View style={s.card}>
            <Text style={s.sec}>{viewer.isMaster ? t("mob.svc.client") : t("mob.svc.master")}</Text>
            <View style={s.offerHead}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>
                  {initials(viewer.isMaster ? (o.client?.name ?? "") : (o.master?.name ?? ""))}
                </Text>
              </View>
              <View style={{ flexGrow: 1, minWidth: 0 }}>
                <Text style={s.mName} numberOfLines={1}>
                  {viewer.isMaster ? o.client?.name : o.master?.name}
                </Text>
                {o.price != null && (
                  <Text style={s.mMeta}>
                    {fmtNum(o.price)} {o.currency ?? ""}
                  </Text>
                )}
              </View>
            </View>

            {(viewer.isMaster ? o.client?.phone : o.master?.phone) && (
              <Pressable
                style={[s.btn, s.btnGhost, { marginTop: 12 }]}
                onPress={() =>
                  void Linking.openURL(
                    `tel:${viewer.isMaster ? o.client?.phone : o.master?.phone}`,
                  )
                }
              >
                <Text style={s.btnGhostText}>
                  {viewer.isMaster ? o.client?.phone : o.master?.phone}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* ── Yakuniy summa: tasdiqlangan qo'shimcha bilan */}
        {o.total.total != null && extras.some((e) => e.approvedAt) && (
          <View style={s.card}>
            <Text style={s.sec}>{t("mob.svc.total")}</Text>
            {o.price != null && (
              <View style={s.sumRow}>
                <Text style={s.sumKey}>{t("mob.svc.agreed")}</Text>
                <Text style={s.sumValue}>
                  {fmtNum(o.price)} {o.currency ?? ""}
                </Text>
              </View>
            )}
            {extras
              .filter((e) => e.approvedAt)
              .map((e) => (
                <View key={e.id} style={s.sumRow}>
                  <Text style={s.sumKey} numberOfLines={1}>
                    {e.work}
                  </Text>
                  <Text style={s.sumValue}>
                    {fmtNum(e.price)} {e.currency}
                  </Text>
                </View>
              ))}
            {o.total.mixed && (
              <Text style={s.mixed}>{t("mob.svc.mixedCurrency")}</Text>
            )}
            <View style={[s.sumRow, s.sumTotal]}>
              <Text style={s.sumTotalKey}>{t("mob.svc.total")}</Text>
              <Text style={s.sumTotalValue}>
                {fmtNum(o.total.total ?? 0)} {o.currency ?? ""}
              </Text>
            </View>
          </View>
        )}

        {/* ══ USTA TUGATDI — qabul qilish va kafolat ══ */}
        {viewer.isClient && o.status === "DONE" && (
          <View style={[s.card, s.doneCard]}>
            <View style={s.extraHead}>
              <Icon name="check" size={17} stroke="#15803d" />
              <Text style={s.doneTitle}>{t("mob.svc.masterDone")}</Text>
            </View>
            <Text style={s.text}>{t("mob.svc.acceptHint")}</Text>
            {o.resultNote ? <Text style={s.text}>{o.resultNote}</Text> : null}

            {o.warranty && (
              <View style={s.warranty}>
                <Icon name="check" size={15} stroke={color.foreground} />
                <Text style={s.warrantyText}>
                  {t("mob.svc.warranty", { text: o.warranty.text })}
                </Text>
              </View>
            )}

            <Pressable
              style={[s.btn, s.btnPri, { marginTop: 11 }]}
              disabled={busy}
              onPress={() => void act({ action: "accept" })}
            >
              <Text style={s.btnPriText}>{t("mob.svc.accept")}</Text>
            </Pressable>
          </View>
        )}

        {/* Qabul qilingan: kafolat qoladi — nosozlik qaytalansa dalil */}
        {o.warranty && o.status !== "DONE" && (
          <View style={[s.card, o.warranty.expired && s.cardMuted]}>
            <View style={s.extraHead}>
              <Icon name="check" size={16} stroke={o.warranty.expired ? "#94a3b8" : color.success} />
              <Text style={s.warrantyOnly}>
                {t("mob.svc.warranty", { text: o.warranty.text })}
                {o.warranty.expired ? ` · ${t("mob.svc.warrantyOver")}` : ""}
              </Text>
            </View>
          </View>
        )}

        {/* ══ USTA TOMONI ══ */}
        {viewer.isMaster && (
          <View style={s.card}>
            <Text style={s.sec}>{t("mob.svc.masterActions")}</Text>
            <View style={s.actions}>
              {o.status === "ASSIGNED" && (
                <Pressable
                  style={[s.btn, s.btnPri, { flex: 1 }]}
                  disabled={busy}
                  onPress={() => void act({ action: "move", to: "IN_WORK" })}
                >
                  <Text style={s.btnPriText}>{t("mob.svc.startWork")}</Text>
                </Pressable>
              )}
              {(o.status === "IN_WORK" || o.status === "EXTRA_NEEDED") && (
                <>
                  <Pressable
                    style={[s.btn, s.btnGhost, { flex: 1 }]}
                    disabled={busy}
                    onPress={() => setExtraForm(true)}
                  >
                    <Text style={s.btnGhostText}>{t("mob.svc.askExtra")}</Text>
                  </Pressable>
                  <Pressable
                    style={[s.btn, s.btnPri, { flex: 1 }]}
                    disabled={busy}
                    onPress={() => void act({ action: "move", to: "DONE" })}
                  >
                    <Text style={s.btnPriText}>{t("mob.svc.finish")}</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      <ExtraSheet
        open={extraForm}
        currency={o.currency ?? "UZS"}
        busy={busy}
        onClose={() => setExtraForm(false)}
        onSend={async (body) => {
          if (await act({ action: "extra", ...body })) setExtraForm(false);
        }}
      />
    </View>
  );
}

/**
 * Usta qo'shimcha ish so'raydi.
 *
 * IKKI MAYDON MAJBURIY: nima topildi va nima qilinadi. Faqat narx
 * yuborilsa mijoz nimaga pul to'layotganini bilmaydi va rad etadi —
 * yoki bundan ham yomoni, so'ramay ishonadi.
 */
function ExtraSheet({
  open,
  currency,
  busy,
  onClose,
  onSend,
}: {
  open: boolean;
  currency: string;
  busy: boolean;
  onClose: () => void;
  onSend: (body: { problem: string; work: string; price: number; currency: string }) => void;
}) {
  const [problem, setProblem] = useState("");
  const [work, setWork] = useState("");
  const [price, setPrice] = useState("");
  const insets = useSafeAreaInsets();

  const amount = Number(price.replace(/\s/g, ""));
  const ready = problem.trim().length > 0 && work.trim().length > 0 && amount > 0;

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.sheetBack}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[s.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <View style={s.grab} />
          <Text style={s.sheetTitle}>{t("mob.svc.askExtra")}</Text>
          <Text style={s.sheetSub}>{t("mob.svc.extraHint")}</Text>

          <Field
            label={t("mob.svc.extraFound")}
            value={problem}
            onChangeText={setProblem}
            placeholder={t("mob.svc.extraFoundPh")}
          />
          <Field
            label={t("mob.svc.extraWork")}
            value={work}
            onChangeText={setWork}
            placeholder={t("mob.svc.extraWorkPh")}
          />
          <Field
            label={`${t("mob.svc.extraPrice")}, ${currency}`}
            value={price}
            onChangeText={setPrice}
            keyboardType="number-pad"
          />

          <View style={{ gap: space.xs, marginTop: space.xs }}>
            <Button
              title={t("mob.svc.sendExtra")}
              disabled={!ready}
              loading={busy}
              onPress={() => onSend({ problem: problem.trim(), work: work.trim(), price: amount, currency })}
            />
            <Pressable onPress={onClose} style={s.later}>
              <Text style={s.laterText}>{t("mob.common.cancel")}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function mins(n: number): string {
  return n < 60 ? t("mob.svc.minN", { n }) : t("mob.svc.hourN", { n: Math.round(n / 60) });
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },
  group: {
    fontSize: 12,
    fontWeight: "600",
    color: color.mutedForeground,
    letterSpacing: 0.3,
    marginBottom: 7,
    marginLeft: 4,
  },

  failed: {
    borderWidth: 1,
    borderColor: color.danger + "59",
    backgroundColor: color.danger + "0d",
    borderRadius: radius.control,
    padding: space.md,
  },
  failedText: { fontSize: font.caption, color: color.danger },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.md,
  },
  cardFirst: { borderWidth: 2, borderColor: color.success },
  cardMuted: { opacity: 0.7 },

  cardHead: { flexDirection: "row", alignItems: "center", gap: 7 },
  tag: { height: 21, paddingHorizontal: 8, borderRadius: 6, justifyContent: "center" },
  tagMobile: { backgroundColor: color.brand + "1f" },
  tagText: { fontSize: 10, fontWeight: "700" },

  problem: { fontSize: 15, color: color.foreground, marginTop: 10, lineHeight: 22 },
  meta: { fontSize: 12, color: color.mutedForeground, marginTop: 10 },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  chip: { height: 26, paddingHorizontal: 10, borderRadius: 8, backgroundColor: color.muted, justifyContent: "center" },
  chipText: { fontSize: 12, fontWeight: "500", color: color.mutedForeground },

  shots: { marginTop: 11 },
  shot: { width: 84, height: 66, borderRadius: 9, backgroundColor: color.muted, marginRight: 7 },

  place: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 10 },
  placeText: { flex: 1, fontSize: 13, color: color.mutedForeground },

  extraCard: { borderWidth: 2, borderColor: color.danger },
  extraHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  extraTitle: { fontSize: 14, fontWeight: "700", color: color.danger },
  extraLine: { fontSize: 13, color: color.foreground, marginTop: 8, lineHeight: 20 },
  extraKey: { fontWeight: "600" },
  extraPrice: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: color.muted,
  },
  extraPriceKey: { fontSize: 13, color: color.mutedForeground },
  extraPriceValue: { fontSize: 19, fontWeight: "700", color: color.foreground },
  extraTotal: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
  },
  extraTotalKey: { fontSize: 12, color: color.mutedForeground },
  extraTotalValue: { fontSize: 15, fontWeight: "700", color: color.foreground },

  offerHead: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 11 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 12, fontWeight: "700", color: color.mutedForeground },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  mName: { flexShrink: 1, fontSize: 14, fontWeight: "600", color: color.foreground },
  mMeta: { fontSize: 12, color: color.mutedForeground },

  two: { flexDirection: "row", gap: 10, marginTop: 12 },
  box: { flex: 1, paddingVertical: 10, paddingHorizontal: 11, borderRadius: 10, backgroundColor: "#f8fafc" },
  boxGood: { backgroundColor: color.success + "14" },
  boxKey: { fontSize: 11, color: color.mutedForeground },
  boxKeyGood: { color: "#15803d" },
  boxValue: { fontSize: 19, fontWeight: "700", color: color.foreground, marginTop: 1 },
  boxValueGood: { color: "#15803d" },

  note: { fontSize: 12, color: color.mutedForeground, marginTop: 10, lineHeight: 18 },
  hint: { fontSize: 12, color: color.mutedForeground, textAlign: "center", marginTop: space.sm, lineHeight: 18 },

  sec: { fontSize: 15, fontWeight: "700", color: color.foreground },
  text: { fontSize: 13, color: color.mutedForeground, marginTop: 8, lineHeight: 20 },

  sumRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 7 },
  sumKey: { flex: 1, fontSize: 13, color: color.mutedForeground },
  sumValue: { fontSize: 13, fontWeight: "600", color: color.foreground },
  mixed: { fontSize: 12, color: "#92400e", marginTop: 6, lineHeight: 18 },
  sumTotal: { borderTopWidth: 1, borderTopColor: color.border, marginTop: 4, paddingTop: 10 },
  sumTotalKey: { fontSize: 14, fontWeight: "700", color: color.foreground },
  sumTotalValue: { fontSize: 16, fontWeight: "700", color: color.foreground },

  doneCard: { borderColor: color.success + "66", backgroundColor: color.success + "08" },
  doneTitle: { fontSize: 14, fontWeight: "700", color: "#15803d" },
  warranty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 11,
    padding: 11,
    borderRadius: 10,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
  },
  warrantyText: { flex: 1, fontSize: 13, fontWeight: "600", color: color.foreground },
  warrantyOnly: { flex: 1, fontSize: 13, fontWeight: "600", color: color.foreground },

  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  row2: { flexDirection: "row", gap: 8, marginTop: 12 },
  btn: { height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", flex: 1 },
  btnPri: { backgroundColor: color.brand },
  btnPriText: { fontSize: 14, fontWeight: "600", color: color.brandForeground },
  btnGhost: { borderWidth: 1, borderColor: color.border, backgroundColor: color.card },
  btnGhostText: { fontSize: 14, fontWeight: "600", color: color.mutedForeground },

  sheetBack: { flex: 1, backgroundColor: "#0f172acc", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: color.background,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: space.lg,
    gap: space.sm,
  },
  grab: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#cbd5e1", alignSelf: "center", marginBottom: space.xs },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: color.foreground },
  sheetSub: { fontSize: 13, color: color.mutedForeground, lineHeight: 19, marginBottom: space.xs },
  later: { alignItems: "center", paddingVertical: space.md },
  laterText: { fontSize: font.body, fontWeight: "600", color: color.mutedForeground },
});
