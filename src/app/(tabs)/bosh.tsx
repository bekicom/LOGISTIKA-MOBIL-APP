/**
 * B1 — bosh sahifa. ROLGA QARAB ikki xil.
 *
 * Ma'lumot bitta so'rovdan keladi (`/api/home`): server rolni o'zi biladi
 * va `kind` bilan qaysi ko'rinish kerakligini aytadi.
 */
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { AuthTexture } from "@/components/AuthDesign";
import { Icon, type IconName } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import {
  ListingCard,
  Route,
  StatusChip,
  TripCard,
  toneFor,
  type Listing,
  type TripItem,
} from "@/components/cards";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { useApi } from "@/lib/use-api";
import { color, font, radius, shadow, space } from "@/lib/theme";
import { t, tOr } from "@/lib/i18n";

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
  const name = data?.user.firstName ?? "";

  return (
    <View style={s.root}>
      <View style={[s.hero, { paddingTop: insets.top + 10 }]}>
        <AuthTexture />
        <View style={s.header}>
          <Logo width={118} light />
          <View style={{ flex: 1 }} />
          <RoundButton icon="search" onPress={() => router.push("/qidiruv")} />
          <RoundButton
            icon="bell"
            onPress={() => router.push("/bildirishnomalar")}
            badge={data?.unreadNotifications ?? 0}
          />
          <View style={s.avatar}>
            <Text style={s.avatarText}>{(name || "?").slice(0, 2).toUpperCase()}</Text>
          </View>
        </View>

        <Text style={s.eyebrow}>B1 · BOSH SAHIFA</Text>
        <Text style={s.title}>
          {data?.kind === "dispatcher"
            ? `Salom, ${name || "dispetcher"}`
            : `Salom, ${name || "haydovchi"}`}
        </Text>
        <Text style={s.subtitle}>
          {data?.kind === "dispatcher"
            ? "Reyslar, muammolar va javob kutayotgan ishlar bir joyda."
            : "Faol reysingiz, mos yuklar va tez harakatlar bir joyda."}
        </Text>

        {data?.activeTrips?.[0] ? <GpsLine trip={data.activeTrips[0]} /> : null}
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? <Skeleton /> : null}
        {error ? <ErrorBox message={error} onRetry={reload} /> : null}

        {data?.kind === "dispatcher" ? (
          <Dispatcher
            data={data}
            onTrip={(tid) => router.push(`/reys/${tid}`)}
            onNotifications={() => router.push("/bildirishnomalar?tab=problem")}
          />
        ) : null}

        {data?.kind === "driver" ? (
          <Driver
            data={data}
            onLoads={() => router.push("/yuklar")}
            onTrip={(tid) => router.push(`/reys/${tid}`)}
            onLoad={(lid) => router.push(`/yuk/${lid}`)}
            onPark={() => router.push("/parkim")}
            onQueue={() => router.push("/navbat")}
            onDocs={() => router.push("/hujjatlarim")}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

function Driver({
  data,
  onLoads,
  onTrip,
  onLoad,
  onPark,
  onQueue,
  onDocs,
}: {
  data: Extract<Home, { kind: "driver" }>;
  onLoads: () => void;
  onTrip: (id: string) => void;
  onLoad: (id: string) => void;
  onPark: () => void;
  onQueue: () => void;
  onDocs: () => void;
}) {
  const trip = data.activeTrips[0] ?? null;

  return (
    <>
      <View style={s.heroCard}>
        <MapPreview />
        {trip ? (
          <ActiveTrip item={trip} onPress={() => onTrip(trip.id)} />
        ) : (
          <View style={s.heroCardBody}>
            <Empty
              icon="route"
              title={t("mob.home.noActiveTrip")}
              text={t("mob.home.noTripText")}
              actionLabel={t("mob.home.findLoad")}
              onAction={onLoads}
            />
          </View>
        )}
      </View>

      <View style={s.quick}>
        <QuickAction icon="search" label={t("mob.home.findLoad")} onPress={onLoads} />
        <QuickAction icon="truck" label={t("mob.park.title")} onPress={onPark} />
        <QuickAction icon="doc" label="Hujjatlar" onPress={onDocs} />
        <QuickAction icon="border" label={t("mob.home.border")} onPress={onQueue} />
      </View>

      {data.expiringDocuments > 0 ? (
        <Pressable onPress={onDocs} style={s.alert}>
          <View style={s.alertIcon}>
            <Icon name="clock" size={19} stroke={color.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.alertTitle}>{t("mob.home.docExpiringN", { n: data.expiringDocuments })}</Text>
            <Text style={s.alertText}>{t("mob.home.docExpiringHint")}</Text>
          </View>
          <Icon name="chevron" size={18} stroke="#94a3b8" />
        </Pressable>
      ) : null}

      {data.suggestedLoads.length > 0 ? (
        <View style={s.section}>
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

function Dispatcher({
  data,
  onTrip,
  onNotifications,
}: {
  data: Extract<Home, { kind: "dispatcher" }>;
  onTrip: (id: string) => void;
  onNotifications: () => void;
}) {
  const c = data.counts;

  return (
    <>
      <View style={s.tiles}>
        <Tile icon="route" label={t("mob.home.activeTrips")} value={c.liveTrips} />
        <Tile icon="alert" label={t("mob.home.problems")} value={c.problems} tone={color.danger} onPress={onNotifications} />
        <Tile icon="chat" label={t("mob.home.waitingReply")} value={c.awaitingReply} />
        <Tile icon="doc" label={t("mob.misc.docExpiryTile")} value={c.expiringDocuments} tone={color.warning} />
      </View>

      {data.activeTrips.length > 0 ? (
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>{t("mob.home.activeTrips")}</Text>
            <Text style={s.sectionMeta}>
              {c.problems > 0 ? `${c.problems} muammo` : "Hammasi joyida"}
            </Text>
          </View>
          {data.activeTrips.map((trip) => (
            <TripCard key={trip.id} item={trip} onPress={() => onTrip(trip.id)} />
          ))}
        </View>
      ) : (
        <Empty icon="route" title={t("mob.home.noActiveTrip")} text={t("mob.misc.noTripShort")} />
      )}

      {data.recentChats.length > 0 ? (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("mob.home.recentChats")}</Text>
          <View style={s.list}>
            {data.recentChats.map((ch, i) => (
              <View key={ch.id} style={[s.chatRow, i > 0 && s.divider]}>
                <View style={s.chatAvatar}>
                  <Text style={s.chatAvatarText}>{ch.name.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.chatName} numberOfLines={1}>
                    {ch.name}
                  </Text>
                  {ch.lastMessage ? (
                    <Text style={s.chatMsg} numberOfLines={1}>
                      {ch.lastMessage}
                    </Text>
                  ) : null}
                </View>
                <Text style={s.chatTime}>{time(ch.lastAt)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </>
  );
}

function RoundButton({ icon, onPress, badge }: { icon: IconName; onPress: () => void; badge?: number }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.round, pressed && { opacity: 0.72 }]} hitSlop={8}>
      <Icon name={icon} size={21} stroke="#ffffff" />
      {badge && badge > 0 ? (
        <View style={s.badge}>
          <Text style={s.badgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function ActiveTrip({ item, onPress }: { item: TripItem; onPress: () => void }) {
  const tone = toneFor(item.status);
  const eta = item.etaAt ? new Date(item.etaAt) : null;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.activeTrip, pressed && { opacity: 0.72 }]}>
      <View style={s.activeHead}>
        <StatusChip label={tOr(`tripStatus.${item.status}`, item.status)} tone={tone} />
        <Text style={s.tripNo}>#TR-{item.no}</Text>
      </View>
      <View style={{ marginTop: 12 }}>
        <Route from={item.from} fromC={item.fromCountry} to={item.to} toC={item.toCountry} />
      </View>
      <View style={s.track}>
        {Array.from({ length: item.stepTotal }, (_, i) => (
          <View
            key={i}
            style={[
              s.trackStep,
              { backgroundColor: i <= item.stepIndex ? (tone === "warning" ? color.warning : color.brand) : color.border },
            ]}
          />
        ))}
      </View>
      {item.remainingKm != null || eta ? (
        <View style={s.tripFigures}>
          {item.remainingKm != null ? (
            <Figure value={String(item.remainingKm)} label={t("mob.trip.kmLeft")} />
          ) : null}
          {eta ? (
            <Figure
              value={`${String(eta.getHours()).padStart(2, "0")}:${String(eta.getMinutes()).padStart(2, "0")}`}
              label={t("mob.trip.arrives")}
            />
          ) : null}
          {item.stepTotal > 0 ? <Figure value={`${item.stepIndex + 1}/${item.stepTotal}`} label="bosqich" /> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <View style={s.figure}>
      <Text style={s.figureValue}>{value}</Text>
      <Text style={s.figureLabel}>{label}</Text>
    </View>
  );
}

function GpsLine({ trip }: { trip: TripItem }) {
  return (
    <View style={s.gps}>
      <View style={s.gpsDot} />
      <Text style={s.gpsText}>
        {t("mob.home.gpsOn")} <Text style={s.gpsStrong}>#TR-{trip.no}</Text>
      </Text>
      <Text style={s.gpsStop}>{t("mob.home.gpsStop")}</Text>
    </View>
  );
}

function Tile({
  icon,
  label,
  value,
  tone,
  onPress,
}: {
  icon: IconName;
  label: string;
  value: number;
  tone?: string;
  onPress?: () => void;
}) {
  const activeTone = tone && value > 0 ? tone : color.brand;
  const body = (
    <>
      <View style={[s.tileIcon, { backgroundColor: activeTone + "1f" }]}>
        <Icon name={icon} size={18} stroke={activeTone} />
      </View>
      <Text style={s.tileValue}>{value}</Text>
      <Text style={s.tileLabel} numberOfLines={2}>{label}</Text>
    </>
  );

  if (onPress) {
    return <Pressable onPress={onPress} style={({ pressed }) => [s.tile, pressed && { opacity: 0.72 }]}>{body}</Pressable>;
  }
  return <View style={s.tile}>{body}</View>;
}

function QuickAction({ icon, label, onPress }: { icon: IconName; label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.quickItem, pressed && { opacity: 0.68 }]}>
      <View style={s.quickIcon}>
        <Icon name={icon} size={21} stroke={color.brand} />
      </View>
      <Text style={s.quickLabel} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

function MapPreview() {
  return (
    <Svg width="100%" height={124} viewBox="0 0 361 124" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="mapBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#dfe8f3" />
          <Stop offset="1" stopColor="#f8fafc" />
        </LinearGradient>
      </Defs>
      <Rect width="361" height="124" fill="url(#mapBg)" />
      <Path d="M-10 96 C58 83 98 112 165 89 S276 49 372 65" fill="none" stroke="#c8d4e3" strokeWidth={9} strokeLinecap="round" />
      <Path d="M24 88 C82 80 117 55 174 54 S283 33 329 23" fill="none" stroke={color.brand} strokeWidth={3.5} strokeLinecap="round" />
      <Path d="M174 54 C235 50 283 33 329 23" fill="none" stroke={color.brand} strokeWidth={3.5} strokeLinecap="round" strokeDasharray="2 8" opacity="0.45" />
      <Path d="M76 0 L62 124M286 0 L303 124M0 30 L361 18M0 91 L361 105" stroke="#cfdae8" strokeWidth={1.3} />
      <Circle cx={24} cy={88} r={6} fill="#ffffff" stroke="#0f172a" strokeWidth={2.5} />
      <Circle cx={329} cy={23} r={6} fill="#ffffff" stroke={color.brand} strokeWidth={2.5} />
      <Circle cx={174} cy={54} r={15} fill={color.brand} opacity="0.18" />
      <Circle cx={174} cy={54} r={9} fill={color.brand} stroke="#ffffff" strokeWidth={2.5} />
    </Svg>
  );
}

function time(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  hero: {
    backgroundColor: color.navy,
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    overflow: "hidden",
  },
  header: { flexDirection: "row", alignItems: "center", gap: space.sm },
  round: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(158,181,213,0.26)",
    backgroundColor: "rgba(15,37,68,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: color.brand,
    borderWidth: 2,
    borderColor: color.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 9, fontWeight: "800", color: "#fff" },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 13, fontWeight: "800", color: "#fff" },
  eyebrow: { fontSize: 12, fontWeight: "800", color: "#8fa7c7", letterSpacing: 0.7, marginTop: 24 },
  title: { fontSize: 31, lineHeight: 37, fontWeight: "800", color: "#ffffff", marginTop: 5 },
  subtitle: { fontSize: font.body, color: "#a9bddc", lineHeight: 22, marginTop: 7, maxWidth: 320 },
  gps: {
    minHeight: 42,
    borderRadius: 15,
    backgroundColor: "rgba(15,37,68,0.82)",
    borderWidth: 1,
    borderColor: "rgba(158,181,213,0.22)",
    paddingHorizontal: 13,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  gpsDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.brand },
  gpsText: { flex: 1, fontSize: 13, color: "#e2e8f0" },
  gpsStrong: { fontWeight: "800", color: "#ffffff" },
  gpsStop: { fontSize: 13, fontWeight: "800", color: color.brand },
  scroll: { padding: space.lg, gap: space.md },
  heroCard: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    overflow: "hidden",
    ...shadow.card,
  },
  heroCardBody: { padding: 0 },
  activeTrip: { padding: space.lg },
  activeHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tripNo: { fontSize: 12, color: color.mutedForeground, fontFamily: "monospace" },
  track: { flexDirection: "row", gap: 3, marginTop: 14 },
  trackStep: { flex: 1, height: 4, borderRadius: 2 },
  tripFigures: { flexDirection: "row", gap: 10, marginTop: 14 },
  figure: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12, backgroundColor: color.muted },
  figureValue: { fontSize: 20, fontWeight: "800", color: color.foreground },
  figureLabel: { fontSize: 11.5, color: color.mutedForeground, marginTop: 1 },
  quick: { flexDirection: "row", gap: 9 },
  quickItem: {
    flex: 1,
    minHeight: 86,
    backgroundColor: color.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#f45a181f",
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: { fontSize: 11.5, fontWeight: "700", color: color.foreground, textAlign: "center" },
  alert: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "#b4530947",
    padding: space.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  alertIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#b453091f",
    alignItems: "center",
    justifyContent: "center",
  },
  alertTitle: { fontSize: 14, fontWeight: "700", color: color.foreground },
  alertText: { fontSize: 12, color: color.mutedForeground, marginTop: 2, lineHeight: 18 },
  section: { gap: space.md },
  sectionHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  sectionTitle: { fontSize: font.bodyLg, fontWeight: "800", color: color.foreground },
  sectionMeta: { fontSize: 12.5, color: color.mutedForeground, fontWeight: "700" },
  link: { fontSize: 13, fontWeight: "800", color: color.brand },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    width: "47.5%",
    flexGrow: 1,
    minHeight: 122,
    backgroundColor: color.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.lg,
    ...shadow.card,
  },
  tileIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  tileValue: { fontSize: 30, fontWeight: "800", color: color.foreground, marginTop: 9 },
  tileLabel: { fontSize: 12.5, color: color.mutedForeground, fontWeight: "600", marginTop: 1 },
  list: { backgroundColor: color.card, borderRadius: radius.card, borderWidth: 1, borderColor: color.border, overflow: "hidden", ...shadow.card },
  chatRow: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md },
  divider: { borderTopWidth: 1, borderTopColor: color.border },
  chatAvatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: color.muted, alignItems: "center", justifyContent: "center" },
  chatAvatarText: { fontSize: 13, fontWeight: "800", color: color.mutedForeground },
  chatName: { fontSize: 14, fontWeight: "700", color: color.foreground },
  chatMsg: { fontSize: 12.5, color: color.mutedForeground, marginTop: 1 },
  chatTime: { fontSize: 11.5, color: color.mutedForeground, fontWeight: "600" },
});
