/**
 * B2 — bildirishnomalar.
 *
 * Endpoint web bilan bir xil (`/api/notifications`) — u allaqachon
 * kategoriya, ustuvorlik va o'qilgan holatini qaytaradi.
 */
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon, type IconName } from "@/components/Icon";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, font, radius, shadow, space } from "@/lib/theme";

type Note = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  category: string | null;
  isRead: boolean;
  createdAt: string;
};

const TABS = [
  { key: "all", label: "Hammasi" },
  { key: "tasks", label: "Vazifa" },
  { key: "problems", label: "Muammo" },
] as const;

/** Turini ikonka va rangga bog'lash — web'dagi kategoriyalarga tayanadi */
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
  if (d.toDateString() === today.toDateString()) return "BUGUN";
  if (d.toDateString() === y.toDateString()) return "KECHA";
  return d.toLocaleDateString("uz-UZ", { day: "numeric", month: "long" }).toUpperCase();
}

function hhmm(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function Bildirishnomalar() {
  const [tab, setTab] = useState<string>("all");
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, loading, error, refreshing, refresh, reload } = useApi<{ items: Note[]; unread: number }>(
    `/api/notifications?tab=${tab}&limit=40`,
    [tab],
  );

  async function markAll() {
    // Server har bir xabarni alohida belgilaydi — hammasi uchun bitta
    // amal yo'q. Ro'yxat kichik (40 tagacha), shuning uchun yetarli.
    const unread = (data?.items ?? []).filter((n) => !n.isRead);
    await Promise.all(
      unread.map((n) => api("/api/notifications", { method: "POST", body: { id: n.id, action: "read" } }).catch(() => null)),
    );
    reload();
  }

  // Kun bo'yicha guruhlash — ro'yxatga sarlavha qatorlari qo'shiladi
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
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.head}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.back}>
          <Icon name="back" size={22} stroke={color.foreground} />
        </Pressable>
        <Text style={s.title}>Bildirishnomalar</Text>
        {(data?.unread ?? 0) > 0 ? (
          <Pressable onPress={markAll} hitSlop={8}>
            <Text style={s.link}>Hammasi o&apos;qildi</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={s.tabs}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={[s.tab, tab === t.key && s.tabOn]}>
            <Text style={[s.tabText, tab === t.key && s.tabTextOn]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r, i) => (r.kind === "day" ? `d${i}` : r.id)}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + space.xl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          if (item.kind === "day") return <Text style={s.day}>{item.label}</Text>;
          const l = look(item.type);
          return (
            <View style={[s.note, !item.isRead && s.noteUnread]}>
              <View style={[s.noteIcon, { backgroundColor: l.tint + "1f" }]}>
                <Icon name={l.icon} size={19} stroke={l.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.noteTitle, item.isRead && { fontWeight: "500", color: "#475569" }]}>
                  {item.title}
                </Text>
                {item.body ? <Text style={s.noteBody}>{item.body}</Text> : null}
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <Text style={s.time}>{hhmm(item.createdAt)}</Text>
                {!item.isRead ? <View style={s.dot} /> : null}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <Skeleton rows={2} />
          ) : error ? (
            <ErrorBox message={error} onRetry={reload} />
          ) : (
            <Empty icon="bell" title="Hammasi o'qilgan" text="Yangi bildirishnoma yo'q." />
          )
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  head: {
    backgroundColor: color.card, flexDirection: "row", alignItems: "center",
    paddingHorizontal: 8, paddingVertical: 4, gap: 4,
  },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 19, fontWeight: "700", color: color.foreground },
  link: { fontSize: 13, fontWeight: "600", color: color.brand, paddingRight: space.md },

  tabs: {
    backgroundColor: color.card, flexDirection: "row", gap: 7,
    paddingHorizontal: space.lg, paddingBottom: space.md,
    borderBottomWidth: 1, borderBottomColor: color.border,
  },
  tab: { height: 32, paddingHorizontal: 13, borderRadius: radius.control, backgroundColor: color.muted, justifyContent: "center" },
  tabOn: { backgroundColor: color.foreground },
  tabText: { fontSize: 13, fontWeight: "500", color: "#475569" },
  tabTextOn: { fontWeight: "600", color: "#fff" },

  list: { padding: space.lg, gap: space.sm },
  day: { fontSize: 12, fontWeight: "600", color: color.mutedForeground, letterSpacing: 0.4, marginTop: space.sm, marginBottom: 2 },

  note: {
    flexDirection: "row", gap: space.md, backgroundColor: color.card,
    borderRadius: radius.card, borderWidth: 1, borderColor: color.border,
    padding: space.lg, ...shadow.card,
  },
  noteUnread: { backgroundColor: "#fffaf7", borderColor: "#f45a1826" },
  noteIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  noteTitle: { fontSize: 14, fontWeight: "600", color: color.foreground },
  noteBody: { fontSize: font.caption, color: "#475569", marginTop: 2, lineHeight: 19 },
  time: { fontSize: 11, color: color.mutedForeground },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.brand },
});
