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
import { Logo } from "@/components/Logo";
import { ListingCard, TripCard, type Listing, type TripItem } from "@/components/cards";
import { Skeleton, ErrorBox, Empty } from "@/components/state";
import { useApi } from "@/lib/use-api";
import { color, font, radius, shadow, space } from "@/lib/theme";

type Home =
  | {
      kind: "driver";
      user: { firstName: string; role: string; furamId: number };
      unreadNotifications: number;
      expiringDocuments: number;
      activeTrips: TripItem[];
      suggestedLoads: Listing[];
    }
  | {
      kind: "dispatcher";
      user: { firstName: string; role: string; furamId: number };
      unreadNotifications: number;
      expiringDocuments: number;
      activeTrips: TripItem[];
      counts: { liveTrips: number; problems: number; awaitingReply: number; expiringDocuments: number };
      recentChats: { id: string; name: string; lastMessage: string | null; lastAt: string }[];
    };

export default function Bosh() {
  const { data, loading, error, refreshing, refresh, reload } = useApi<Home>("/api/home");
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Sarlavha */}
      <View style={s.header}>
        <Logo width={104} />
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => router.push("/bildirishnomalar")} style={s.bell} hitSlop={8}>
          <Icon name="bell" size={22} stroke={color.foreground} />
          {data && data.unreadNotifications > 0 ? (
            <View style={s.badge}>
              <Text style={s.badgeText}>{data.unreadNotifications > 99 ? "99+" : data.unreadNotifications}</Text>
            </View>
          ) : null}
        </Pressable>
        <View style={s.avatar}>
          <Text style={s.avatarText}>
            {(data?.user.firstName ?? "?").slice(0, 2).toUpperCase()}
          </Text>
        </View>
      </View>

      {/* GPS chizig'i — faol reys kuzatilayotgan bo'lsa */}
      {data?.activeTrips?.[0] ? (
        <View style={s.gps}>
          <View style={s.gpsDot} />
          <Text style={s.gpsText}>
            GPS yoqilgan — <Text style={{ fontWeight: "600", color: "#fff" }}>#TR-{data.activeTrips[0].no}</Text> kuzatilmoqda
          </Text>
          <Text style={s.gpsStop}>To&apos;xtatish</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: space.xl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? <Skeleton /> : null}
        {error ? <ErrorBox message={error} onRetry={reload} /> : null}

        {data?.kind === "dispatcher" ? <Dispatcher data={data} /> : null}

        {data?.kind === "driver" ? <Driver data={data} onLoads={() => router.push("/yuklar")} /> : null}
      </ScrollView>
    </View>
  );
}

/* ─────────────────────────────────────────────── haydovchi */

// Reys tafsiloti (E2) hali qurilmagan — kartochka bosilmaydi.
function Driver({ data, onLoads }: {
  data: Extract<Home, { kind: "driver" }>;
  onLoads: () => void;
}) {
  const trip = data.activeTrips[0] ?? null;

  return (
    <>
      {trip ? (
        <TripCard item={trip} />
      ) : (
        <Empty
          icon="route"
          title="Faol reys yo'q"
          text="Hozir yo'lda bo'lgan reysingiz yo'q. Yangi yuk topib boshlang."
          actionLabel="Yuk topish"
          onAction={onLoads}
        />
      )}

      {/* Tez harakatlar */}
      <View style={s.quick}>
        <QuickAction icon="search" label="Yuk topish" onPress={onLoads} />
        <QuickAction icon="doc" label="Hujjatlar" />
        <QuickAction icon="border" label="Chegara" />
        <QuickAction icon="alert" label="SOS" danger />
      </View>

      {data.expiringDocuments > 0 ? (
        <View style={s.alert}>
          <View style={s.alertIcon}>
            <Icon name="clock" size={19} stroke={color.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.alertTitle}>
              {data.expiringDocuments} ta hujjat muddati tugayapti
            </Text>
            <Text style={s.alertText}>Chegarada muammo bo&apos;lmasligi uchun yangilang</Text>
          </View>
          <Icon name="chevron" size={18} stroke="#94a3b8" />
        </View>
      ) : null}

      {data.suggestedLoads.length > 0 ? (
        <View style={{ gap: space.md }}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Sizga mos yuklar</Text>
            <Pressable onPress={onLoads} hitSlop={8}>
              <Text style={s.link}>Hammasi</Text>
            </Pressable>
          </View>
          {data.suggestedLoads.map((l) => (
            <ListingCard key={l.id} item={l} />
          ))}
        </View>
      ) : null}
    </>
  );
}

/* ─────────────────────────────────────────────── dispetcher */

function Dispatcher({ data }: { data: Extract<Home, { kind: "dispatcher" }> }) {
  const c = data.counts;
  return (
    <>
      <Text style={s.hello}>
        Salom, {data.user.firstName}.{" "}
        {c.problems > 0 ? `Bugun ${c.problems} ta ish diqqat talab qiladi.` : "Bugun hammasi joyida."}
      </Text>

      <View style={s.tiles}>
        <Tile icon="route" label="Faol reyslar" value={c.liveTrips} />
        <Tile icon="alert" label="Muammolar" value={c.problems} tone={color.danger} />
        <Tile icon="chat" label="Javob kutmoqda" value={c.awaitingReply} />
        <Tile icon="doc" label="Hujjat muddati" value={c.expiringDocuments} tone={color.warning} />
      </View>

      {data.activeTrips.length > 0 ? (
        <View style={{ gap: space.md }}>
          <Text style={s.sectionTitle}>Faol reyslar</Text>
          {data.activeTrips.map((t) => (
            <TripCard key={t.id} item={t} />
          ))}
        </View>
      ) : (
        <Empty icon="route" title="Faol reys yo'q" text="Hozir yo'lda bo'lgan reys yo'q." />
      )}

      {data.recentChats.length > 0 ? (
        <View style={{ gap: space.md }}>
          <Text style={s.sectionTitle}>So&apos;nggi suhbatlar</Text>
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

  hello: { fontSize: 13, color: color.mutedForeground },

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
