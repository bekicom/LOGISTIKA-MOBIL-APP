/**
 * F1 — chat ro'yxati.
 *
 * Reysga bog'langan suhbat ostida reys belgisi turadi: dispetcherda
 * o'nlab suhbat bo'ladi va qaysi biri qaysi reysga tegishli ekani
 * darrov bilinishi kerak.
 *
 * A-qadam (2026-09-06, web bilan moslik): yordam suhbati DOIM
 * tepada alohida qatorda (`type === "SUPPORT"` — ro'yxatdan
 * ajratiladi, aks holda «Shaxsiy» ichida yo'qolardi); «Guruhlar»
 * yorlig'i — yo'nalish bo'yicha ochiq guruhlar, qo'shilish/chiqish;
 * «Muhim» — qadalgan suhbatlar; uzoq bosilsa — muhim / ovozsiz.
 */
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon, type IconName } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { groupAbout, groupTitle } from "@/lib/chat";
import { tariffBlocked } from "@/lib/features";
import { color, font, radius, shadow, space } from "@/lib/theme";
import { currentLocale, t } from "@/lib/i18n";

type Chat = {
  id: string;
  type: "PRIVATE" | "GROUP" | "SUPPORT";
  title: string;
  subtitle: string | null;
  tripId: string | null;
  bucket: "private" | "trip" | "contract" | "route";
  pinned: boolean;
  muted: boolean;
  unread: number;
  lastText: string | null;
  lastAt: string | null;
};
type Group = { key: string; chatId: string | null; members: number; joined: boolean; lastAt: string | null };

/* FUNKSIYA, o'zgarmas emas: modul yuklanganda til hali
   o'qilmagan bo'ladi va matn o'zbekchada qotib qolardi. */
function tabs() {
  return [
    { key: "all", label: t("mob.common.all") },
    { key: "unread", label: t("mob.ui.unread") },
    { key: "trip", label: t("mob.ui.tripChats") },
    { key: "contract", label: t("mob.chatList.contracts") },
    { key: "route", label: t("mob.chatList.groups") },
    { key: "private", label: t("mob.chat.private") },
    { key: "pinned", label: t("mob.chatList.pinned") },
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
  return d.toLocaleDateString(currentLocale(), { day: "numeric", month: "short" });
}

export default function ChatRoyxati() {
  const [tab, setTab] = useState<string>("all");
  const [held, setHeld] = useState<Chat | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, loading, error, refreshing, refresh, reload } = useApi<{ chats: Chat[]; unread: number }>("/api/chats");
  const groups = useApi<{ groups: Group[] }>(tab === "route" ? "/api/chat/groups" : null, [tab]);

  const all = data?.chats ?? [];
  const support = all.find((c) => c.type === "SUPPORT") ?? null;
  const rest = all.filter((c) => c.type !== "SUPPORT");
  const chats =
    tab === "unread" ? rest.filter((c) => c.unread > 0)
    : tab === "pinned" ? rest.filter((c) => c.pinned)
    : tab === "all" || tab === "route" ? rest
    : rest.filter((c) => c.bucket === tab);

  const openChat = useCallback(
    (c: Chat) =>
      router.push({
        pathname: "/suhbat/[id]",
        params: { id: c.id, title: c.title, pinned: c.pinned ? "1" : "0", muted: c.muted ? "1" : "0" },
      }),
    [router],
  );

  async function setFlag(c: Chat, patch: { isPinned?: boolean; isMuted?: boolean }) {
    setHeld(null);
    try {
      await api(`/api/chats/${c.id}/flags`, { method: "PATCH", body: patch });
      reload();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.msg.actionFailed"));
    }
  }

  async function joinGroup(g: Group, join: boolean) {
    /* Qo'shilish tarif ortida; CHIQISH darvozadan oldin — tarifi
       tugagan odam guruhda qamalib qolmasin (server ham shunday) */
    if (join && tariffBlocked("messenger")) return;
    setBusyKey(g.key);
    setErr(null);
    try {
      const r = await api<{ chatId?: string }>("/api/chat/groups", { method: "POST", body: { routeKey: g.key, join } });
      if (join && r.chatId) {
        router.push({ pathname: "/suhbat/[id]", params: { id: r.chatId, title: groupTitle(g.key) } });
      }
      groups.reload();
      reload();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.msg.actionFailed"));
    } finally {
      setBusyKey(null);
    }
  }

  useEffect(() => {
    if (err) {
      const id = setTimeout(() => setErr(null), 4000);
      return () => clearTimeout(id);
    }
  }, [err]);

  const Support = (
    <Pressable onPress={() => router.push("/yordam")} style={({ pressed }) => [s.support, pressed && { opacity: 0.85 }]}>
      <View style={s.supportIcon}>
        <Icon name="headset" size={22} stroke="#fff" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={s.supportTitle}>{t("mob.support.team")}</Text>
          <View style={s.supportTag}><Text style={s.supportTagText}>{t("mob.chat.support")}</Text></View>
        </View>
        <Text style={s.supportSub} numberOfLines={1}>{support?.lastText ?? t("mob.support.rowHint")}</Text>
      </View>
      {support && support.unread > 0 ? (
        <View style={s.badge}><Text style={s.badgeText}>{support.unread}</Text></View>
      ) : (
        <Icon name="chevron" size={18} stroke={color.brand} />
      )}
    </Pressable>
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.head}>
        <View style={s.headRow}>
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
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => router.push("/profil/messenger")} hitSlop={8} style={s.langBtn} accessibilityLabel={t("mob.chatLang.title")}>
            <Icon name="globe" size={19} stroke={color.foreground} />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
          {tabs().map((tb) => {
            const on = tab === tb.key;
            const n = tb.key === "unread" ? (data?.unread ?? 0) : tb.key === "pinned" ? rest.filter((c) => c.pinned).length : 0;
            return (
              <Pressable key={tb.key} onPress={() => setTab(tb.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[s.tab, on && s.tabOn]}>
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

      {err ? (
        <View style={s.errBar}>
          <Icon name="alert" size={15} stroke={color.danger} />
          <Text style={s.errText}>{err}</Text>
        </View>
      ) : null}

      {tab === "route" ? (
        <FlatList
          data={groups.data?.groups ?? []}
          keyExtractor={(g) => g.key}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + space.xl }]}
          refreshControl={<RefreshControl refreshing={groups.refreshing} onRefresh={groups.refresh} tintColor={color.brand} />}
          ListHeaderComponent={<Text style={s.groupsHint}>{t("mob.chatList.groupsHint")}</Text>}
          renderItem={({ item: g }) => (
            <View style={s.row}>
              <View style={[s.avatar, s.avatarGroup]}>
                <Icon name="users" size={22} stroke={color.blue} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.name} numberOfLines={1}>{groupTitle(g.key)}</Text>
                <Text style={s.last} numberOfLines={2}>{groupAbout(g.key)}</Text>
                <Text style={s.members}>{t("mob.chatList.members", { n: g.members })}</Text>
              </View>
              {g.joined && g.chatId ? (
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <Pressable
                    onPress={() => router.push({ pathname: "/suhbat/[id]", params: { id: g.chatId!, title: groupTitle(g.key) } })}
                    style={s.openBtn}
                  >
                    <Text style={s.openText}>{t("mob.chatList.open")}</Text>
                  </Pressable>
                  <Pressable onPress={() => joinGroup(g, false)} disabled={busyKey === g.key} hitSlop={6}>
                    <Text style={s.leave}>{t("mob.chatList.leave")}</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => joinGroup(g, true)} disabled={busyKey === g.key} style={s.joinBtn}>
                  <Text style={s.joinText}>{t("mob.chatList.join")}</Text>
                </Pressable>
              )}
            </View>
          )}
          ListEmptyComponent={groups.loading ? <Skeleton rows={2} /> : groups.error ? <ErrorBox message={groups.error} onRetry={groups.reload} /> : null}
        />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(c) => c.id}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + space.xl }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={tab === "all" ? Support : null}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openChat(item)}
              onLongPress={() => setHeld(item)}
              delayLongPress={300}
              style={({ pressed }) => [s.row, item.unread > 0 && s.rowUnread, pressed && { opacity: 0.85 }]}
            >
              <View style={[s.avatar, item.type === "GROUP" && s.avatarGroup]}>
                {item.type === "GROUP" ? (
                  <Icon name="users" size={22} stroke={color.blue} />
                ) : (
                  <Text style={s.avatarText}>{item.title.slice(0, 2).toUpperCase()}</Text>
                )}
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  {item.pinned ? <Icon name="pin" size={13} stroke={color.brand} /> : null}
                  <Text style={[s.name, item.unread === 0 && s.nameRead]} numberOfLines={1}>{item.title}</Text>
                  {item.muted ? <Icon name="bell" size={13} stroke="#cbd5e1" /> : null}
                </View>
                {item.lastText ? <Text style={s.last} numberOfLines={1}>{item.lastText}</Text> : null}
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
            loading ? <Skeleton rows={2} /> : error ? <ErrorBox message={error} onRetry={reload} /> : tab !== "all" ? (
              <Empty icon="chat" title={t("mob.chat.emptyTab")} />
            ) : (
              <Empty icon="chat" title={t("mob.chat.empty")} text={t("mob.ui.chatEmptyText")} />
            )
          }
        />
      )}

      {/* Uzoq bosish: muhim / ovozsiz */}
      <Sheet open={!!held} onClose={() => setHeld(null)} title={held?.title}>
        {held ? (
          <>
            <Row icon="pin" label={t(held.pinned ? "mob.msg.menu.unpinChat" : "mob.msg.menu.pinChat")} onPress={() => setFlag(held, { isPinned: !held.pinned })} />
            <Row icon="bell" label={t(held.muted ? "mob.msg.menu.unmute" : "mob.msg.menu.mute")} onPress={() => setFlag(held, { isMuted: !held.muted })} last />
          </>
        ) : null}
      </Sheet>
    </View>
  );
}

function Row({ icon, label, onPress, last }: { icon: IconName; label: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.menuRow, !last && s.menuDivider, pressed && { opacity: 0.6 }]}>
      <Icon name={icon} size={19} stroke="#475569" />
      <Text style={s.menuLabel}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  head: { paddingTop: 4, paddingBottom: space.sm, gap: space.md },
  headRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: space.lg },
  back: { width: 40, height: 40, marginLeft: -10, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "800", color: color.foreground, letterSpacing: -0.5 },
  langBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.card, alignItems: "center", justifyContent: "center", ...shadow.card },
  unreadPill: { minWidth: 24, height: 24, paddingHorizontal: 8, borderRadius: 12, backgroundColor: color.brand, alignItems: "center", justifyContent: "center", marginLeft: 4 },
  unreadPillText: { fontSize: 12, fontWeight: "800", color: "#ffffff" },

  tabs: { flexDirection: "row", gap: 7, paddingHorizontal: space.lg },
  tab: { height: 34, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: color.card, flexDirection: "row", alignItems: "center", gap: 6, ...shadow.card },
  tabOn: { backgroundColor: color.blue },
  tabText: { fontSize: 13, fontWeight: "600", color: color.mutedForeground },
  tabTextOn: { fontWeight: "700", color: "#fff" },
  tabBadge: { minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: color.brand, alignItems: "center", justifyContent: "center" },
  tabBadgeText: { fontSize: 10, fontWeight: "700", color: "#fff" },

  errBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: space.lg, paddingVertical: 8, backgroundColor: color.dangerSoft },
  errText: { fontSize: 12, color: color.danger, flex: 1 },

  list: { padding: space.lg, paddingTop: space.sm, gap: space.sm },
  support: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: color.brandSoft, borderRadius: radius.card, padding: space.md, marginBottom: 4 },
  supportIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: color.brand, alignItems: "center", justifyContent: "center" },
  supportTitle: { fontSize: font.body, fontWeight: "800", color: color.foreground, flexShrink: 1 },
  supportTag: { paddingHorizontal: 7, height: 18, borderRadius: 9, backgroundColor: color.brand, justifyContent: "center" },
  supportTagText: { fontSize: 9.5, fontWeight: "800", color: "#fff", letterSpacing: 0.3 },
  supportSub: { fontSize: font.caption, color: color.mutedForeground, marginTop: 2 },

  row: { flexDirection: "row", gap: space.md, alignItems: "center", backgroundColor: color.card, borderRadius: radius.card, padding: space.md, ...shadow.card },
  rowUnread: { backgroundColor: "#fff7f2" },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.muted, alignItems: "center", justifyContent: "center" },
  avatarGroup: { backgroundColor: color.blueSoft },
  avatarText: { fontSize: 15, fontWeight: "700", color: color.mutedForeground },
  name: { fontSize: font.body, fontWeight: "700", color: color.foreground, flexShrink: 1 },
  nameRead: { fontWeight: "600", color: "#475569" },
  last: { fontSize: font.caption, color: color.mutedForeground, marginTop: 2 },
  members: { fontSize: 11.5, color: "#94a3b8", marginTop: 3 },
  tripTag: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 },
  tripText: { fontSize: 11, fontWeight: "600", color: "#c2490f", flexShrink: 1 },
  time: { fontSize: 11, color: color.mutedForeground },
  badge: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: color.brand, alignItems: "center", justifyContent: "center" },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },

  groupsHint: { fontSize: 12.5, color: color.mutedForeground, lineHeight: 18, marginBottom: 6 },
  openBtn: { height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: color.blue, justifyContent: "center" },
  openText: { fontSize: 12.5, fontWeight: "700", color: "#fff" },
  leave: { fontSize: 11.5, color: color.mutedForeground },
  joinBtn: { height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: color.brand, justifyContent: "center" },
  joinText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  menuRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 4 },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: color.border },
  menuLabel: { fontSize: 15, fontWeight: "600", color: color.foreground },
});
