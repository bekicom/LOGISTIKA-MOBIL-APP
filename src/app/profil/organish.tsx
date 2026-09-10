/**
 * «Mening o'rganish yo'lim» — odam O'Z taraqqiyotini ko'radi.
 *
 * Mijoz talabi: har bir foydalanuvchi roliga tegishli barcha
 * imkoniyatlarni bosqichma-bosqich ko'rib, kamida bir marta
 * ishlatib chiqishi kerak.
 *
 * ⚠️ QIZIL RANG YO'Q — bu o'rgatish, imtihon emas. Ishlatilmagan
 * bo'lim neytral, ishlatilgani yashil, keyingi qadam brend
 * rangida. «Nechtasini qilmadingiz» emas, «yana nechtasi bor».
 *
 * Ro'yxat va sanoq serverdan keladi (`progressView` — web bilan
 * bitta mantiq), bo'lim nomi va izohi kalit bilan (`svc.*`,
 * `onboardBody.*` — sakkiz tilda tayyor).
 */
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { Header } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { useApi } from "@/lib/use-api";
import { webToApp } from "@/lib/routes";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t, tOr } from "@/lib/i18n";

type Item = { section: string; href: string; state: string; next: boolean };
type Progress = { total: number; done: number; pct: number; waiting: Item[]; mastered: Item[] };

export default function Organish() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, loading, error, refreshing, refresh, reload } = useApi<Progress>("/api/profile/progress");

  function open(it: Item) {
    const to = webToApp(it.href);
    if (to) router.push(to as Parameters<typeof router.push>[0]);
  }

  return (
    <View style={s.root}>
      <Header title={t("mob.prog.title")} />
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.lead}>{t("mob.prog.lead")}</Text>

        {loading && !data ? <Skeleton rows={2} /> : null}
        {error && !data ? <ErrorBox message={error} onRetry={reload} /> : null}

        {data && data.total === 0 ? (
          <Empty icon="grid" title={t("mob.prog.noneTitle")} text={t("mob.prog.noneBody")} />
        ) : null}

        {data && data.total > 0 ? (
          <>
            {/* Hisob */}
            <View style={s.card}>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                <Text style={s.big}>{data.done}</Text>
                <Text style={s.total}>/ {data.total}</Text>
                <View style={{ flex: 1 }} />
                <Text style={s.pct}>{data.pct}%</Text>
              </View>
              {/* Eng kami 2% ko'rinadi: noldagi chiziq umuman
                  ko'rinmasa, ekran buzilgandek tuyulardi */}
              <View style={s.bar}>
                <View
                  style={[
                    s.barFill,
                    { width: `${Math.max(2, data.pct)}%`, backgroundColor: data.done === data.total ? color.success : color.brand },
                  ]}
                />
              </View>
              <Text style={s.countLine}>{t("mob.prog.count", { done: data.done, total: data.total })}</Text>
              <Text style={s.meta}>
                {data.waiting.length > 0 ? t("mob.prog.left", { n: data.waiting.length }) : t("mob.prog.allDone")}
              </Text>
            </View>

            {data.waiting.length > 0 ? (
              <Group title={t("mob.prog.waiting")} items={data.waiting} onOpen={open} />
            ) : null}
            {data.mastered.length > 0 ? (
              <Group title={t("mob.prog.mastered")} items={data.mastered} onOpen={open} done />
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Group({ title, items, onOpen, done }: { title: string; items: Item[]; onOpen: (i: Item) => void; done?: boolean }) {
  return (
    <View>
      <Text style={s.group}>{title}</Text>
      <View style={{ gap: 8 }}>
        {items.map((it) => (
          <Pressable
            key={it.section}
            onPress={() => onOpen(it)}
            style={({ pressed }) => [s.row, it.next && s.rowNext, pressed && { opacity: 0.85 }]}
          >
            <View style={[s.icon, { backgroundColor: done ? color.successSoft : it.next ? color.brandSoft : color.muted }]}>
              <Icon
                name={done ? "check" : it.next ? "arrow-right" : "grid"}
                size={19}
                stroke={done ? color.success : it.next ? color.brand : color.mutedForeground}
              />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={s.name} numberOfLines={1}>{tOr(`svc.${it.section}`, it.section)}</Text>
                {it.next ? (
                  <View style={s.nextTag}><Text style={s.nextTagText}>{t("mob.prog.next")}</Text></View>
                ) : null}
              </View>
              <Text style={s.meta} numberOfLines={2}>{tOr(`onboardBody.${it.section}`, "")}</Text>
            </View>
            <Icon name="chevron" size={17} stroke="#cbd5e1" />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },
  lead: { fontSize: 13.5, color: color.mutedForeground, lineHeight: 20 },

  card: { backgroundColor: color.card, borderRadius: radius.card, padding: space.lg, ...shadow.card },
  big: { fontSize: 34, fontWeight: "800", color: color.foreground, letterSpacing: -1, fontVariant: ["tabular-nums"] },
  total: { fontSize: 18, fontWeight: "700", color: color.mutedForeground, fontVariant: ["tabular-nums"] },
  pct: { fontSize: 15, fontWeight: "800", color: color.mutedForeground, fontVariant: ["tabular-nums"] },
  bar: { height: 8, borderRadius: 4, backgroundColor: color.muted, marginTop: 12, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  countLine: { fontSize: 14, fontWeight: "600", color: color.foreground, marginTop: 12 },
  meta: { fontSize: 12.5, color: color.mutedForeground, marginTop: 3, lineHeight: 18 },

  group: { fontSize: 12, fontWeight: "700", color: color.mutedForeground, letterSpacing: 0.4, marginBottom: 8, marginLeft: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: color.card, borderRadius: radius.card, padding: space.md, ...shadow.card },
  rowNext: { backgroundColor: color.brandSoft },
  icon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 14.5, fontWeight: "700", color: color.foreground, flexShrink: 1 },
  nextTag: { paddingHorizontal: 8, height: 19, borderRadius: 10, backgroundColor: color.brand, justifyContent: "center" },
  nextTagText: { fontSize: 10, fontWeight: "800", color: "#fff" },
}));
