/**
 * F1 — chat ro'yxati.
 *
 * Reysga bog'langan suhbat ostida reys belgisi turadi: dispetcherda
 * o'nlab suhbat bo'ladi va qaysi biri qaysi reysga tegishli ekani
 * darrov bilinishi kerak.
 *
 * Dizayn-2: bu ekran tab emas, menyudan/sarlavhadan ochiladi —
 * orqaga tugmasi bor. Sarlavha chegarasiz, yorliqlar pill (faol
 * yarmi ko'k), suhbat kartalari soyali. Oy nomlari tizimdan.
 */
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { useApi } from "@/lib/use-api";
import { color, font, radius, shadow, space } from "@/lib/theme";
import { currentLocale, t } from "@/lib/i18n";

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
  /* Oy nomi tizimdan, tanlangan tilda — o'zbekcha ro'yxat qotib turardi */
  return d.toLocaleDateString(currentLocale(), { day: "numeric", month: "short" });
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
        <View style={s.headRow}>
          {/* Tarix bo'lmasa (push/deep link) bosh sahifaga */}
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/bosh"))}
            hitSlop={8}
            accessibilityRole="button"
            style={s.back}
          >
            <Icon name="back" size={22} stroke={color.foreground} />
          </Pressable>
          <Text style={s.title}>{t("mob.chat.title")}</Text>
          {(data?.unread ?? 0) > 0 ? (
            <View style={s.unreadPill}>
              <Text style={s.unreadPillText}>{data!.unread}</Text>
            </View>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
          {tabs().map((tb) => {
            const on = tab === tb.key;
            const n = tb.key === "unread" ? (data?.unread ?? 0) : 0;
            return (
              <Pressable
                key={tb.key}
                onPress={() => setTab(tb.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={[s.tab, on && s.tabOn]}
              >
                <Text style={[s.tabText, on && s.tabTextOn]}>{tb.label}</Text>
                {n > 0 ? (
                  <View style={[s.tabBadge, on && { backgroundColor: "#ffffff33" }]}>
                    <Text style={s.tabBadgeText}>{n}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={chats}
        keyExtractor={(c) => c.id}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + space.xl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/suhbat/${item.id}`)}
            style={({ pressed }) => [s.row, item.unread > 0 && s.rowUnread, pressed && { opacity: 0.85 }]}
          >
            <View style={[s.avatar, item.type === "GROUP" && s.avatarGroup]}>
              {item.type === "GROUP" ? (
                <Icon name="users" size={22} stroke={color.brand} />
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
  head: { paddingTop: 4, paddingBottom: space.sm, gap: space.md },
  headRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: space.lg },
  back: { width: 40, height: 40, marginLeft: -10, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "800", color: color.foreground, letterSpacing: -0.5 },
  unreadPill: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  unreadPillText: { fontSize: 12, fontWeight: "800", color: "#ffffff" },

  tabs: { flexDirection: "row", gap: 7, paddingHorizontal: space.lg },
  tab: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: color.card,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    ...shadow.card,
  },
  tabOn: { backgroundColor: color.blue },
  tabText: { fontSize: 13, fontWeight: "600", color: color.mutedForeground },
  tabTextOn: { fontWeight: "700", color: "#fff" },
  tabBadge: {
    minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9,
    backgroundColor: color.brand, alignItems: "center", justifyContent: "center",
  },
  tabBadgeText: { fontSize: 10, fontWeight: "700", color: "#fff" },

  list: { padding: space.lg, paddingTop: space.sm, gap: space.sm },
  row: {
    flexDirection: "row", gap: space.md, alignItems: "center", backgroundColor: color.card,
    borderRadius: radius.card, padding: space.md, ...shadow.card,
  },
  rowUnread: { backgroundColor: color.brandSoft },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.muted, alignItems: "center", justifyContent: "center" },
  avatarGroup: { backgroundColor: "#ffffff" },
  avatarText: { fontSize: 15, fontWeight: "700", color: color.mutedForeground },

  name: { fontSize: font.body, fontWeight: "700", color: color.foreground },
  nameRead: { fontWeight: "600", color: "#475569" },
  last: { fontSize: font.caption, color: color.mutedForeground, marginTop: 2 },
  tripTag: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 },
  tripText: { fontSize: 11, fontWeight: "600", color: "#c2490f", flexShrink: 1 },

  time: { fontSize: 11, color: color.mutedForeground },
  badge: {
    minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10,
    backgroundColor: color.brand, alignItems: "center", justifyContent: "center",
  },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },
});
