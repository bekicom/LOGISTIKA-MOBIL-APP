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
import { Linking, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@/components/ui";
import { Icon, type IconName } from "@/components/Icon";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { useApi } from "@/lib/use-api";
import { API_BASE } from "@/lib/api";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Video = {
  id: string;
  sectionKey: string;
  title: string;
  description: string | null;
  durationSec: number | null;
  hasPoster: boolean;
};

/**
 * Bo'lim → ikonka.
 *
 * ── NEGA KERAK (2026-09-20, Bekzodning telefonidagi surat) ──────
 *
 * Karta tepasidagi 168 px lik maydon BO'M-BO'SH to'q ko'k quti
 * bo'lib turardi: `posterKey` bazada bor-u, uni YOZADIGAN joy yo'q
 * (adminda yuklash yo'li yozilmagan, faqat o'chirish bor), ya'ni
 * `hasPoster` doim `false`. Olti karta — oltita bo'sh quti.
 *
 * Birinchi kadrni ko'rsatish (web shunday qiladi: `<video
 * preload="metadata">`) ilovada `expo-video` ni talab qiladi — bu
 * NATIVE modul, ya'ni yangi build va do'konga yana bir bog'liqlik.
 * Do'kon topshiruvi oldidan bunga bormaymiz.
 *
 * Shuning uchun maydon MA'NOLI to'ldiriladi: bo'lim ikonkasi xira
 * fonda, bo'lim nomi yorliqda, o'rtada ▶. Endi har karta o'zini
 * ko'rsatadi va bir-biridan farq qiladi.
 */
const SECTION_ICON: Record<string, IconName> = {
  loads: "package",
  trucks: "truck",
  post: "plus",
  "post-truck": "truck",
  trips: "route",
  contracts: "handshake",
  queues: "clock",
  map: "map-pin",
  drivers: "users",
  documents: "doc",
  money: "wallet",
  finance: "wallet",
  reports: "chart",
  analytics: "chart",
  chats: "chat",
  ai: "robot",
  market: "tag",
  jobs: "briefcase",
  trust: "shield",
  roles: "grid",
  profile: "user",
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
                  {/* Xira ikonka — fon naqshi, bosilmaydi */}
                  <View style={s.glyph} pointerEvents="none">
                    <Icon
                      name={SECTION_ICON[v.sectionKey] ?? "play"}
                      size={104}
                      stroke={color.navyForeground}
                    />
                  </View>
                  {/* ▶ — o'q emas. «→» keyingi sahifaga o'tishni
                      bildiradi, videoni emas (2026-09-20) */}
                  <View style={s.play}>
                    <Icon name="play" size={18} stroke={color.navy} fill={color.navy} />
                  </View>
                  <View style={s.secTag}>
                    <Text style={s.secTagText} numberOfLines={1}>
                      {t(`videoSection.${v.sectionKey}`)}
                    </Text>
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

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },

  tabsWrap: {
    flexGrow: 0,
    backgroundColor: color.card,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  tabs: { alignItems: "center", gap: 6, paddingHorizontal: space.lg, paddingBottom: 12 },
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
  glyph: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    /* Naqsh darajasida — o'rtadagi ▶ bilan raqobatlashmasin */
    opacity: 0.1,
  },
  play: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#ffffffeb",
    alignItems: "center",
    /* ▶ uchburchagi o'zi chapga og'ib turadi — doira ichida ko'zga
       to'g'ri ko'rinishi uchun 2 px o'ngga suriladi */
    justifyContent: "center",
    paddingLeft: 3,
  },
  secTag: {
    position: "absolute",
    left: 10,
    top: 10,
    maxWidth: "70%",
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 11,
    backgroundColor: "#ffffff29",
    justifyContent: "center",
  },
  secTagText: { fontSize: 11, fontWeight: "700", color: "#fff", letterSpacing: 0.2 },
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
}));
