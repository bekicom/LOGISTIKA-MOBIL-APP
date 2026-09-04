/**
 * V1 — qo'llanma videolari.
 *
 * ── DAVOMIYLIK SARLAVHA YONIDA ──────────────────────────────────
 *
 * «3:24» degan raqam ochish qaroriga to'g'ridan-to'g'ri ta'sir
 * qiladi: odam yo'lda, vaqti kam. Uni ichkarida ko'rsatish
 * qarorni kechiktirardi.
 *
 * ── VIDEO ILOVA ICHIDA OCHILMAYDI ───────────────────────────────
 *
 * `expo-video` qo'shilmagan — u alohida native modul va SDK
 * yangilanishida yana bir bog'liqlik demak. Video tizim
 * pleyerida ochiladi: qo'llanma kuniga bir marta ko'riladi,
 * ya'ni ichki pleyer uchun sabab yetarli emas.
 */
import { useState } from "react";
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { useApi } from "@/lib/use-api";
import { API_BASE } from "@/lib/api";
import { color, radius, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Video = {
  id: string;
  sectionKey: string;
  title: string;
  description: string | null;
  durationSec: number | null;
  hasPoster: boolean;
};

/** 204 → «3:24» */
function clock(sec: number | null) {
  if (!sec || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s2 = sec % 60;
  return `${m}:${String(s2).padStart(2, "0")}`;
}

export default function Qollanma() {
  const [section, setSection] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const { data, loading, error, refreshing, refresh, reload } =
    useApi<{ items: Video[] }>("/api/video");

  const all = data?.items ?? [];
  /* Bo'limlar ro'yxatdan yig'iladi: bo'sh bo'limni ko'rsatish
     «video yo'q» degan taassurot qoldirardi. */
  const sections = [...new Set(all.map((v) => v.sectionKey))];
  const items = section ? all.filter((v) => v.sectionKey === section) : all;

  return (
    <View style={s.root}>
      <Header
        title={t("mob.video.title")}
        subtitle={data ? t("mob.video.countN", { n: all.length }) : undefined}
      />

      {sections.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabs}
          style={s.tabsWrap}
        >
          <Pressable style={[s.tab, !section && s.tabOn]} onPress={() => setSection(null)}>
            <Text style={[s.tabText, !section && s.tabTextOn]}>{t("mob.common.all")}</Text>
          </Pressable>
          {sections.map((k) => (
            <Pressable
              key={k}
              style={[s.tab, section === k && s.tabOn]}
              onPress={() => setSection(k)}
            >
              <Text style={[s.tabText, section === k && s.tabTextOn]}>
                {t(`videoSection.${k}`)}
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
          <Skeleton rows={2} />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : items.length === 0 ? (
          <Empty icon="doc" title={t("mob.video.emptyTitle")} text={t("mob.video.emptyHint")} />
        ) : (
          items.map((v) => {
            const dur = clock(v.durationSec);
            return (
              <Pressable
                key={v.id}
                style={s.card}
                /* Video tizim pleyerida ochiladi — ichki pleyer
                   uchun alohida native modul kerak bo'lardi */
                onPress={() => Linking.openURL(`${API_BASE}/api/video/${v.id}/file`)}
              >
                <View style={s.poster}>
                  <View style={s.play}>
                    <Icon name="arrow-right" size={20} stroke={color.foreground} />
                  </View>
                  {!!dur && (
                    <View style={s.dur}>
                      <Text style={s.durText}>{dur}</Text>
                    </View>
                  )}
                </View>
                <View style={s.body}>
                  <Text style={s.title}>{v.title}</Text>
                  {!!v.description && (
                    <Text style={s.desc} numberOfLines={2}>
                      {v.description}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
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

  scroll: { padding: space.lg, gap: 11 },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  poster: {
    height: 168,
    backgroundColor: color.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  play: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#ffffffeb",
    alignItems: "center",
    justifyContent: "center",
  },
  dur: {
    position: "absolute",
    right: 10,
    bottom: 10,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: 5,
    backgroundColor: "#0f172acc",
    justifyContent: "center",
  },
  durText: { fontSize: 11.5, fontWeight: "600", color: "#fff" },

  body: { padding: space.md },
  title: { fontSize: 14.5, fontWeight: "600", color: color.foreground },
  desc: { fontSize: 12.5, color: color.mutedForeground, marginTop: 3, lineHeight: 19 },
});
