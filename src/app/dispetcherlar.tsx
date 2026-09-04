/**
 * D1 — dispetcherlar.
 *
 * ── JAVOB TEZLIGI REYTINGDAN AMALIYROQ ──────────────────────────
 *
 * Dispetcherni tanlashda eng ko'p so'raladigan narsa «tez javob
 * beradimi». Baho ESKI ishlar haqida, javob tezligi esa bugungi
 * holat haqida — shuning uchun ikkalasi yonma-yon turadi.
 *
 * ── BAHOSI YO'Q BO'LSA NOL YOZILMAYDI ───────────────────────────
 *
 * Nol «yomon» degani. Yangi dispetcherda baho hali yo'q va shuni
 * shundayligicha aytish to'g'ri.
 *
 * ── TELEFON RAQAMI YO'Q ─────────────────────────────────────────
 *
 * Aks holda bo'lim raqam yig'ish joyiga aylanardi. Aloqa chat
 * orqali boshlanadi.
 */
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { useApi } from "@/lib/use-api";
import { color, radius, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Item = {
  id: string;
  name: string | null;
  furamId: number;
  verified: boolean;
  city: string | null;
  countries: string[];
  languages: string[];
  about: string | null;
  experienceY: number | null;
  rating: number | null;
  ratingCount: number;
  trips: number;
  responseRate: number | null;
};

export default function Dispetcherlar() {
  const [country, setCountry] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const { data, loading, error, refreshing, refresh, reload } = useApi<{
    items: Item[];
    countries: string[];
  }>(country ? `/api/dispatchers?country=${country}` : "/api/dispatchers", [country]);

  const items = data?.items ?? [];

  return (
    <View style={s.root}>
      <Header
        title={t("mob.disp.title")}
        subtitle={data ? t("mob.disp.countN", { n: items.length }) : undefined}
      />

      {/* Filtr — faqat kimdir ishlaydigan davlatlar. Bo'sh
          filtrni ko'rsatish «bu yerda hech kim yo'q» degan
          taassurot qoldirardi. */}
      {(data?.countries ?? []).length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabs}
          style={s.tabsWrap}
        >
          <Pressable style={[s.tab, !country && s.tabOn]} onPress={() => setCountry(null)}>
            <Text style={[s.tabText, !country && s.tabTextOn]}>{t("mob.common.all")}</Text>
          </Pressable>
          {data!.countries.map((c) => (
            <Pressable
              key={c}
              style={[s.tab, country === c && s.tabOn]}
              onPress={() => setCountry(c)}
            >
              <Text style={[s.tabText, country === c && s.tabTextOn]}>
                {t(`jobCatalog.countries.${c}`)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {loading && !data ? (
          <Skeleton rows={3} />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : items.length === 0 ? (
          <Empty icon="user" title={t("mob.disp.emptyTitle")} text={t("mob.disp.emptyHint")} />
        ) : (
          <>
            {items.map((d) => (
              <View key={d.id} style={s.card}>
                <View style={s.top}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{initials(d.name ?? "")}</Text>
                  </View>
                  <View style={{ flexGrow: 1, minWidth: 0 }}>
                    <View style={s.nameRow}>
                      <Text style={s.name} numberOfLines={1}>
                        {d.name ?? `FURAM-${d.furamId}`}
                      </Text>
                      {d.verified && <Icon name="check" size={14} stroke={color.info} />}
                    </View>
                    <Text style={s.meta} numberOfLines={1}>
                      {[
                        `FURAM-${d.furamId}`,
                        d.city,
                        d.experienceY ? t("mob.disp.yearsN", { n: d.experienceY }) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                </View>

                <View style={s.stats}>
                  <View>
                    <Text style={s.statKey}>{t("mob.disp.rating")}</Text>
                    {d.rating == null ? (
                      <Text style={s.statNone}>{t("mob.disp.noRating")}</Text>
                    ) : (
                      <Text style={s.statVal}>
                        {d.rating}{" "}
                        <Text style={s.statSub}>· {d.ratingCount}</Text>
                      </Text>
                    )}
                  </View>
                  <View>
                    <Text style={s.statKey}>{t("mob.disp.response")}</Text>
                    {d.responseRate == null ? (
                      <Text style={s.statNone}>—</Text>
                    ) : (
                      <Text
                        style={[
                          s.statVal,
                          { color: d.responseRate >= 80 ? color.success : color.warning },
                        ]}
                      >
                        {d.responseRate}%
                      </Text>
                    )}
                  </View>
                  <View>
                    <Text style={s.statKey}>{t("mob.disp.trips")}</Text>
                    <Text style={s.statVal}>{d.trips}</Text>
                  </View>
                </View>

                {d.countries.length > 0 && (
                  <View style={s.chips}>
                    {d.countries.slice(0, 4).map((c) => (
                      <View key={c} style={s.chip}>
                        <Text style={s.chipText}>{t(`jobCatalog.countries.${c}`)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}

            <View style={s.note}>
              <Icon name="alert" size={16} stroke={color.mutedForeground} />
              <Text style={s.noteText}>{t("mob.disp.contactNote")}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },

  tabsWrap: {
    flexGrow: 0,
    backgroundColor: color.card,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  tabs: { gap: 6, paddingHorizontal: space.lg, paddingBottom: 12 },
  tab: {
    height: 30,
    paddingHorizontal: 13,
    borderRadius: radius.control,
    backgroundColor: color.muted,
    justifyContent: "center",
  },
  tabOn: { backgroundColor: color.foreground },
  tabText: { fontSize: 13, color: color.mutedForeground },
  tabTextOn: { color: color.card, fontWeight: "600" },

  scroll: { padding: space.lg, gap: 9 },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.md,
  },
  top: { flexDirection: "row", alignItems: "center", gap: 11 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 13, fontWeight: "700", color: color.mutedForeground },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { flexShrink: 1, fontSize: 15, fontWeight: "600", color: color.foreground },
  meta: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },

  stats: {
    flexDirection: "row",
    gap: 18,
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: color.muted,
  },
  statKey: { fontSize: 11, color: "#94a3b8" },
  statVal: { fontSize: 15, fontWeight: "700", color: color.foreground, marginTop: 1 },
  statSub: { fontSize: 11, fontWeight: "400", color: "#94a3b8" },
  statNone: { fontSize: 13, fontWeight: "500", color: "#94a3b8", marginTop: 3 },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 11 },
  chip: { height: 22, paddingHorizontal: 8, borderRadius: 6, backgroundColor: color.muted, justifyContent: "center" },
  chipText: { fontSize: 11.5, color: "#475569" },

  note: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    marginTop: 7,
    borderRadius: 12,
    backgroundColor: color.mutedForeground + "12",
  },
  noteText: { flex: 1, fontSize: 12.5, color: color.mutedForeground, lineHeight: 19 },
});
