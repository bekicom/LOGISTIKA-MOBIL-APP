/**
 * Q1 — umumiy qidiruv.
 *
 * ── BO'LIMLARGA AJRATILGAN ──────────────────────────────────────
 *
 * Aralash ro'yxat 393px da o'qilmaydi: odam «bu yuk edimi yoki
 * mashina» deb har qatorni qayta o'qib chiqardi. Bo'lim
 * sarlavhasi shu savolni bir marta yopadi.
 *
 * ── NATIJA KAM BO'LSA — BO'LIM TAVSIYASI ────────────────────────
 *
 * Bo'sh ekran o'rniga qayerga borish kerakligi (TZ §63).
 *
 * ── HAVOLA SERVERDAN KELMAYDI ───────────────────────────────────
 *
 * `Hit.href` web manzili (`/loads/xxx`). Ilovaga `kind` va `id`
 * boradi, marshrutni ilova o'zi yasaydi — web manzilini ochish
 * «unmatched route» berardi.
 */
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { useApi } from "@/lib/use-api";
import { color, radius, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Item = { id: string; title: string; subtitle: string | null; meta: string | null };
type Group = { kind: string; items: Item[] };

/** `furam/src/lib/search.ts:KINDS` — ilovadagi marshrutga bog'lash */
const ROUTE: Record<string, (id: string) => Parameters<ReturnType<typeof useRouter>["push"]>[0]> = {
  load: (id) => ({ pathname: "/yuk/[id]", params: { id } }),
  truck: (id) => ({ pathname: "/mashina/[id]", params: { id } }),
  sale: (id) => ({ pathname: "/bozor/[id]", params: { id } }),
  part: (id) => ({ pathname: "/zapchast/[id]", params: { id } }),
  master: (id) => ({ pathname: "/ustaxona/[id]", params: { id } }),
  job: (id) => ({ pathname: "/ish/[id]", params: { id } }),
  trip: (id) => ({ pathname: "/reys/[id]", params: { id } }),
  contract: (id) => ({ pathname: "/shartnoma/[id]", params: { id } }),
  vehicle: (id) => ({ pathname: "/parkim/[id]", params: { id } }),
};

/** Tavsiya bosilganda qaysi bo'lim ochiladi */
const HINT_ROUTE: Record<string, string> = {
  loads: "/yuklar",
  trucks: "/mashinalar",
  jobs: "/ish",
  service: "/ustaxona",
  parts: "/zapchast",
  market: "/bozor",
  reports: "/analitika",
  finance: "/moliya",
  queue: "/navbat",
};

export default function Qidiruv() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  /* HAR HARFDA SO'ROV YUBORILMAYDI. Telefonda tez yozilganda bu
     o'nlab so'rov degani; javoblar tartibsiz kelib, ekran
     sakrab turardi. */
  useEffect(() => {
    const id = setTimeout(() => setQ(text.trim()), 400);
    return () => clearTimeout(id);
  }, [text]);

  const { data, loading, error, reload } = useApi<{
    tooShort: boolean;
    total: number;
    suggestions: string[];
    groups: Group[];
  }>(q.length >= 2 ? `/api/search?q=${encodeURIComponent(q)}` : null, [q]);

  const groups = data?.groups ?? [];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.head}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.back}>
          <Icon name="back" size={22} stroke={color.foreground} />
        </Pressable>
        <View style={s.field}>
          <Icon name="search" size={18} stroke={color.mutedForeground} />
          <TextInput
            style={s.input}
            value={text}
            onChangeText={setText}
            placeholder={t("mob.search.placeholder")}
            placeholderTextColor={color.mutedForeground}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => setQ(text.trim())}
          />
          {text.length > 0 && (
            <Pressable onPress={() => setText("")} hitSlop={8}>
              <Icon name="close" size={17} stroke={color.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        {q.length < 2 ? (
          <Empty icon="search" title={t("mob.search.startTitle")} text={t("mob.search.startHint")} />
        ) : loading && !data ? (
          <Skeleton rows={3} />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : (
          <>
            {groups.map((g) => (
              <View key={g.kind}>
                <Text style={s.group}>
                  {t(`kind.${g.kind}`)} · {g.items.length}
                </Text>
                <View style={[s.card, { padding: 0 }]}>
                  {g.items.map((it, i) => {
                    const go = ROUTE[g.kind];
                    return (
                      <Pressable
                        key={it.id}
                        style={[s.row, i < g.items.length - 1 && s.rowLine]}
                        onPress={go ? () => router.push(go(it.id)) : undefined}
                      >
                        <View style={{ flexGrow: 1, minWidth: 0 }}>
                          <Text style={s.rowTitle} numberOfLines={1}>
                            {it.title}
                          </Text>
                          {!!it.subtitle && (
                            <Text style={s.rowSub} numberOfLines={1}>
                              {it.subtitle}
                            </Text>
                          )}
                        </View>
                        {!!it.meta && <Text style={s.rowMeta}>{it.meta}</Text>}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}

            {groups.length === 0 && (
              <Empty
                icon="search"
                title={t("mob.search.noneTitle")}
                text={t("mob.search.noneHint")}
              />
            )}

            {/* ══ BO'LIM TAVSIYASI ══ */}
            {(data?.suggestions ?? []).length > 0 && (
              <View>
                <Text style={s.group}>{t("mob.search.maybeGroup")}</Text>
                <View style={s.chips}>
                  {data!.suggestions.map((k) => {
                    const href = HINT_ROUTE[k];
                    return (
                      <Pressable
                        key={k}
                        style={s.chip}
                        onPress={
                          href
                            ? () => router.push(href as Parameters<typeof router.push>[0])
                            : undefined
                        }
                      >
                        <Text style={s.chipText}>{t(`searchHint.${k}`)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },

  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: color.card,
    paddingHorizontal: space.md,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  field: {
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 44,
    borderRadius: 11,
    backgroundColor: color.muted,
    paddingHorizontal: 13,
  },
  input: { flexGrow: 1, fontSize: 15, color: color.foreground, padding: 0 },

  scroll: { padding: space.lg, gap: space.lg },
  group: {
    fontSize: 12,
    fontWeight: "600",
    color: color.mutedForeground,
    letterSpacing: 0.3,
    marginBottom: 7,
    marginLeft: 4,
  },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: space.md },
  rowLine: { borderBottomWidth: 1, borderBottomColor: color.muted },
  rowTitle: { fontSize: 14, fontWeight: "600", color: color.foreground },
  rowSub: { fontSize: 12, color: color.mutedForeground, marginTop: 2 },
  rowMeta: { fontSize: 12.5, color: color.mutedForeground },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    height: 34,
    paddingHorizontal: 13,
    borderRadius: 9,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    justifyContent: "center",
  },
  chipText: { fontSize: 13, fontWeight: "500", color: color.foreground },
});
