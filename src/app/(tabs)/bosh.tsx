/**
 * B1 — bosh sahifa. ROLGA QARAB ikki xil.
 *
 * Ma'lumot bitta so'rovdan keladi (`/api/home`): server rolni o'zi biladi
 * va `kind` bilan qaysi ko'rinish kerakligini aytadi.
 */
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon, type IconName } from "@/components/Icon";
import { ListingCard, TripCard, fmtNum, type Listing, type TripItem } from "@/components/cards";
import { Skeleton, ErrorBox, Empty } from "@/components/state";
import { useApi } from "@/lib/use-api";
import { color, font, radius, shadow, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

/** Har valyuta alohida — hech qachon qo'shilmaydi */
type Sum = { amount: number; currency: string };
type Money = { toMe: Sum[]; fromMe: Sum[]; overdue: Sum[] };

type Home =
  | {
      kind: "driver";
      user: { firstName: string; role: string; furamId: number };
      unreadNotifications: number;
      expiringDocuments: number;
      activeTrips: TripItem[];
      money: Money;
      suggestedLoads: Listing[];
    }
  | {
      kind: "dispatcher";
      user: { firstName: string; role: string; furamId: number };
      unreadNotifications: number;
      expiringDocuments: number;
      activeTrips: TripItem[];
      money: Money;
      counts: { liveTrips: number; problems: number; awaitingReply: number; expiringDocuments: number };
      recentChats: { id: string; name: string; lastMessage: string | null; lastAt: string }[];
    };

export default function Bosh() {
  const { data, loading, error, refreshing, refresh, reload } = useApi<Home>("/api/home");
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* ══ SALOMLASHUV ══
          Logotip o'rniga ISM: ilova ochilganda odam o'z ilovasiga
          kirganini bilishi kerak, brendni emas. Logotip splash va
          kirish ekranida allaqachon ko'rsatilgan. */}
      <View style={s.header}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>
            {(data?.user.firstName ?? "?").slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.hello}>{t("mob.home.hello")}</Text>
          <Text style={s.name} numberOfLines={1}>
            {data?.user.firstName ?? ""}
          </Text>
        </View>
        {/* QIDIRUV — bosh sahifada, menyuda emas.
            Odam biror narsani qidirganda profilga kirib
            o'tirmaydi; qidiruv doim ko'z oldida turishi kerak. */}
        <Pressable
          onPress={() => router.push("/qidiruv")}
          style={s.bell}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("mob.search.startTitle")}
        >
          <Icon name="search" size={21} stroke={color.foreground} />
        </Pressable>
        <Pressable onPress={() => router.push("/bildirishnomalar")} style={s.bell} hitSlop={8}>
          <Icon name="bell" size={22} stroke={color.foreground} />
          {data && data.unreadNotifications > 0 ? (
            <View style={s.badge}>
              <Text style={s.badgeText}>{data.unreadNotifications > 99 ? "99+" : data.unreadNotifications}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* GPS chizig'i — faol reys kuzatilayotgan bo'lsa */}
      {data?.activeTrips?.[0] ? (
        <View style={s.gps}>
          <View style={s.gpsDot} />
          <Text style={s.gpsText}>
            {t("mob.home.gpsOn")} <Text style={{ fontWeight: "600", color: "#fff" }}>#TR-{data.activeTrips[0].no}</Text>
          </Text>
          <Text style={s.gpsStop}>{t("mob.home.gpsStop")}</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: space.xl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? <Skeleton /> : null}
        {error ? <ErrorBox message={error} onRetry={reload} /> : null}

        {data?.kind === "dispatcher" ? (
          <Dispatcher data={data} onTrip={(tid) => router.push(`/reys/${tid}`)} />
        ) : null}

        {data?.kind === "driver" ? (
          <Driver
            data={data}
            onLoads={() => router.push("/yuklar")}
            onTrip={(tid) => router.push(`/reys/${tid}`)}
            onLoad={(lid) => router.push(`/yuk/${lid}`)}
            onPark={() => router.push("/parkim")}
            onQueue={() => router.push("/navbat")}
            onMoney={() => router.push("/moliya")}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

/* ─────────────────────────────────────────────── haydovchi */

function Driver({ data, onLoads, onTrip, onLoad, onPark, onQueue, onMoney }: {
  data: Extract<Home, { kind: "driver" }>;
  onLoads: () => void;
  onTrip: (id: string) => void;
  onLoad: (id: string) => void;
  onPark: () => void;
  onQueue: () => void;
  onMoney: () => void;
}) {
  const trip = data.activeTrips[0] ?? null;

  return (
    <>
      {trip ? (
        <TripCard item={trip} onPress={() => onTrip(trip.id)} />
      ) : (
        <Empty
          icon="route"
          title={t("mob.home.noActiveTrip")}
          text={t("mob.home.noTripText")}
          actionLabel={t("mob.home.findLoad")}
          onAction={onLoads}
        />
      )}

      {/* Tez harakatlar */}
      <View style={s.quick}>
        <QuickAction icon="search" label={t("mob.home.findLoad")} onPress={onLoads} />
        <QuickAction icon="truck" label={t("mob.park.title")} onPress={onPark} />
        <QuickAction icon="border" label={t("mob.home.border")} onPress={onQueue} />
        <QuickAction icon="alert" label={t("mob.home.sos")} danger />
      </View>

      {/* ══ PUL ══
          Har valyuta ALOHIDA qator. Qo'shib bitta raqam
          qilinmaydi: kurs har kuni o'zgaradi va yig'indi ertaga
          yolg'on bo'lib qoladi. */}
      <MoneyCard money={data.money} onOpen={onMoney} />

      {data.expiringDocuments > 0 ? (
        <View style={s.alert}>
          <View style={s.alertIcon}>
            <Icon name="clock" size={19} stroke={color.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.alertTitle}>
              {t("mob.home.docExpiringN", { n: data.expiringDocuments })}
            </Text>
            <Text style={s.alertText}>{t("mob.home.docExpiringHint")}</Text>
          </View>
          <Icon name="chevron" size={18} stroke="#94a3b8" />
        </View>
      ) : null}

      {data.suggestedLoads.length > 0 ? (
        <View style={{ gap: space.md }}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>{t("mob.home.suggested")}</Text>
            <Pressable onPress={onLoads} hitSlop={8}>
              <Text style={s.link}>{t("mob.common.all")}</Text>
            </Pressable>
          </View>
          {data.suggestedLoads.map((l) => (
            <ListingCard key={l.id} item={l} onPress={() => onLoad(l.id)} />
          ))}
        </View>
      ) : null}
    </>
  );
}

/* ─────────────────────────────────────────────────────── pul */

/**
 * Hisob-kitob — har valyuta alohida.
 *
 * Bu bo'lim ataylab QARZ ko'rsatadi, «balans» emas: hamyon
 * qoldig'i degan tushuncha tizimda yo'q, odam uchun esa eng
 * muhim raqam — kim kimga qancha qarzdor.
 */
function MoneyCard({ money, onOpen }: { money?: Money; onOpen: () => void }) {
  const toMe = money?.toMe ?? [];
  const fromMe = money?.fromMe ?? [];
  const overdue = money?.overdue ?? [];
  const empty = toMe.length === 0 && fromMe.length === 0;

  return (
    <View style={{ gap: space.md }}>
      <View style={s.sectionHead}>
        <Text style={s.sectionTitle}>{t("mob.home.myMoney")}</Text>
        <Pressable onPress={onOpen} hitSlop={8}>
          <Text style={s.link}>{t("mob.home.all")}</Text>
        </Pressable>
      </View>

      <Pressable style={s.moneyCard} onPress={onOpen}>
        {empty ? (
          <Text style={s.moneyNone}>{t("mob.home.noMoney")}</Text>
        ) : (
          <>
            {toMe.length > 0 && (
              <MoneyRow label={t("mob.fin.toMe")} rows={toMe} tone={color.success} />
            )}
            {fromMe.length > 0 && (
              <MoneyRow label={t("mob.fin.fromMe")} rows={fromMe} tone={color.foreground} />
            )}
            {overdue.length > 0 && (
              <View style={s.moneyLate}>
                <Icon name="clock" size={14} stroke={color.danger} />
                <Text style={s.moneyLateText}>
                  {overdue.map((m) => `${fmtNum(m.amount)} ${m.currency}`).join(" · ")}
                </Text>
              </View>
            )}
          </>
        )}
      </Pressable>
    </View>
  );
}

function MoneyRow({ label, rows, tone }: { label: string; rows: Sum[]; tone: string }) {
  return (
    <View style={s.moneyRow}>
      <Text style={s.moneyLabel}>{label}</Text>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        {rows.map((m) => (
          <Text key={m.currency} style={[s.moneyVal, { color: tone }]}>
            {fmtNum(m.amount)} <Text style={s.moneyCur}>{m.currency}</Text>
          </Text>
        ))}
      </View>
    </View>
  );
}

/* ─────────────────────────────────────────────── dispetcher */

function Dispatcher({ data, onTrip }: {
  data: Extract<Home, { kind: "dispatcher" }>;
  onTrip: (id: string) => void;
}) {
  const c = data.counts;
  return (
    <>
      <Text style={s.hello}>
        Salom, {data.user.firstName}.{" "}
        {c.problems > 0 ? `Bugun ${c.problems} ta ish diqqat talab qiladi.` : "Bugun hammasi joyida."}
      </Text>

      <View style={s.tiles}>
        <Tile icon="route" label={t("mob.home.activeTrips")} value={c.liveTrips} />
        <Tile icon="alert" label={t("mob.home.problems")} value={c.problems} tone={color.danger} />
        <Tile icon="chat" label={t("mob.home.waitingReply")} value={c.awaitingReply} />
        <Tile icon="doc" label={t("mob.misc.docExpiryTile")} value={c.expiringDocuments} tone={color.warning} />
      </View>

      {data.activeTrips.length > 0 ? (
        <View style={{ gap: space.md }}>
          <Text style={s.sectionTitle}>{t("mob.home.activeTrips")}</Text>
          {data.activeTrips.map((t) => (
            <TripCard key={t.id} item={t} onPress={() => onTrip(t.id)} />
          ))}
        </View>
      ) : (
        <Empty icon="route" title={t("mob.home.noActiveTrip")} text={t("mob.misc.noTripShort")} />
      )}

      {data.recentChats.length > 0 ? (
        <View style={{ gap: space.md }}>
          <Text style={s.sectionTitle}>{t("mob.home.recentChats")}</Text>
          <View style={s.list}>
            {data.recentChats.map((ch, i) => (
              <View key={ch.id} style={[s.chatRow, i > 0 && s.divider]}>
                <View style={s.chatAvatar}>
                  <Text style={s.chatAvatarText}>{ch.name.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.chatName} numberOfLines={1}>{ch.name}</Text>
                  {ch.lastMessage ? (
                    <Text style={s.chatMsg} numberOfLines={1}>{ch.lastMessage}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </>
  );
}

/* ─────────────────────────────────────────────── bo'laklar */

function Tile({ icon, label, value, tone }: { icon: IconName; label: string; value: number; tone?: string }) {
  return (
    <View style={[s.tile, tone && value > 0 ? { borderColor: tone + "47" } : null]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon name={icon} size={17} stroke={tone ?? color.brand} />
        <Text style={s.tileLabel}>{label}</Text>
      </View>
      <Text style={[s.tileValue, tone && value > 0 ? { color: tone } : null]}>{value}</Text>
    </View>
  );
}

function QuickAction({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress?: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.quickItem, danger && s.quickDanger, pressed && { opacity: 0.6 }]}>
      <Icon name={icon} size={22} stroke={danger ? color.danger : color.brand} />
      <Text style={[s.quickLabel, danger && { color: color.danger, fontWeight: "600" }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  hello: { fontSize: 13, color: color.mutedForeground },
  name: { fontSize: 17, fontWeight: "700", color: color.foreground, marginTop: 1 },

  moneyCard: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.md,
    gap: 10,
  },
  moneyRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  moneyLabel: { fontSize: 12, fontWeight: "600", color: color.mutedForeground, letterSpacing: 0.3 },
  moneyVal: { fontSize: 15, fontWeight: "700" },
  moneyCur: { fontSize: 12, fontWeight: "600", color: color.mutedForeground },
  moneyNone: { fontSize: 13.5, color: color.mutedForeground },
  moneyLate: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: color.muted,
    paddingTop: 9,
  },
  moneyLateText: { fontSize: 12.5, fontWeight: "600", color: color.danger },

  root: { flex: 1, backgroundColor: color.background },
  header: {
    backgroundColor: color.card,
    paddingHorizontal: space.lg,
    paddingTop: 6,
    paddingBottom: space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  bell: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute", top: 4, right: 2, minWidth: 17, height: 17, paddingHorizontal: 4,
    borderRadius: 9, backgroundColor: color.brand, borderWidth: 2, borderColor: color.card,
    alignItems: "center", justifyContent: "center",
  },
  badgeText: { fontSize: 9, fontWeight: "700", color: "#fff" },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: color.logoBlue, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 13, fontWeight: "600", color: "#fff" },

  gps: { backgroundColor: color.navy, paddingHorizontal: space.lg, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 9 },
  gpsDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.brand },
  gpsText: { flex: 1, fontSize: 13, color: "#e2e8f0" },
  gpsStop: { fontSize: 13, fontWeight: "600", color: color.brand },

  scroll: { padding: space.lg, gap: space.md },


  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    width: "47.5%", flexGrow: 1, backgroundColor: color.card, borderRadius: radius.card,
    borderWidth: 1, borderColor: color.border, padding: space.lg, ...shadow.card,
  },
  tileLabel: { fontSize: 12, color: color.mutedForeground },
  tileValue: { fontSize: 28, fontWeight: "700", color: color.foreground, marginTop: 6 },

  quick: { flexDirection: "row", gap: 9 },
  quickItem: {
    flex: 1, backgroundColor: color.card, borderRadius: radius.card, borderWidth: 1,
    borderColor: color.border, paddingVertical: 13, alignItems: "center", gap: 7,
  },
  quickDanger: { borderColor: "#dc26264d" },
  quickLabel: { fontSize: 11, fontWeight: "500", color: color.foreground, textAlign: "center" },

  alert: {
    backgroundColor: color.card, borderRadius: radius.card, borderWidth: 1, borderColor: "#b4530947",
    padding: space.lg, flexDirection: "row", alignItems: "center", gap: space.md,
  },
  alertIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#b453091f", alignItems: "center", justifyContent: "center" },
  alertTitle: { fontSize: 14, fontWeight: "600", color: color.foreground },
  alertText: { fontSize: 12, color: color.mutedForeground, marginTop: 2 },

  sectionHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  sectionTitle: { fontSize: font.bodyLg, fontWeight: "700", color: color.foreground },
  link: { fontSize: 13, fontWeight: "600", color: color.brand },

  list: { backgroundColor: color.card, borderRadius: radius.card, borderWidth: 1, borderColor: color.border, ...shadow.card },
  chatRow: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md },
  divider: { borderTopWidth: 1, borderTopColor: color.border },
  chatAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.muted, alignItems: "center", justifyContent: "center" },
  chatAvatarText: { fontSize: 13, fontWeight: "600", color: color.mutedForeground },
  chatName: { fontSize: 14, fontWeight: "600", color: color.foreground },
  chatMsg: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },
});
