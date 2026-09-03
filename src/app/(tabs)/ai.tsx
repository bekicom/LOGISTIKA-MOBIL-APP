/**
 * K1 — AI yordamchi bosh ekrani.
 *
 * BO'SH CHAT EMAS. Yonayotgan kursor oldida odam nima yozishni bilmaydi
 * va chiqib ketadi. Ekran tayyor savollardan boshlanadi — ular serverdagi
 * vositalarga to'g'ridan-to'g'ri mos keladi (`furam/src/lib/ai-tools.ts`).
 *
 * CHEKLOV YASHIRILMAYDI. Odam «nega javob bermayapti» deb o'ylagandan
 * ko'ra, qancha qolganini oldindan ko'rgani yaxshi.
 */
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Card, GroupLabel, ListRow } from "@/components/ui";
import { Icon, type IconName } from "@/components/Icon";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { useApi } from "@/lib/use-api";
import { t } from "@/lib/i18n";
import { color, font, radius, space } from "@/lib/theme";

type Left = {
  hourLimit: number;
  dayLimit: number;
  hourUsed: number;
  dayUsed: number;
  hourLeft: number;
  dayLeft: number;
  resetAt: string | null;
};
/** Nega ishlamayapti — uchta sabab, uchta boshqa maslahat */
type Reason = "OK" | "AI_OFF" | "SECTION_LOCKED" | "TARIFF_REQUIRED";
type Usage = { enabled: boolean; reason: Reason; ask: Left; scan: Left };

/** Tayyor savollar — har biri serverdagi bir vositaga tegadi */
const QUICK: { key: string; icon: IconName; tint: string }[] = [
  { key: "q1", icon: "check", tint: color.success },
  { key: "q2", icon: "doc", tint: color.danger },
  { key: "q3", icon: "truck", tint: color.brand },
  { key: "q4", icon: "route", tint: color.info },
];

export default function Screen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, loading, error, refreshing, refresh, reload } = useApi<Usage>("/api/ai/usage");

  const ask = data?.ask ?? null;
  const over = !!ask && ask.hourLeft === 0;

  /* Chegara tugaganda qancha qolgani ANIQ raqam bilan: «18 daqiqadan keyin»
     — «keyinroq urinib ko'ring» degan bo'sh gapdan farqli. */
  const resetMin = ask?.resetAt
    ? Math.max(1, Math.ceil((new Date(ask.resetAt).getTime() - Date.now()) / 60000))
    : null;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.head}>
        <Text style={s.title}>{t("mob.ai.title")}</Text>
        <Text style={[s.sub, over ? { color: color.danger } : null]}>
          {over ? t("mob.ai.limitOver") : t("mob.ai.subtitle")}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
        }
      >
        {loading ? (
          <Skeleton rows={4} />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : !data?.enabled ? (
          /* Sabab aytiladi, bo'lmasa odam kimga murojaat qilishni bilmaydi */
          <Empty
            icon="sparkle"
            title={t(`mob.aiOff.${data?.reason ?? "AI_OFF"}`)}
            text={t(`mob.aiOffText.${data?.reason ?? "AI_OFF"}`)}
          />
        ) : over && ask ? (
          /* Cheklovda «yo'q» deyilmaydi — YO'L ko'rsatiladi: javob
             ilovaning o'zida bor, odam uni topa oladi. */
          <>
            <View style={s.limit}>
              <View style={s.limitRow}>
                <View style={s.limitIcon}>
                  <Icon name="clock" size={22} stroke={color.warning} />
                </View>
                <View style={s.grow}>
                  <Text style={s.limitTitle}>
                    {resetMin ? t("mob.ai.resetIn", { n: resetMin }) : t("mob.ai.limitOver")}
                  </Text>
                  <Text style={s.limitSub}>{t("mob.ai.resetHint", { n: ask.hourLimit })}</Text>
                </View>
              </View>

              <View style={s.bar}>
                <View style={[s.barFill, s.barFull, { backgroundColor: color.warning }]} />
              </View>

              <Text style={s.limitText}>
                {t("mob.ai.usedOf", { day: ask.dayLimit, used: ask.dayUsed })}
              </Text>
            </View>

            <View>
              <GroupLabel>{t("mob.ai.meanwhile")}</GroupLabel>
              <Card>
                <ListRow
                  icon={<Badge icon="route" tint={color.info} />}
                  title={t("mob.ai.seeAnalytics")}
                  onPress={() => router.push("/parkim")}
                />
                <ListRow
                  icon={<Badge icon="doc" tint={color.danger} />}
                  title={t("mob.ai.seeDocs")}
                  onPress={() => router.push("/hujjatlarim")}
                  last
                />
              </Card>
            </View>
          </>
        ) : (
          <>
            {/* Nima so'rash mumkin — birinchi savol shu */}
            <View style={s.intro}>
              <View style={s.introHead}>
                <View style={s.introIcon}>
                  <Icon name="sparkle" size={18} stroke={color.brand} />
                </View>
                <Text style={s.introTitle}>{t("mob.ai.whatAsk")}</Text>
              </View>
              <Text style={s.introText}>{t("mob.ai.whatAskText")}</Text>
            </View>

            <View>
              <GroupLabel>{t("mob.ai.quick")}</GroupLabel>
              <Card>
                {QUICK.map((q, i) => (
                  <ListRow
                    key={q.key}
                    icon={<Badge icon={q.icon} tint={q.tint} />}
                    title={t(`mob.ai.${q.key}`)}
                    last={i === QUICK.length - 1}
                    /* Savol matni bilan ochiladi — suhbat darrov boshlanadi */
                    onPress={() =>
                      router.push({
                        pathname: "/ai/suhbat",
                        params: { q: t(`mob.ai.${q.key}`) },
                      })
                    }
                  />
                ))}
              </Card>
            </View>

            {/* Skaner — alohida amal, alohida cheklov */}
            <Card>
              <ListRow
                last
                icon={
                  <View style={s.scanIcon}>
                    <Icon name="doc" size={22} stroke={color.brand} />
                  </View>
                }
                title={t("mob.ai.scanTitle")}
                hint={t("mob.ai.scanHint")}
                onPress={() => router.push("/ai/skaner")}
              />
            </Card>

            {/* Nechtasini ishlatgani — yashirilmaydi */}
            {ask ? (
              <View style={s.usage}>
                <View style={s.usageHead}>
                  <Icon name="clock" size={17} stroke="#475569" />
                  <Text style={s.usageTitle}>{t("mob.ai.usedToday", { n: ask.dayUsed })}</Text>
                </View>
                <View style={s.bar}>
                  <View
                    style={[
                      s.barFill,
                      {
                        width: `${Math.min(100, Math.round((ask.dayUsed / Math.max(1, ask.dayLimit)) * 100))}%`,
                        backgroundColor: ask.hourLeft > 3 ? color.success : color.warning,
                      },
                    ]}
                  />
                </View>
                <Text style={s.usageText}>
                  {t("mob.ai.limitsText", {
                    day: ask.dayLimit,
                    hour: ask.hourLimit,
                    scan: data.scan.dayLimit,
                  })}
                </Text>
              </View>
            ) : null}

            {/* Savol yozish — pastda, chunki tayyor savollar tepada */}
            <Pressable
              onPress={() => router.push("/ai/suhbat")}
              accessibilityRole="button"
              style={({ pressed }) => [s.askBar, pressed ? { backgroundColor: color.muted } : null]}
            >
              <Text style={s.askPh}>{t("mob.ai.askPh")}</Text>
              <View style={s.askBtn}>
                <Icon name="arrow-right" size={18} stroke="#fff" />
              </View>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Badge({ icon, tint }: { icon: IconName; tint: string }) {
  return (
    <View style={[s.badge, { backgroundColor: tint + "1f" }]}>
      <Icon name={icon} size={17} stroke={tint} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  grow: { flex: 1 },
  head: {
    backgroundColor: color.card,
    paddingHorizontal: space.lg,
    paddingTop: 4,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  title: { fontSize: font.titleLg, fontWeight: "700", color: color.foreground, letterSpacing: -0.4 },
  sub: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },
  scroll: { padding: space.lg, gap: space.md, paddingBottom: space.xxl * 2 },

  intro: { backgroundColor: color.navy, borderRadius: radius.card, padding: 18 },
  introHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  introIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: color.brand + "33",
    alignItems: "center",
    justifyContent: "center",
  },
  introTitle: { fontSize: 15, fontWeight: "700", color: "#fff" },
  introText: { fontSize: 13, color: "rgba(241,245,249,0.8)", marginTop: 10, lineHeight: 21 },

  badge: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  scanIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: color.brand + "1f",
    alignItems: "center",
    justifyContent: "center",
  },

  usage: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    borderRadius: radius.card,
    padding: space.lg,
  },
  usageHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  usageTitle: { fontSize: font.caption, fontWeight: "600", color: color.foreground },
  usageText: { fontSize: 12, color: "#475569", marginTop: 8, lineHeight: 19 },
  bar: {
    height: 5,
    borderRadius: 3,
    backgroundColor: color.border,
    marginTop: 10,
    overflow: "hidden",
  },
  barFill: { height: 5, borderRadius: 3 },
  barFull: { width: "100%" },

  askBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.pill,
    paddingLeft: 18,
    paddingRight: 5,
    paddingVertical: 5,
  },
  askPh: { flex: 1, fontSize: font.bodyLg, color: "#94a3b8" },
  askBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
  },

  limit: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.warning + "66",
    borderRadius: radius.card,
    padding: 18,
  },
  limitRow: { flexDirection: "row", alignItems: "center", gap: 13 },
  limitIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: color.warning + "1f",
    alignItems: "center",
    justifyContent: "center",
  },
  limitTitle: { fontSize: font.bodyLg, fontWeight: "700", color: color.foreground },
  limitSub: { fontSize: 12, color: color.mutedForeground, marginTop: 2 },
  limitText: { fontSize: 12, color: "#475569", marginTop: 10, lineHeight: 19 },
});
