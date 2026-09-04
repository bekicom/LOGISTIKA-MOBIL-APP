/**
 * I1 — ish topish.
 *
 * ── REZYUME — DARVOZA ───────────────────────────────────────────
 *
 * `matchedVacancies` rezyumesiz `null` qaytaradi: taqqoslash uchun
 * ma'lumot yo'q. Ya'ni rezyume to'ldirmagan odam «mos ishlar» ni
 * umuman ko'rmaydi va ilovada ish yo'q deb o'ylashi mumkin.
 * Shuning uchun rezyume holati eng tepada va nima ochilishi aniq
 * yozilgan.
 *
 * ── MOSLIK SABABI — BO'LIMNING ASOSI ────────────────────────────
 *
 * Boshqa ish saytlarida «80% mos» degan raqam turadi va u hech
 * nima anglatmaydi. Bu yerda formula har mezonni ochiq aytadi va
 * KAMCHILIK sababdan muhimroq: «chegara hujjatingiz yo'q» degan
 * qator haydovchiga NIMA QILISH kerakligini aytadi.
 */
import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { useApi } from "@/lib/use-api";
import { color, font, radius, space } from "@/lib/theme";
import { jobDirectionLabel, matchNote, payKindLabel, t } from "@/lib/i18n";

/** `furam/src/lib/jobs.ts:DIRECTIONS` */
const DIRECTIONS = ["DRIVER", "LOGISTICS", "WORKSHOP"] as const;

type Note = { tk: string; v?: Record<string, string | number> };

type Pay = {
  amount: number | null;
  to: number | null;
  currency: string;
  kind: string;
  negotiable: boolean;
};

type Matched = {
  id: string;
  title: string | null;
  profession: string | null;
  owner: string;
  location: string | null;
  pay: Pay;
  score: number;
  reasons: Note[];
  gaps: Note[];
  applied: string | null;
};

type Vacancy = {
  id: string;
  title: string | null;
  direction: string;
  profession: string | null;
  owner: string;
  location: string | null;
  route: { from: string | null; to: string | null } | null;
  pay: Pay;
  schedule: string | null;
  employment: string | null;
  benefits: string[];
  applied: string | null;
};

export default function IshTopish() {
  const [dir, setDir] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const query = useMemo(() => (dir ? `dir=${dir}` : ""), [dir]);
  const { data, loading, error, refreshing, refresh, reload } = useApi<{
    canApply: boolean;
    hasResume: boolean;
    matched: Matched[] | null;
    items: Vacancy[];
  }>(`/api/jobs?${query}`, [query]);

  const matched = data?.matched ?? null;
  const items = data?.items ?? [];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.head}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.back}>
          <Icon name="back" size={22} stroke={color.foreground} />
        </Pressable>
        <View style={{ flexGrow: 1 }}>
          <Text style={s.title}>{t("mob.job.title")}</Text>
          <Text style={s.sub}>{t("mob.job.subtitle")}</Text>
        </View>
      </View>

      {/* Vakansiyalar ro'yxati `FlatList` da: server 60 tagacha
          qaytaradi va `ScrollView` ularning hammasini bir vaqtda
          chizardi. Qolgan bo'laklar sarlavha va poyga chiqdi —
          ular ro'yxat bilan birga suriladi, avvalgidek. */}
      <FlatList
        data={loading && !data ? [] : items}
        keyExtractor={(v) => v.id}
        renderItem={({ item }) => (
          <VacancyCard v={item} onPress={() => router.push(`/ish/${item.id}`)} />
        )}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + space.xxl }]}
        /* Kartochkalar orasi `gap` bilan berilmaydi: konteynerdagi
           `gap` sarlavha va poygaga ham tegib, oraliqlar buzilardi. */
        ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          error ? null : (
            <View style={s.head2}>
              {/* ══ REZYUME — DARVOZA ══ */}
              {!data?.hasResume && (
                <View style={s.gate}>
                  <View style={s.gateHead}>
                    <View style={s.gateIcon}>
                      <Icon name="doc" size={20} stroke={color.brand} />
                    </View>
                    <View style={{ flexGrow: 1 }}>
                      <Text style={s.gateTitle}>{t("mob.job.resumeTitle")}</Text>
                      <Text style={s.gateSub}>{t("mob.job.resumeSub")}</Text>
                    </View>
                  </View>
                  <Pressable style={s.gateBtn} onPress={() => router.push("/rezyume")}>
                    <Text style={s.gateBtnText}>{t("mob.job.resumeBtn")}</Text>
                  </Pressable>
                  <Text style={s.gateNote}>{t("mob.job.resumeNote")}</Text>
                </View>
              )}

              {/* ══ MOS ISHLAR ══ */}
              {matched && matched.length > 0 && (
                <View>
                  <Text style={s.group}>{t("mob.job.forYou")}</Text>
                  <View style={{ gap: space.sm }}>
                    {matched.map((v) => (
                      <MatchCard key={v.id} v={v} onPress={() => router.push(`/ish/${v.id}`)} />
                    ))}
                  </View>
                </View>
              )}

              {matched && matched.length === 0 && (
                <View style={s.empty}>
                  <Text style={s.emptyText}>{t("mob.job.noMatch")}</Text>
                </View>
              )}

              {/* ══ HAMMA VAKANSIYALAR ══ */}
              <View>
                <View style={s.groupRow}>
                  <Text style={s.group}>{t("mob.job.allJobs")}</Text>
                  <Pressable onPress={() => router.push("/arizalarim")}>
                    <Text style={s.link}>{t("mob.job.myApps")}</Text>
                  </Pressable>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.chips}
                >
                  <Pressable style={[s.chip, !dir && s.chipOn]} onPress={() => setDir(null)}>
                    <Text style={[s.chipText, !dir && s.chipTextOn]}>{t("mob.market.all")}</Text>
                  </Pressable>
                  {DIRECTIONS.map((d) => (
                    <Pressable
                      key={d}
                      style={[s.chip, dir === d && s.chipOn]}
                      onPress={() => setDir(dir === d ? null : d)}
                    >
                      <Text style={[s.chipText, dir === d && s.chipTextOn]}>
                        {jobDirectionLabel(d)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          )
        }
        ListEmptyComponent={
          loading && !data ? (
            <Skeleton rows={3} />
          ) : error ? (
            <ErrorBox message={error} onRetry={reload} />
          ) : (
            <Empty
              icon="package"
              title={t("mob.job.emptyTitle")}
              text={t("mob.job.emptyHint")}
            />
          )
        }
        ListFooterComponent={
          error ? null : (
            /* ══ ISH BERUVCHI TOMONI ══ */
            <Pressable style={[s.panel, { marginTop: space.lg }]} onPress={() => router.push("/ish-beruvchi")}>
              <View style={s.panelIcon}>
                <Icon name="user" size={19} stroke={color.mutedForeground} />
              </View>
              <View style={{ flexGrow: 1 }}>
                <Text style={s.panelTitle}>{t("mob.job.employerTitle")}</Text>
                <Text style={s.panelSub}>{t("mob.job.employerSub")}</Text>
              </View>
              <Icon name="chevron" size={18} stroke="#cbd5e1" />
            </Pressable>
          )
        }
      />
    </View>
  );
}

function PayText({ pay }: { pay: Pay }) {
  if (pay.negotiable || pay.amount == null) {
    return <Text style={s.pay}>{t("mob.job.negotiable")}</Text>;
  }
  return (
    <Text style={s.pay}>
      {fmtNum(pay.amount)}
      {pay.to != null ? `–${fmtNum(pay.to)}` : ""}{" "}
      <Text style={s.payMeta}>
        {pay.currency} · {payKindLabel(pay.kind)}
      </Text>
    </Text>
  );
}

function MatchCard({ v, onPress }: { v: Matched; onPress: () => void }) {
  const good = v.score >= 80;
  /* Uchtadan ko'p sabab kartochkani cho'zadi. Kamchilik esa
     ALBATTA ko'rsatiladi — u foydaliroq. */
  const show = [...v.gaps.slice(0, 1), ...v.reasons].slice(0, 3);

  return (
    <Pressable style={[s.card, good && s.cardGood]} onPress={onPress}>
      <View style={s.cardHead}>
        <View style={[s.score, good && s.scoreGood]}>
          <Text style={[s.scoreText, good && s.scoreTextGood]}>
            {t("mob.job.scoreN", { n: v.score })}
          </Text>
        </View>
        {v.applied && (
          <View style={s.appTag}>
            <Text style={s.appTagText}>{t(`mob.appStatus.${v.applied}`)}</Text>
          </View>
        )}
      </View>

      <Text style={s.name} numberOfLines={2}>
        {v.title ?? t("mob.job.noTitle")}
      </Text>
      <Text style={s.meta} numberOfLines={1}>
        {[v.owner, v.location].filter(Boolean).join(" · ")}
      </Text>
      <PayText pay={v.pay} />

      <View style={s.notes}>
        {show.map((n, i) => {
          const isGap = v.gaps.some((g) => g.tk === n.tk);
          return (
            <View key={`${n.tk}-${i}`} style={s.note}>
              <Icon
                name={isGap ? "alert" : "check"}
                size={14}
                stroke={isGap ? color.warning : color.success}
              />
              <Text style={[s.noteText, isGap && s.noteGap]}>{matchNote(n.tk, n.v)}</Text>
            </View>
          );
        })}
      </View>
    </Pressable>
  );
}

function VacancyCard({ v, onPress }: { v: Vacancy; onPress: () => void }) {
  const where = v.route
    ? [v.route.from, v.route.to].filter(Boolean).join(" → ")
    : v.location;

  return (
    <Pressable style={s.card} onPress={onPress}>
      {v.applied && (
        <View style={[s.appTag, { alignSelf: "flex-start", marginBottom: 9 }]}>
          <Text style={s.appTagText}>{t(`mob.appStatus.${v.applied}`)}</Text>
        </View>
      )}
      <Text style={s.name} numberOfLines={2}>
        {v.title ?? t("mob.job.noTitle")}
      </Text>
      <Text style={s.meta} numberOfLines={1}>
        {[where, v.schedule].filter(Boolean).join(" · ")}
      </Text>

      {v.benefits.length > 0 && (
        <View style={s.chipRow}>
          {v.benefits.slice(0, 3).map((b) => (
            <View key={b} style={s.small}>
              <Text style={s.smallText}>{t(`mob.benefit.${b}`)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={s.foot}>
        <PayText pay={v.pay} />
        <Text style={s.owner} numberOfLines={1}>
          {v.owner}
        </Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },

  head: {
    backgroundColor: color.card,
    paddingHorizontal: space.md,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: font.titleLg, fontWeight: "700", color: color.foreground },
  sub: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },

  scroll: { padding: space.lg, gap: space.lg },
  /* Ro'yxat konteyneri: `gap` YO'Q — oraliq `ItemSeparatorComponent`
     bilan beriladi, aks holda sarlavha va poyga ham surilib ketardi. */
  list: { padding: space.lg },
  head2: { gap: space.lg, marginBottom: space.lg },
  group: {
    fontSize: 12,
    fontWeight: "600",
    color: color.mutedForeground,
    letterSpacing: 0.3,
    marginBottom: 7,
    marginLeft: 4,
  },
  groupRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  link: { fontSize: 12, fontWeight: "600", color: color.brand, marginBottom: 7 },

  gate: { backgroundColor: color.navy, borderRadius: radius.card, padding: space.md },
  gateHead: { flexDirection: "row", alignItems: "center", gap: 11 },
  gateIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: color.brand + "33",
    alignItems: "center",
    justifyContent: "center",
  },
  gateTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  gateSub: { fontSize: 12, color: "#f1f5f9b3", marginTop: 2 },
  gateBtn: {
    height: 46,
    borderRadius: 11,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  gateBtnText: { fontSize: 15, fontWeight: "600", color: color.brandForeground },
  gateNote: {
    fontSize: 12,
    color: "#f1f5f9b3",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#ffffff1a",
    lineHeight: 18,
  },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.md,
  },
  cardGood: { borderColor: color.success },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8 },

  score: { height: 24, paddingHorizontal: 9, borderRadius: 7, backgroundColor: color.muted, justifyContent: "center" },
  scoreGood: { backgroundColor: color.success + "1f" },
  scoreText: { fontSize: 12, fontWeight: "700", color: color.mutedForeground },
  scoreTextGood: { color: "#15803d" },

  appTag: { height: 21, paddingHorizontal: 8, borderRadius: 6, backgroundColor: color.warning + "1f", justifyContent: "center" },
  appTagText: { fontSize: 10, fontWeight: "700", color: "#b45309" },

  name: { fontSize: 16, fontWeight: "700", color: color.foreground, marginTop: 10 },
  meta: { fontSize: 12, color: color.mutedForeground, marginTop: 2 },
  pay: { fontSize: 19, fontWeight: "700", color: color.foreground, marginTop: 9 },
  payMeta: { fontSize: 13, fontWeight: "400", color: color.mutedForeground },

  notes: {
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: color.muted,
    gap: 7,
  },
  note: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  noteText: { flex: 1, fontSize: 12, color: color.mutedForeground, lineHeight: 18 },
  noteGap: { color: "#92400e" },

  chips: { gap: 7, paddingBottom: space.sm },
  chip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
    justifyContent: "center",
  },
  chipOn: { backgroundColor: color.foreground, borderColor: color.foreground },
  chipText: { fontSize: 13, color: color.mutedForeground },
  chipTextOn: { color: color.card, fontWeight: "600" },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  small: { height: 26, paddingHorizontal: 10, borderRadius: 8, backgroundColor: color.muted, justifyContent: "center" },
  smallText: { fontSize: 12, fontWeight: "500", color: color.mutedForeground },

  foot: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginTop: 11,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: color.muted,
  },
  owner: { flex: 1, fontSize: 12, color: color.mutedForeground, textAlign: "right" },

  panel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.md,
  },
  panelIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  panelTitle: { fontSize: 14, fontWeight: "600", color: color.foreground },
  panelSub: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },

  empty: { padding: space.lg, alignItems: "center" },
  emptyText: { fontSize: 13, color: color.mutedForeground, textAlign: "center", lineHeight: 19 },
});
