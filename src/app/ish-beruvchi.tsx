/**
 * I4 — ish beruvchi paneli.
 *
 * ── IKKITA RAQAM ────────────────────────────────────────────────
 *
 * Ish beruvchining savoli bitta: «kim keldi va kim mos». Shuning
 * uchun har vakansiya ostida ariza soni va MOS NOMZOD soni turadi.
 *
 * Ikkinchisi muhimroq: ariza kelmagan bo'lsa ham tizim mos
 * nomzodni topa oladi va uni TAKLIF QILISH mumkin. Web'da bu
 * alohida sahifada ko'milgan edi va ish beruvchi u yerga
 * kamdan-kam borardi.
 *
 * ── QADAMLARNI SERVER AYTADI ────────────────────────────────────
 *
 * Har arizada `next` bor — qaysi holatga o'tish mumkinligi va
 * uni ISH BERUVCHI bosishi mumkinligi (`actorFor`). Ekran buni
 * takrorlamaydi: «qabul qilindi» ni ish beruvchi bosa olmasligi
 * shu qoidadan kelib chiqadi.
 */
import { useState } from "react";
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, font, radius, space } from "@/lib/theme";
import { matchNote, payKindLabel, t } from "@/lib/i18n";

type Note = { tk: string; v?: Record<string, string | number> };

type App = {
  id: string;
  status: string;
  message: string | null;
  byEmployer: boolean;
  name: string;
  furamId: number;
  phone: string | null;
  experienceY: number | null;
  licenseClasses: string[];
  next: string[];
};

type Vacancy = {
  id: string;
  title: string | null;
  status: string;
  location: string | null;
  vehicle: { plate: string; title: string } | null;
  pay: { amount: number | null; currency: string; kind: string; negotiable: boolean };
  applications: number;
  fresh: number;
  apps: App[];
};

type Candidate = {
  userId: string;
  name: string;
  furamId: number;
  verified: boolean;
  title: string | null;
  experienceY: number | null;
  licenseClasses: string[];
  location: string | null;
  score: number;
  reasons: Note[];
  gaps: Note[];
  invited: boolean;
};

export default function IshBeruvchi() {
  const insets = useSafeAreaInsets();

  /* Nomzodlar QIMMAT: `matchedCandidates` barcha rezyumeni o'qib,
     formuladan o'tkazadi. Shuning uchun faqat ochilgan vakansiya
     uchun so'raladi. */
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, loading, error, refreshing, refresh, reload } = useApi<{
    canPost: boolean;
    vacancies: Vacancy[];
    candidates: Candidate[] | null;
  }>(`/api/jobs/employer${openId ? `?vacancyId=${openId}` : ""}`, [openId]);

  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState("");

  async function act(key: string, body: Record<string, unknown>) {
    setBusy(key);
    setFailed("");
    try {
      await api("/api/jobs", { method: "POST", body });
      reload();
    } catch (e) {
      setFailed((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(null);
    }
  }

  const vacancies = data?.vacancies ?? [];

  return (
    <View style={s.root}>
      <Header title={t("mob.job.employerTitle")} subtitle={t("mob.job.employerSub")} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {loading && !data ? (
          <Skeleton rows={3} />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : vacancies.length === 0 ? (
          <Empty
            icon="package"
            title={t("mob.job.noVacTitle")}
            text={t("mob.job.noVacHint")}
          />
        ) : (
          <>
            {failed ? (
              <View style={s.failed}>
                <Text style={s.failedText}>{failed}</Text>
              </View>
            ) : null}

            {vacancies.map((v) => {
              const open = openId === v.id;
              return (
                <View key={v.id} style={[s.card, v.fresh > 0 && s.cardFresh]}>
                  <View style={s.head}>
                    <View
                      style={[
                        s.tag,
                        v.status === "OPEN" && { backgroundColor: color.success + "1a" },
                      ]}
                    >
                      <Text
                        style={[
                          s.tagText,
                          v.status === "OPEN" && { color: "#15803d" },
                        ]}
                      >
                        {t(`mob.vacStatus.${v.status}`)}
                      </Text>
                    </View>
                  </View>

                  <Text style={s.name} numberOfLines={2}>
                    {v.title ?? t("mob.job.noTitle")}
                  </Text>
                  <Text style={s.meta} numberOfLines={1}>
                    {[
                      v.pay.negotiable || v.pay.amount == null
                        ? t("mob.job.negotiable")
                        : `${fmtNum(v.pay.amount)} ${v.pay.currency} · ${payKindLabel(v.pay.kind)}`,
                      v.vehicle?.plate,
                      v.location,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>

                  {/* ══ IKKITA RAQAM ══ */}
                  <View style={s.two}>
                    <View style={[s.box, v.fresh > 0 && s.boxHot]}>
                      <Text style={[s.boxKey, v.fresh > 0 && s.boxKeyHot]}>
                        {t("mob.job.newApps")}
                      </Text>
                      <Text style={[s.boxValue, v.fresh > 0 && s.boxValueHot]}>{v.fresh}</Text>
                    </View>
                    <View style={s.box}>
                      <Text style={s.boxKey}>{t("mob.job.allApps")}</Text>
                      <Text style={s.boxValue}>{v.applications}</Text>
                    </View>
                  </View>

                  {/* ── Arizalar */}
                  {v.apps.length > 0 && (
                    <View style={s.apps}>
                      {v.apps.slice(0, open ? 20 : 3).map((a) => (
                        <View key={a.id} style={s.app}>
                          <View style={s.appHead}>
                            <Text style={s.appName} numberOfLines={1}>
                              {a.name}
                            </Text>
                            <View style={s.appTag}>
                              <Text style={s.appTagText}>{t(`mob.appStatus.${a.status}`)}</Text>
                            </View>
                          </View>
                          <Text style={s.appMeta}>
                            {[
                              a.experienceY != null
                                ? t("mob.job.yearsN", { n: a.experienceY })
                                : null,
                              a.licenseClasses.join(", ") || null,
                              a.byEmployer ? t("mob.job.byMe") : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </Text>
                          {a.message ? (
                            <Text style={s.appMsg} numberOfLines={2}>
                              {a.message}
                            </Text>
                          ) : null}

                          <View style={s.appActs}>
                            {a.phone && (
                              <Pressable
                                style={[s.small, s.smallGhost]}
                                onPress={() => void Linking.openURL(`tel:${a.phone}`)}
                              >
                                <Text style={s.smallGhostText}>{t("mob.part.call")}</Text>
                              </Pressable>
                            )}
                            {a.next.map((to) => (
                              <Pressable
                                key={to}
                                style={[
                                  s.small,
                                  to === "REJECTED" ? s.smallGhost : s.smallPri,
                                  to !== "REJECTED" && { marginLeft: "auto" },
                                ]}
                                disabled={busy === a.id}
                                onPress={() =>
                                  void act(a.id, { action: "app-move", id: a.id, to })
                                }
                              >
                                <Text
                                  style={
                                    to === "REJECTED" ? s.smallGhostText : s.smallPriText
                                  }
                                >
                                  {t(`mob.appTo.${to}`)}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  <Pressable
                    style={[s.btn, open ? s.btnGhost : s.btnDark]}
                    onPress={() => setOpenId(open ? null : v.id)}
                  >
                    <Text style={open ? s.btnGhostText : s.btnDarkText}>
                      {open ? t("mob.job.hideCandidates") : t("mob.job.showCandidates")}
                    </Text>
                  </Pressable>

                  {/* ══ MOS NOMZODLAR ══ */}
                  {open && (
                    <View style={s.cands}>
                      {(data?.candidates ?? []).length === 0 ? (
                        <Text style={s.emptyText}>{t("mob.job.noCandidates")}</Text>
                      ) : (
                        (data?.candidates ?? []).map((c) => (
                          <View key={c.userId} style={s.cand}>
                            <View style={s.candHead}>
                              <View style={s.avatar}>
                                <Text style={s.avatarText}>{initials(c.name)}</Text>
                              </View>
                              <View style={{ flexGrow: 1, minWidth: 0 }}>
                                <View style={s.nameRow}>
                                  <Text style={s.candName} numberOfLines={1}>
                                    {c.name}
                                  </Text>
                                  {c.verified && (
                                    <Icon name="check" size={13} stroke={color.success} />
                                  )}
                                </View>
                                <Text style={s.candMeta} numberOfLines={1}>
                                  {[
                                    c.experienceY != null
                                      ? t("mob.job.yearsN", { n: c.experienceY })
                                      : null,
                                    c.licenseClasses.join(", ") || null,
                                    c.location,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </Text>
                              </View>
                              <View
                                style={[s.score, c.score >= 80 && s.scoreGood]}
                              >
                                <Text
                                  style={[s.scoreText, c.score >= 80 && s.scoreTextGood]}
                                >
                                  {c.score}%
                                </Text>
                              </View>
                            </View>

                            <View style={s.notes}>
                              {[...c.reasons.slice(0, 2), ...c.gaps.slice(0, 1)].map((n, i) => {
                                const isGap = c.gaps.some((g) => g.tk === n.tk);
                                return (
                                  <View key={`${n.tk}-${i}`} style={s.note}>
                                    <Icon
                                      name={isGap ? "alert" : "check"}
                                      size={13}
                                      stroke={isGap ? color.warning : color.success}
                                    />
                                    <Text style={[s.noteText, isGap && s.noteGap]}>
                                      {matchNote(n.tk, n.v)}
                                    </Text>
                                  </View>
                                );
                              })}
                            </View>

                            <Pressable
                              style={[s.btn, c.invited ? s.btnGhost : s.btnPri, { marginTop: 11 }]}
                              disabled={c.invited || busy === c.userId}
                              onPress={() =>
                                void act(c.userId, {
                                  action: "invite",
                                  vacancyId: v.id,
                                  candidateId: c.userId,
                                })
                              }
                            >
                              <Text style={c.invited ? s.btnGhostText : s.btnPriText}>
                                {c.invited ? t("mob.job.invited") : t("mob.job.invite")}
                              </Text>
                            </Pressable>
                          </View>
                        ))
                      )}
                    </View>
                  )}
                </View>
              );
            })}
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
  scroll: { padding: space.lg, gap: space.md },

  failed: {
    borderWidth: 1,
    borderColor: color.danger + "59",
    backgroundColor: color.danger + "0d",
    borderRadius: radius.control,
    padding: space.md,
  },
  failedText: { fontSize: font.caption, color: color.danger },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.md,
  },
  cardFresh: { borderColor: color.brand + "66" },

  head: { flexDirection: "row", alignItems: "center", gap: 7 },
  tag: { height: 21, paddingHorizontal: 8, borderRadius: 6, backgroundColor: color.muted, justifyContent: "center" },
  tagText: { fontSize: 10, fontWeight: "700", color: color.mutedForeground },

  name: { fontSize: 16, fontWeight: "700", color: color.foreground, marginTop: 10 },
  meta: { fontSize: 12, color: color.mutedForeground, marginTop: 2 },

  two: { flexDirection: "row", gap: 10, marginTop: 12 },
  box: { flex: 1, paddingVertical: 10, paddingHorizontal: 11, borderRadius: 10, backgroundColor: "#f8fafc" },
  boxHot: { backgroundColor: color.brand + "14" },
  boxKey: { fontSize: 11, color: color.mutedForeground },
  boxKeyHot: { color: "#9a3412" },
  boxValue: { fontSize: 19, fontWeight: "700", color: color.foreground, marginTop: 1 },
  boxValueHot: { color: "#c2490f" },

  apps: { marginTop: 12, gap: 10 },
  app: { paddingTop: 11, borderTopWidth: 1, borderTopColor: color.muted },
  appHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  appName: { flex: 1, fontSize: 14, fontWeight: "600", color: color.foreground },
  appTag: { height: 20, paddingHorizontal: 7, borderRadius: 6, backgroundColor: color.muted, justifyContent: "center" },
  appTagText: { fontSize: 10, fontWeight: "700", color: color.mutedForeground },
  appMeta: { fontSize: 12, color: color.mutedForeground, marginTop: 3 },
  appMsg: { fontSize: 12, color: color.mutedForeground, marginTop: 6, lineHeight: 18 },
  appActs: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 10, flexWrap: "wrap" },

  small: { height: 34, paddingHorizontal: 13, borderRadius: 9, justifyContent: "center" },
  smallPri: { backgroundColor: color.brand },
  smallPriText: { fontSize: 13, fontWeight: "600", color: color.brandForeground },
  smallGhost: { borderWidth: 1, borderColor: color.border },
  smallGhostText: { fontSize: 13, fontWeight: "600", color: color.mutedForeground },

  btn: { height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 12 },
  btnPri: { backgroundColor: color.brand },
  btnPriText: { fontSize: 14, fontWeight: "600", color: color.brandForeground },
  btnDark: { backgroundColor: color.foreground },
  btnDarkText: { fontSize: 14, fontWeight: "600", color: color.card },
  btnGhost: { borderWidth: 1, borderColor: color.border, backgroundColor: color.card },
  btnGhostText: { fontSize: 14, fontWeight: "600", color: color.mutedForeground },

  cands: { marginTop: 12, gap: 11 },
  cand: {
    padding: space.md,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: color.border,
  },
  candHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: color.card,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 12, fontWeight: "700", color: color.mutedForeground },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  candName: { flexShrink: 1, fontSize: 14, fontWeight: "600", color: color.foreground },
  candMeta: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },

  score: { height: 24, paddingHorizontal: 9, borderRadius: 7, backgroundColor: color.muted, justifyContent: "center" },
  scoreGood: { backgroundColor: color.success + "1f" },
  scoreText: { fontSize: 12, fontWeight: "700", color: color.mutedForeground },
  scoreTextGood: { color: "#15803d" },

  notes: { marginTop: 11, paddingTop: 11, borderTopWidth: 1, borderTopColor: color.border, gap: 6 },
  note: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  noteText: { flex: 1, fontSize: 12, color: color.mutedForeground, lineHeight: 18 },
  noteGap: { color: "#92400e" },

  emptyText: { fontSize: 13, color: color.mutedForeground, textAlign: "center", lineHeight: 19, paddingVertical: space.md },
});
