/**
 * U4 — usta paneli.
 *
 * ── USTANING BITTA ISHI BOR: TAKLIF BERISH ──────────────────────
 *
 * Qolgan hamma narsa shundan keyin. Shuning uchun ekran boshida
 * yangi buyurtmalar turadi, profil esa oxirida — u bir marta
 * to'ldiriladi va keyin kamdan-kam ochiladi.
 *
 * ── TAKLIF OYNASIDA UCHTAGINA KATAK ─────────────────────────────
 *
 * Usta ko'pincha mashina tagida, qo'li kir. Vaqt esa daqiqada va
 * tayyor tugmalar bilan so'raladi: raqam yozib o'tirmasin.
 *
 * ── PULLIK, LEKIN YASHIRILMAYDI ─────────────────────────────────
 *
 * `service` tarifi kerak. Bo'lim ochiq qoladi va sababi darhol
 * aytiladi — Bozordagi bilan bir xil qoida.
 */
import { useState } from "react";
import {
  FlatList,
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
import { useRouter } from "expo-router";
import { Button, Field, Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { api, FuramError } from "@/lib/api";
import { servicePhoto } from "@/lib/img";
import { useApi } from "@/lib/use-api";
import { color, font, radius, space } from "@/lib/theme";
import { serviceSpecLabel, serviceStatusLabel, t } from "@/lib/i18n";

type Fresh = {
  id: string;
  orderNo: number;
  problem: string;
  services: string[];
  photos: string[];
  needMobile: boolean;
  location: string | null;
  address: string | null;
  vehicle: string | null;
  offers: number;
  myOffer: { id: string; price: number; currency: string } | null;
};

type Working = {
  id: string;
  orderNo: number;
  problem: string;
  status: string;
  price: number | null;
  currency: string | null;
  client: string;
  phone: string | null;
};

type Profile = {
  name: string | null;
  specialities: string[];
  mobile: boolean;
  radiusKm: number | null;
  isApproved: boolean;
};

/** Tayyor javoblar, daqiqada */
const ARRIVAL = [30, 60, 120, 720] as const;

export default function UstaPanelim() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, loading, error, refreshing, refresh, reload } = useApi<{
    profile: Profile | null;
    canBeMaster: boolean;
    stats: { fresh: number; working: number; done: number };
    orders: Fresh[];
    working: Working[];
  }>("/api/service/master");

  const [sheet, setSheet] = useState<Fresh | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState("");

  async function offer(orderId: string, body: Record<string, unknown>) {
    setBusy(true);
    setFailed("");
    try {
      await api("/api/service", { method: "POST", body: { action: "offer", orderId, ...body } });
      setSheet(null);
      reload();
    } catch (e) {
      setFailed((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  const profile = data?.profile ?? null;

  return (
    <View style={s.root}>
      <Header
        title={t("mob.svc.masterPanel")}
        subtitle={
          profile
            ? profile.isApproved
              ? (profile.name ?? t("mob.svc.masterOn"))
              : t("mob.svc.masterWait")
            : t("mob.svc.masterOff")
        }
      />

      {/* Kelgan buyurtmalar eng uzun ro'yxat: server 40 tagacha
          qaytaradi va ular vaqt o'tgani sari yig'iladi. Ish ustidagi
          buyurtmalar va profil sarlavha/poyga bo'lib qoldi. */}
      <FlatList
        data={loading || error || !profile ? [] : (data?.orders ?? [])}
        keyExtractor={(o) => o.id}
        renderItem={({ item: o }) => (
          <View style={[s.card, o.needMobile && s.cardMobile]}>
            <View style={s.rowHead}>
              {o.needMobile ? (
                <View style={[s.tag, s.tagMobile]}>
                  <Text style={[s.tagText, { color: "#c2490f" }]}>
                    {t("mob.svc.mobileNeeded")}
                  </Text>
                </View>
              ) : o.services[0] ? (
                <View style={s.tag}>
                  <Text style={s.tagText}>{serviceSpecLabel(o.services[0])}</Text>
                </View>
              ) : null}
              <Text style={s.no}>#{o.orderNo}</Text>
            </View>

            <Text style={s.problem} numberOfLines={3}>
              {o.problem}
            </Text>
            <Text style={s.meta} numberOfLines={1}>
              {[o.vehicle, o.location, o.address].filter(Boolean).join(" · ")}
            </Text>

            {o.photos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.shots}>
                {o.photos.map((p) => (
                  <Image
                    key={p}
                    source={servicePhoto(o.id, p)}
                    style={s.shot}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            )}

            <View style={s.foot}>
              <Text style={s.footText}>
                {o.myOffer
                  ? t("mob.svc.myOffer", {
                      sum: `${fmtNum(o.myOffer.price)} ${o.myOffer.currency}`,
                    })
                  : t("mob.svc.offersGiven", { n: o.offers })}
              </Text>
              <Pressable
                style={[s.small, o.myOffer ? s.smallGhost : s.smallPri]}
                onPress={() => setSheet(o)}
              >
                <Text style={o.myOffer ? s.smallGhostText : s.smallPriText}>
                  {o.myOffer ? t("mob.svc.changeOffer") : t("mob.svc.makeOffer")}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          loading && !data ? (
          <Skeleton rows={3} />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : !profile ? (
          /* ══ Hali usta emas ══ */
          <View style={s.card}>
            <Text style={s.sec}>{t("mob.svc.becomeTitle")}</Text>
            <Text style={s.text}>{t("mob.svc.becomeText")}</Text>

            {data?.canBeMaster ? (
              <Pressable
                style={[s.btn, s.btnPri, { marginTop: 14 }]}
                onPress={() => router.push("/usta-profil")}
              >
                <Text style={s.btnPriText}>{t("mob.svc.becomeBtn")}</Text>
              </Pressable>
            ) : (
              <View style={s.locked}>
                <Text style={s.lockedTitle}>{t("mob.svc.lockedTitle")}</Text>
                <Text style={s.lockedText}>{t("mob.svc.lockedText")}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={s.head2}>
            {failed ? (
              <View style={s.failed}>
                <Text style={s.failedText}>{failed}</Text>
              </View>
            ) : null}

            {/* TASDIQLANMAGAN USTA taklif bera olmaydi — buni
                ochiq aytmasak, u taklif yuborib javob kutardi */}
            {!profile.isApproved && (
              <View style={s.warn}>
                <Text style={s.warnTitle}>{t("mob.svc.waitTitle")}</Text>
                <Text style={s.warnText}>{t("mob.svc.waitText")}</Text>
              </View>
            )}

            <View style={s.stats}>
              <Stat label={t("mob.svc.statFresh")} value={data?.stats.fresh ?? 0} accent />
              <Stat label={t("mob.svc.statWorking")} value={data?.stats.working ?? 0} />
              <Stat label={t("mob.svc.statDone")} value={data?.stats.done ?? 0} />
            </View>

            {/* ══ Ishdagilar ══ */}
            {(data?.working ?? []).length > 0 && (
              <View>
                <Text style={s.group}>{t("mob.svc.inWork")}</Text>
                <View style={{ gap: space.sm }}>
                  {(data?.working ?? []).map((w) => (
                    <Pressable
                      key={w.id}
                      style={s.card}
                      onPress={() => router.push(`/ustaxona/${w.id}`)}
                    >
                      <View style={s.rowHead}>
                        <View style={s.tag}>
                          <Text style={s.tagText}>{serviceStatusLabel(w.status)}</Text>
                        </View>
                        <Text style={s.no}>#{w.orderNo}</Text>
                      </View>
                      <Text style={s.problem} numberOfLines={2}>
                        {w.problem}
                      </Text>
                      <View style={s.foot}>
                        <Text style={s.footText} numberOfLines={1}>
                          {w.client}
                        </Text>
                        {w.price != null && (
                          <Text style={s.price}>
                            {fmtNum(w.price)} {w.currency ?? ""}
                          </Text>
                        )}
                      </View>
                      {w.phone && (
                        <Pressable
                          style={[s.btn, s.btnGhost, { marginTop: 11 }]}
                          onPress={() => void Linking.openURL(`tel:${w.phone}`)}
                        >
                          <Text style={s.btnGhostText}>{w.phone}</Text>
                        </Pressable>
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <Text style={s.group}>{t("mob.svc.newOrders")}</Text>
          </View>
          )
        }
        ListEmptyComponent={
          profile && !loading && !error ? (
            <View style={s.empty}>
              <Text style={s.emptyText}>{t("mob.svc.noOrders")}</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          profile && !loading && !error ? (
            <View style={{ marginTop: space.lg }}>
              <Pressable style={s.profileRow} onPress={() => router.push("/usta-profil")}>
                <View style={s.profileIcon}>
                  <Icon name="user" size={19} stroke={color.mutedForeground} />
                </View>
                <View style={{ flexGrow: 1 }}>
                  <Text style={s.profileTitle}>{t("mob.svc.myProfile")}</Text>
                  <Text style={s.profileSub} numberOfLines={1}>
                    {profile.specialities.map((k) => serviceSpecLabel(k)).join(", ")}
                  </Text>
                </View>
                <Icon name="chevron" size={18} stroke="#cbd5e1" />
              </Pressable>
            </View>
          ) : null
        }
      />

      <OfferSheet
        order={sheet}
        busy={busy}
        onClose={() => setSheet(null)}
        onSend={(body) => void offer(sheet!.id, body)}
      />
    </View>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <View style={s.stat}>
      <Text style={s.statKey}>{label}</Text>
      <Text style={[s.statValue, accent && { color: color.brand }]}>{value}</Text>
    </View>
  );
}

/** Taklif oynasi — uchta katak, boshqa hech narsa */
function OfferSheet({
  order,
  busy,
  onClose,
  onSend,
}: {
  order: Fresh | null;
  busy: boolean;
  onClose: () => void;
  onSend: (body: Record<string, unknown>) => void;
}) {
  const [price, setPrice] = useState("");
  const [arrival, setArrival] = useState<number | null>(null);
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const insets = useSafeAreaInsets();

  const amount = Number(price.replace(/\s/g, ""));

  return (
    <Modal visible={!!order} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.sheetBack}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[s.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <View style={s.grab} />
          <Text style={s.sheetTitle}>{t("mob.svc.makeOffer")}</Text>
          <Text style={s.sheetSub} numberOfLines={2}>
            {order?.problem}
          </Text>

          <Field
            label={t("mob.svc.offerPrice")}
            value={price}
            onChangeText={setPrice}
            keyboardType="number-pad"
          />

          <View>
            <Text style={s.label}>{t("mob.svc.offerArrival")}</Text>
            <View style={s.picks}>
              {ARRIVAL.map((m) => (
                <Pressable
                  key={m}
                  style={[s.pick, arrival === m && s.pickOn]}
                  onPress={() => setArrival(arrival === m ? null : m)}
                >
                  <Text style={[s.pickText, arrival === m && s.pickTextOn]}>
                    {m < 60
                      ? t("mob.svc.minN", { n: m })
                      : m < 720
                        ? t("mob.svc.hourN", { n: m / 60 })
                        : t("mob.svc.when_tomorrow")}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Field
            label={t("mob.svc.offerHours")}
            value={hours}
            onChangeText={setHours}
            keyboardType="decimal-pad"
            placeholder="3"
          />
          <Field
            label={t("mob.svc.offerNote")}
            value={note}
            onChangeText={setNote}
            placeholder={t("mob.svc.offerNotePh")}
            multiline
            style={s.area}
          />

          <View style={{ gap: space.xs, marginTop: space.xs }}>
            <Button
              title={t("mob.svc.sendOffer")}
              disabled={!(amount > 0)}
              loading={busy}
              onPress={() =>
                onSend({
                  price: amount,
                  currency: "UZS",
                  arrivalMin: arrival,
                  workHours: hours ? Number(hours.replace(",", ".")) : null,
                  note: note.trim() || null,
                })
              }
            />
            <Pressable onPress={onClose} style={s.later}>
              <Text style={s.laterText}>{t("mob.common.cancel")}</Text>
            </Pressable>
          </View>

          <Text style={s.sheetNote}>{t("mob.svc.offerEditable")}</Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg },
  /* Sarlavha oralig'ini o'zi beradi: konteynerdagi `gap` buyurtma
     kartochkalari orasiga ham tushardi. */
  head2: { gap: space.lg, marginBottom: space.sm },
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

  warn: {
    borderWidth: 1,
    borderColor: color.warning + "59",
    backgroundColor: color.warning + "0d",
    borderRadius: radius.control,
    padding: space.md,
  },
  warnTitle: { fontSize: font.caption, fontWeight: "600", color: "#92400e" },
  warnText: { fontSize: 12, color: "#92400e", marginTop: 4, lineHeight: 18 },

  stats: { flexDirection: "row", gap: 10 },
  stat: {
    flex: 1,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  statKey: { fontSize: 11, color: "#94a3b8" },
  statValue: { fontSize: 20, fontWeight: "700", color: color.foreground, marginTop: 1 },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.md,
  },
  cardMobile: { borderColor: color.brand + "66" },

  rowHead: { flexDirection: "row", alignItems: "center", gap: 7 },
  tag: { height: 21, paddingHorizontal: 8, borderRadius: 6, backgroundColor: color.muted, justifyContent: "center" },
  tagMobile: { backgroundColor: color.brand + "1f" },
  tagText: { fontSize: 10, fontWeight: "700", color: color.mutedForeground },
  no: { marginLeft: "auto", fontSize: 11, color: "#94a3b8" },

  problem: { fontSize: 14, color: color.foreground, marginTop: 10, lineHeight: 20 },
  meta: { fontSize: 12, color: color.mutedForeground, marginTop: 4 },

  shots: { marginTop: 10 },
  shot: { width: 56, height: 44, borderRadius: 8, backgroundColor: color.muted, marginRight: 7 },

  foot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: color.muted,
  },
  footText: { flex: 1, fontSize: 12, color: color.mutedForeground },
  price: { fontSize: 14, fontWeight: "700", color: color.foreground },

  small: { height: 36, paddingHorizontal: 15, borderRadius: 9, justifyContent: "center" },
  smallPri: { backgroundColor: color.brand },
  smallPriText: { fontSize: 13, fontWeight: "600", color: color.brandForeground },
  smallGhost: { borderWidth: 1, borderColor: color.border },
  smallGhostText: { fontSize: 13, fontWeight: "600", color: color.mutedForeground },

  sec: { fontSize: 15, fontWeight: "700", color: color.foreground },
  text: { fontSize: 13, color: color.mutedForeground, marginTop: 8, lineHeight: 20 },

  locked: {
    marginTop: 13,
    padding: space.md,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.warning + "59",
    backgroundColor: color.warning + "0d",
  },
  lockedTitle: { fontSize: font.caption, fontWeight: "600", color: "#92400e" },
  lockedText: { fontSize: 12, color: "#92400e", marginTop: 4, lineHeight: 18 },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.md,
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  profileTitle: { fontSize: 14, fontWeight: "600", color: color.foreground },
  profileSub: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },

  empty: { padding: space.lg, alignItems: "center" },
  emptyText: { fontSize: 13, color: color.mutedForeground, textAlign: "center", lineHeight: 19 },

  btn: { height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
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
  sheetNote: { fontSize: 11, color: "#94a3b8", textAlign: "center", lineHeight: 16 },

  label: { fontSize: 12, fontWeight: "600", color: color.mutedForeground, marginBottom: 5 },
  picks: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pick: {
    height: 40,
    paddingHorizontal: 13,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
    justifyContent: "center",
  },
  pickOn: { backgroundColor: color.brand + "17", borderColor: color.brand },
  pickText: { fontSize: 13, fontWeight: "500", color: color.mutedForeground },
  pickTextOn: { color: "#c2490f", fontWeight: "600" },
  area: { minHeight: 70, textAlignVertical: "top" },

  later: { alignItems: "center", paddingVertical: space.md },
  laterText: { fontSize: font.body, fontWeight: "600", color: color.mutedForeground },
});
