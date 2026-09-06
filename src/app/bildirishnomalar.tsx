/**
 * B2 — bildirishnomalar.
 *
 * Endpoint web bilan bir xil (`/api/notifications`) — u allaqachon
 * kategoriya, ustuvorlik va o'qilgan holatini qaytaradi.
 */
import { useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Icon, type IconName } from "@/components/Icon";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { setBadge } from "@/lib/push";
import { color, font, radius, shadow, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Note = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  category: string | null;
  isRead: boolean;
  createdAt: string;
};

function tabs() {
  return [
    { key: "all", label: t("mob.common.all") },
    { key: "task", label: t("mob.notes.task") },
    { key: "problem", label: t("mob.notes.problem") },
  ] as const;
}

function look(type: string): { icon: IconName; tint: string } {
  if (type.startsWith("trip")) return { icon: "route", tint: color.brand };
  if (type.startsWith("chat") || type.startsWith("message")) return { icon: "chat", tint: color.info };
  if (type.startsWith("doc")) return { icon: "doc", tint: color.warning };
  if (type.includes("pay") || type.includes("balance")) return { icon: "check", tint: color.success };
  if (type.startsWith("border") || type.startsWith("queue")) return { icon: "border", tint: color.warning };
  if (type.includes("load") || type.includes("match")) return { icon: "package", tint: color.mutedForeground };
  return { icon: "bell", tint: color.mutedForeground };
}

function day(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return t("mob.notes.today");
  if (d.toDateString() === y.toDateString()) return t("mob.notes.yesterday");
  return d.toLocaleDateString("uz-UZ", { day: "numeric", month: "long" }).toUpperCase();
}

function hhmm(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function Bildirishnomalar() {
  const { tab: want } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<string>(
    want && ["all", "task", "problem"].includes(want) ? want : "all",
  );
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, loading, error, refreshing, refresh, reload } = useApi<{ items: Note[]; unread: number }>(
    `/api/notifications?tab=${tab}&limit=40`,
    [tab],
  );

  useEffect(() => {
    if (data) void setBadge(data.unread ?? 0);
  }, [data]);

  async function markAll() {
    const unread = (data?.items ?? []).filter((n) => !n.isRead);
    await Promise.all(
      unread.map((n) => api("/api/notifications", { method: "POST", body: { id: n.id, action: "read" } }).catch(() => null)),
    );
    reload();
  }

  const rows: ({ kind: "day"; label: string } | ({ kind: "note" } & Note))[] = [];
  let last = "";
  for (const n of data?.items ?? []) {
    const d = day(n.createdAt);
    if (d !== last) {
      rows.push({ kind: "day", label: d });
      last = d;
    }
    rows.push({ kind: "note", ...n });
  }

  return (
    <View style={s.root}>
      <View style={[s.headerWrap, { paddingTop: insets.top + space.xs }]}>
        <View style={s.head}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={s.back}>
            <Icon name="back" size={22} stroke={color.foreground} />
          </Pressable>
          <Text style={s.title}>{t("mob.notes.title")}</Text>
          {(data?.unread ?? 0) > 0 ? (
            <Pressable onPress={markAll} hitSlop={8} style={({ pressed }) => [s.mark, pressed && { opacity: 0.7 }]}>
              <Text style={s.markText}>{t("mob.notes.markAll")}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={s.tabs}>
          {tabs().map((item) => (
            <Pressable key={item.key} onPress={() => setTab(item.key)} style={[s.tab, tab === item.key && s.tabOn]}>
              <Text style={[s.tabText, tab === item.key && s.tabTextOn]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r, i) => (r.kind === "day" ? `d${i}` : r.id)}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + space.xl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          if (item.kind === "day") return <Text style={s.day}>{item.label}</Text>;
          return <NotificationCard item={item} />;
        }}
        ListEmptyComponent={
          loading ? (
            <Skeleton rows={2} />
          ) : error ? (
            <ErrorBox message={error} onRetry={reload} />
          ) : (
            <Empty icon="bell" title={t("mob.ui.allRead")} text={t("mob.ui.noNewNotes")} />
          )
        }
      />
    </View>
  );
}

function NotificationCard({ item }: { item: Note }) {
  const l = look(item.type);

  return (
    <View style={[s.note, !item.isRead && s.noteUnread]}>
      <View style={[s.noteIcon, { backgroundColor: l.tint + "1f" }]}>
        <Icon name={l.icon} size={19} stroke={l.tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.noteTitle, item.isRead && s.noteTitleRead]}>{item.title}</Text>
        {item.body ? <Text style={s.noteBody}>{item.body}</Text> : null}
        {item.category ? <Text style={s.category}>{item.category}</Text> : null}
      </View>
      <View style={s.noteSide}>
        <Text style={s.time}>{hhmm(item.createdAt)}</Text>
        {!item.isRead ? <View style={s.dot} /> : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  headerWrap: {
    backgroundColor: color.card,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  head: { flexDirection: "row", alignItems: "center", minHeight: 48 },
  back: { width: 44, height: 44, marginLeft: -12, alignItems: "center", justifyContent: "center" },
  mark: {
    minHeight: 38,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(244,90,24,0.42)",
    backgroundColor: "rgba(244,90,24,0.12)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  markText: { fontSize: 13, fontWeight: "800", color: color.brand },
  title: { flex: 1, fontSize: 19, fontWeight: "800", color: color.foreground },
  tabs: { flexDirection: "row", gap: 8, marginTop: space.sm },
  tab: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  tabOn: { backgroundColor: color.foreground, borderColor: color.foreground },
  tabText: { fontSize: 13, fontWeight: "700", color: "#64748b" },
  tabTextOn: { color: "#ffffff" },
  list: { padding: space.lg, gap: space.sm },
  day: {
    fontSize: 12,
    fontWeight: "800",
    color: color.mutedForeground,
    letterSpacing: 0.45,
    marginTop: space.sm,
    marginBottom: 2,
  },
  note: {
    flexDirection: "row",
    gap: space.md,
    backgroundColor: color.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.lg,
    ...shadow.card,
  },
  noteUnread: {
    borderColor: "#f45a1840",
    backgroundColor: "#fffaf7",
    borderLeftWidth: 3,
    borderLeftColor: color.brand,
  },
  noteIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  noteTitle: { fontSize: 14.5, fontWeight: "800", color: color.foreground },
  noteTitleRead: { fontWeight: "600", color: "#475569" },
  noteBody: { fontSize: font.caption, color: "#475569", marginTop: 3, lineHeight: 19 },
  category: { fontSize: 11.5, color: color.mutedForeground, fontWeight: "700", marginTop: 7, textTransform: "uppercase" },
  noteSide: { alignItems: "flex-end", gap: 7 },
  time: { fontSize: 11.5, color: color.mutedForeground, fontWeight: "700" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.brand },
});
