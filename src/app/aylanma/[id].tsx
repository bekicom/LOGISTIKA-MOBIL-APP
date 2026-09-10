/**
 * Aylanma — bitta chiqishdagi hamma reys, pul va hujjat.
 *
 * ── REYSNI ALMASHTIRMAYDI ───────────────────────────────────────
 *
 * Reys o'z holicha qoladi: hujjat, xarajat, nazorat va hisob-kitob
 * o'sha yerda. Aylanma faqat USTIDAN bog'laydi — shuning uchun bu
 * ekranda reys mantiqi TAKRORLANMAYDI, faqat ro'yxat va o'tish
 * havolasi bor.
 *
 * ── VALYUTALAR QO'SHILMAYDI ─────────────────────────────────────
 *
 * Reys Rossiyada rublda, O'zbekistonda so'mda to'lanadi. Ularni
 * bir songa aylantirish kurs o'zgargan kuni yolg'on hisobot
 * berardi — har valyuta alohida qatorda (2-qoida).
 *
 * ── YOPISHNI FAQAT HAYDOVCHI QILADI ─────────────────────────────
 *
 * Qaror serverda (`isDriver`). Egasi aylanmani ko'radi, lekin
 * yopmaydi: safar tugaganini yo'lda bo'lgan odam biladi.
 */
import { useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Button, Card, GroupLabel, Header } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t, tripStatusLabel } from "@/lib/i18n";

type Money = { amount: number; currency: string };
type Trip = {
  id: string;
  no: number;
  status: string;
  order: number | null;
  title: string | null;
  from: string;
  to: string;
  docs: number;
  expenses: number;
};
type Tour = {
  id: string;
  no: number;
  status: string;
  startedAt: string;
  closedAt: string | null;
  isDriver: boolean;
  from: string | null;
  to: string | null;
  plate: string | null;
  brand: string | null;
  ownerName: string | null;
  ownerFuramId: number | null;
  driverName: string | null;
  chatId: string | null;
  money: { income: Money[]; expense: Money[]; trips: number; closed: number };
  trips: Trip[];
};

const money = (m: Money) => `${new Intl.NumberFormat("ru-RU").format(m.amount)} ${m.currency}`;

export default function Aylanma() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const { data, loading, error, refreshing, refresh, reload } = useApi<Tour>(
    id ? `/api/tours/${id}` : null,
    [id],
  );

  function askClose() {
    /* Yopish qaytarilmaydi — shuning uchun so'raladi. Aylanma
       yopilgach unga reys qo'shilmaydi va hisob qotib qoladi. */
    Alert.alert(t("mob.tour.closeAsk"), t("mob.tour.closeAskBody"), [
      { text: t("mob.common.cancel"), style: "cancel" },
      { text: t("mob.tour.close"), style: "destructive", onPress: () => void close() },
    ]);
  }

  async function close() {
    setBusy(true);
    try {
      await api(`/api/tours/${id}/close`, { method: "POST" });
      reload();
    } catch (e) {
      Alert.alert(t("mob.common.failed"), (e as FuramError).message ?? "");
    } finally {
      setBusy(false);
    }
  }

  const open = data?.status === "OPEN";

  return (
    <View style={s.root}>
      <Header
        title={data ? `A-${data.no}` : t("mob.tour.title")}
        subtitle={data ? t(`mob.tour.st.${data.status}`) : undefined}
      />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading && !data ? <Skeleton rows={4} /> : null}
        {error && !data ? <ErrorBox message={error} onRetry={reload} /> : null}

        {data ? (
          <>
            {/* Umumiy holat */}
            <View style={s.top}>
              <Text style={s.route}>
                {data.from && data.to ? `${data.from} → ${data.to}` : t("mob.tour.routeUnknown")}
              </Text>
              <View style={s.metaRow}>
                {data.plate ? <Meta k={t("mob.tour.vehicle")} v={data.plate} /> : null}
                <Meta k={t("mob.tour.started")} v={data.startedAt.slice(0, 10)} />
                {data.closedAt ? (
                  <Meta k={t("mob.tour.closed")} v={data.closedAt.slice(0, 10)} />
                ) : null}
              </View>
            </View>

            {/* Pul — valyutalar alohida */}
            <View style={s.moneyRow}>
              <MoneyBox
                label={t("mob.tour.income")}
                rows={data.money.income}
                tone={color.success}
              />
              <MoneyBox
                label={t("mob.tour.expense")}
                rows={data.money.expense}
                tone={color.danger}
              />
            </View>

            {/* Reyslar */}
            <View>
              <GroupLabel>
                {t("mob.tour.tripsOf", { a: data.money.closed, b: data.money.trips })}
              </GroupLabel>
              {data.trips.length === 0 ? (
                <Empty
                  icon="route"
                  title={t("mob.tour.noTrips")}
                  text={t("mob.tour.noTripsText")}
                  actionLabel={t("mob.nav.loads")}
                  onAction={() => router.push("/yuklar")}
                />
              ) : (
                <Card>
                  {data.trips.map((x, i) => (
                    <Pressable
                      key={x.id}
                      onPress={() => router.push(`/reys/${x.id}`)}
                      style={({ pressed }) => [
                        s.trip,
                        i < data.trips.length - 1 && s.tripLine,
                        pressed && { backgroundColor: color.muted },
                      ]}
                    >
                      <View style={s.order}>
                        <Text style={s.orderText}>{x.order ?? i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.tripTitle}>
                          #{x.no} · {x.from} → {x.to}
                        </Text>
                        <Text style={s.tripSub}>
                          {tripStatusLabel(x.status)} · {t("mob.tour.docsN", { n: x.docs })} ·{" "}
                          {t("mob.tour.expN", { n: x.expenses })}
                        </Text>
                      </View>
                      <Icon name="chevron" size={16} stroke={color.mutedForeground} />
                    </Pressable>
                  ))}
                </Card>
              )}
            </View>

            {/* Ishtirokchilar va suhbat */}
            <Card>
              {data.ownerName ? (
                <View style={s.row}>
                  <Text style={s.rowK}>{t("mob.tour.owner")}</Text>
                  <Text style={s.rowV}>
                    {data.ownerName}
                    {data.ownerFuramId ? ` · #${data.ownerFuramId}` : ""}
                  </Text>
                </View>
              ) : null}
              {data.driverName ? (
                <View style={s.row}>
                  <Text style={s.rowK}>{t("mob.tour.driver")}</Text>
                  <Text style={s.rowV}>{data.driverName}</Text>
                </View>
              ) : null}
              {data.chatId ? (
                <Pressable
                  onPress={() => router.push(`/suhbat/${data.chatId}`)}
                  style={({ pressed }) => [s.chat, pressed && { backgroundColor: color.muted }]}
                >
                  <Icon name="chat" size={17} stroke={color.brand} />
                  <Text style={s.chatText}>{t("mob.nav.chat")}</Text>
                  <Icon name="chevron" size={15} stroke={color.mutedForeground} />
                </Pressable>
              ) : null}
            </Card>

            {/* Yopish — faqat haydovchiga va faqat ochiq aylanmada */}
            {open && data.isDriver ? (
              <Button
                title={t("mob.tour.close")}
                variant="secondary"
                loading={busy}
                onPress={askClose}
              />
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <View>
      <Text style={s.metaK}>{k}</Text>
      <Text style={s.metaV}>{v}</Text>
    </View>
  );
}

/** Valyutalar ALOHIDA qatorda — qo'shilmaydi (2-qoida) */
function MoneyBox({ label, rows, tone }: { label: string; rows: Money[]; tone: string }) {
  return (
    <View style={s.moneyBox}>
      <Text style={s.moneyLabel}>{label}</Text>
      {rows.length === 0 ? (
        <Text style={s.moneyZero}>—</Text>
      ) : (
        rows.map((m) => (
          <Text key={m.currency} style={[s.moneyVal, { color: tone }]}>
            {money(m)}
          </Text>
        ))
      )}
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.lg },

  top: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.lg,
    gap: 10,
    ...shadow.card,
  },
  route: { fontSize: 16, fontWeight: "800", color: color.foreground },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: space.lg },
  metaK: { fontSize: 10.5, fontWeight: "700", color: color.mutedForeground },
  metaV: { fontSize: 13, fontWeight: "700", color: color.foreground, marginTop: 1 },

  moneyRow: { flexDirection: "row", gap: 9 },
  moneyBox: {
    flex: 1,
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.md,
    ...shadow.card,
  },
  moneyLabel: { fontSize: 10.5, fontWeight: "800", color: color.mutedForeground },
  moneyVal: { fontSize: 14.5, fontWeight: "800", marginTop: 3 },
  moneyZero: { fontSize: 14.5, fontWeight: "800", color: color.mutedForeground, marginTop: 3 },

  trip: { flexDirection: "row", alignItems: "center", gap: 11, padding: space.md },
  tripLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  order: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.brandSoft,
  },
  orderText: { fontSize: 12, fontWeight: "800", color: color.brand },
  tripTitle: { fontSize: 13.5, fontWeight: "700", color: color.foreground },
  tripSub: { fontSize: 11.5, color: color.mutedForeground, marginTop: 2 },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: space.md,
    paddingVertical: 11,
  },
  rowK: { fontSize: 12.5, color: color.mutedForeground },
  rowV: { fontSize: 12.5, fontWeight: "700", color: color.foreground },
  chat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  chatText: { flex: 1, fontSize: 13.5, fontWeight: "700", color: color.brand },
}));
