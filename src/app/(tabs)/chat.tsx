/**
 * F1 — chat ro'yxati.
 *
 * Reysga bog'langan suhbat ostida reys belgisi turadi: dispetcherda
 * o'nlab suhbat bo'ladi va qaysi biri qaysi reysga tegishli ekani
 * darrov bilinishi kerak.
 */
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { useApi } from "@/lib/use-api";
import { color, font, radius, shadow, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Chat = {
  id: string;
  type: "PRIVATE" | "GROUP" | "SUPPORT";
  title: string;
  subtitle: string | null;
  tripId: string | null;
  bucket: "private" | "trip" | "contract" | "route";
  muted: boolean;
  unread: number;
  lastText: string | null;
  lastAt: string | null;
};

/* FUNKSIYA, o'zgarmas emas: modul yuklanganda til hali
   o'qilmagan bo'ladi va matn o'zbekchada qotib qolardi. */
function tabs() {
  return [
  { key: "all", label: t("mob.common.all") },
  { key: "unread", label: t("mob.ui.unread") },
  { key: "trip", label: t("mob.ui.tripChats") },
  { key: "private", label: t("mob.chat.private") },
] as const;
}

function when(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  const y = new Date(Date.now() - 86400000);
  if (d.toDateString() === y.toDateString()) return t("mob.chat.yesterday");
  return `${d.getDate()}-${["yanv", "fev", "mart", "apr", "may", "iyun", "iyul", "avg", "sent", "okt", "noya", "dek"][d.getMonth()]}`;
}

export default function ChatRoyxati() {
  const [tab, setTab] = useState<string>("all");
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, loading, error, refreshing, refresh, reload } = useApi<{
    chats: Chat[];
    unread: number;
  }>("/api/chats");

  const all = data?.chats ?? [];
  const chats =
    tab === "unread" ? all.filter((c) => c.unread > 0)
    : tab === "trip" ? all.filter((c) => c.bucket === "trip")
    : tab === "private" ? all.filter((c) => c.bucket === "private")
    : all;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.head}>
        <Text style={s.title}>{t("mob.chat.title")}</Text>

        <View style={s.tabs}>
          {tabs().map((t) => {
            const on = tab === t.key;
            const n = t.key === "unread" ? (data?.unread ?? 0) : 0;
            return (
              <Pressable key={t.key} onPress={() => setTab(t.key)} style={[s.tab, on && s.tabOn]}>
                <Text style={[s.tabText, on && s.tabTextOn]}>{t.label}</Text>
                {n > 0 ? (
                  <View style={s.tabBadge}>
                    <Text style={s.tabBadgeText}>{n}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={chats}
        keyExtractor={(c) => c.id}
        contentContainerStyle={[s.list, { paddingBottom: space.xl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/suhbat/${item.id}`)}
            style={({ pressed }) => [s.row, item.unread > 0 && s.rowUnread, pressed && { backgroundColor: "#fafbfc" }]}
          >
            <View style={[s.avatar, item.type === "GROUP" && s.avatarGroup]}>
              {item.type === "GROUP" ? (
                <Icon name="user" size={22} stroke={color.brand} />
              ) : (
                <Text style={s.avatarText}>{item.title.slice(0, 2).toUpperCase()}</Text>
              )}
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[s.name, item.unread === 0 && s.nameRead]} numberOfLines={1}>
                {item.title}
              </Text>
              {item.lastText ? (
                <Text style={s.last} numberOfLines={1}>{item.lastText}</Text>
              ) : null}
              {item.bucket === "trip" && item.subtitle ? (
                <View style={s.tripTag}>
                  <Icon name="route" size={12} stroke="#c2490f" />
                  <Text style={s.tripText} numberOfLines={1}>{item.subtitle}</Text>
                </View>
              ) : null}
            </View>

            <View style={{ alignItems: "flex-end", gap: 6 }}>
              <Text style={s.time}>{when(item.lastAt)}</Text>
              {item.unread > 0 ? (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{item.unread > 99 ? "99+" : item.unread}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          loading ? (
            <Skeleton rows={2} />
          ) : error ? (
            <ErrorBox message={error} onRetry={reload} />
          ) : tab !== "all" ? (
            <Empty icon="chat" title={t("mob.chat.emptyTab")} />
          ) : (
            <Empty
              icon="chat"
              title={t("mob.chat.empty")}
              text={t("mob.ui.chatEmptyText")}
            />
          )
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  head: {
    backgroundColor: color.card, paddingHorizontal: space.lg, paddingTop: 4,
    paddingBottom: space.md, borderBottomWidth: 1, borderBottomColor: color.border, gap: space.md,
  },
  title: { fontSize: 22, fontWeight: "700", color: color.foreground, letterSpacing: -0.4 },

  tabs: { flexDirection: "row", gap: 7 },
  tab: {
    height: 32, paddingHorizontal: 13, borderRadius: radius.control, backgroundColor: color.muted,
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  tabOn: { backgroundColor: color.foreground },
  tabText: { fontSize: 13, fontWeight: "500", color: "#475569" },
  tabTextOn: { fontWeight: "600", color: "#fff" },
  tabBadge: {
    minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9,
    backgroundColor: color.brand, alignItems: "center", justifyContent: "center",
  },
  tabBadgeText: { fontSize: 10, fontWeight: "700", color: "#fff" },

  list: { padding: space.lg, gap: space.sm },
  row: {
    flexDirection: "row", gap: space.md, alignItems: "center", backgroundColor: color.card,
    borderRadius: radius.card, borderWidth: 1, borderColor: color.border, padding: space.md, ...shadow.card,
  },
  rowUnread: { backgroundColor: "#fffaf7", borderColor: "#f45a1826" },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.muted, alignItems: "center", justifyContent: "center" },
  avatarGroup: { backgroundColor: "#f45a181f" },
  avatarText: { fontSize: 15, fontWeight: "600", color: color.mutedForeground },

  name: { fontSize: font.body, fontWeight: "600", color: color.foreground },
  nameRead: { fontWeight: "500", color: "#475569" },
  last: { fontSize: font.caption, color: color.mutedForeground, marginTop: 2 },
  tripTag: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 },
  tripText: { fontSize: 11, fontWeight: "500", color: "#c2490f", flexShrink: 1 },

  time: { fontSize: 11, color: color.mutedForeground },
  badge: {
    minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10,
    backgroundColor: color.brand, alignItems: "center", justifyContent: "center",
  },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },
});
