/**
 * I2 — vakansiya va ariza.
 *
 * ── MOSLIK TO'LIQ YOYILADI ──────────────────────────────────────
 *
 * Ro'yxatda uchta sabab sig'adi, bu yerda hammasi. Kamchilik
 * alohida ajratiladi va u sababdan foydaliroq: «chegara
 * hujjatingiz yo'q» degan qator haydovchiga nima qilish
 * kerakligini aytadi, shuning uchun yonida hujjat qo'shish
 * havolasi turadi.
 *
 * ── ARIZA TARIF ORTIDA ──────────────────────────────────────────
 *
 * `job_apply` — START tarifiga kiradi. Ro'yxat javobida `canApply`
 * keladi va tugma sababini darhol aytadi.
 */
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Field, Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, font, radius, space } from "@/lib/theme";
import { matchNote, payKindLabel, t } from "@/lib/i18n";

type Note = { tk: string; v?: Record<string, string | number> };

type Vacancy = {
  id: string;
  title: string | null;
  status: string;
  owner: string;
  furamId: number;
  verified: boolean;
  pay: { amount: number | null; to: number | null; currency: string; kind: string; negotiable: boolean };
  schedule: string | null;
  employment: string | null;
  location: string | null;
  route: { from: string | null; to: string | null } | null;
  vehicle: { plate: string; title: string; year: number | null } | null;
  vehicleType: string | null;
  minExperienceY: number | null;
  licenseClasses: string[];
  countries: string[];
  docs: string[];
  requirements: string[];
  benefits: string[];
  note: string | null;
  applications: number;
};

export default function Vakansiya() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, loading, error, reload } = useApi<{
    vacancy: Vacancy;
    match: { score: number; reasons: Note[]; gaps: Note[]; matched: number } | null;
    viewer: {
      authed: boolean;
      isOwner: boolean;
      hasResume: boolean;
      canApply: boolean;
      application: { id: string; status: string } | null;
    };
  }>(id ? `/api/jobs/${id}` : null, [id]);

  const [sheet, setSheet] = useState(false);
  const [locked, setLocked] = useState(false);

  if (loading && !data) {
    return (
      <View style={s.root}>
        <Header title={t("mob.job.one")} />
        <View style={{ padding: space.lg }}>
          <Skeleton rows={4} />
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={s.root}>
        <Header title={t("mob.job.one")} />
        <View style={{ padding: space.lg }}>
          <ErrorBox message={error ?? t("mob.state.noData")} onRetry={reload} />
        </View>
      </View>
    );
  }

  const { vacancy: v, match, viewer } = data;

  return (
    <View style={s.root}>
      <Header title={t("mob.job.one")} />

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}>
        {/* ── Bosh ma'lumot */}
        <View style={s.card}>
          <Text style={s.name}>{v.title ?? t("mob.job.noTitle")}</Text>
          <View style={s.ownerRow}>
            <Text style={s.owner}>{v.owner}</Text>
            {v.verified && <Icon name="check" size={14} stroke={color.success} />}
            <Text style={s.furam}>FURAM-{v.furamId}</Text>
          </View>

          {v.pay.negotiable || v.pay.amount == null ? (
            <Text style={s.pay}>{t("mob.job.negotiable")}</Text>
          ) : (
            <>
              <Text style={s.pay}>
                {fmtNum(v.pay.amount)}
                {v.pay.to != null ? `–${fmtNum(v.pay.to)}` : ""}{" "}
                <Text style={s.payCur}>{v.pay.currency}</Text>
              </Text>
              <Text style={s.payKind}>{payKindLabel(v.pay.kind)}</Text>
            </>
          )}

          <View style={s.chips}>
            {[v.schedule, v.employment, v.location].filter(Boolean).map((x) => (
              <View key={x as string} style={s.chip}>
                <Text style={s.chipText}>{x}</Text>
              </View>
            ))}
          </View>

          {v.route && (v.route.from || v.route.to) && (
            <Text style={s.route}>
              {[v.route.from, v.route.to].filter(Boolean).join(" → ")}
            </Text>
          )}
        </View>

        {/* ══ MOSLIK — TO'LIQ ══ */}
        {match && (
          <View style={[s.card, match.score >= 80 && s.cardGood]}>
            <View style={s.matchHead}>
              <View style={[s.score, match.score >= 80 && s.scoreGood]}>
                <Text style={[s.scoreText, match.score >= 80 && s.scoreTextGood]}>
                  {t("mob.job.scoreN", { n: match.score })}
                </Text>
              </View>
              <Text style={s.matchMeta}>
                {t("mob.job.matchedN", { n: match.matched })}
              </Text>
            </View>

            <View style={s.notes}>
              {match.reasons.map((n, i) => (
                <View key={`r-${n.tk}-${i}`} style={s.note}>
                  <Icon name="check" size={16} stroke={color.success} />
                  <Text style={s.noteText}>{matchNote(n.tk, n.v)}</Text>
                </View>
              ))}

              {match.gaps.length > 0 && match.reasons.length > 0 && <View style={s.line} />}

              {/* KAMCHILIK — bu yerda eng foydali qator */}
              {match.gaps.map((n, i) => (
                <View key={`g-${n.tk}-${i}`} style={s.note}>
                  <Icon name="alert" size={16} stroke={color.warning} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.noteGap}>{matchNote(n.tk, n.v)}</Text>
                    {n.tk === "docsMissing" && (
                      <Pressable onPress={() => router.push("/hujjatlarim")}>
                        <Text style={s.fix}>{t("mob.job.addDocs")}</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {!viewer.hasResume && viewer.authed && (
          <Pressable style={s.hintBox} onPress={() => router.push("/rezyume")}>
            <Text style={s.hintTitle}>{t("mob.job.noResumeTitle")}</Text>
            <Text style={s.hintText}>{t("mob.job.noResumeText")}</Text>
          </Pressable>
        )}

        {/* ── Talablar */}
        <View style={s.card}>
          <Text style={s.sec}>{t("mob.job.requirements")}</Text>
          <View style={{ marginTop: 4 }}>
            {v.minExperienceY != null && (
              <Row label={t("mob.job.experience")} value={t("mob.job.yearsFrom", { n: v.minExperienceY })} />
            )}
            {v.licenseClasses.length > 0 && (
              <Row label={t("mob.job.licence")} value={v.licenseClasses.join(", ")} />
            )}
            {v.countries.length > 0 && (
              <Row label={t("mob.job.countries")} value={v.countries.join(", ")} />
            )}
            {v.docs.length > 0 && (
              <Row label={t("mob.job.docs")} value={v.docs.join(", ")} last />
            )}
          </View>

          {v.requirements.length > 0 && (
            <View style={s.reqList}>
              {v.requirements.map((r) => (
                <Text key={r} style={s.req}>
                  · {r}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* ── Mashina */}
        {(v.vehicle || v.vehicleType) && (
          <View style={s.card}>
            <Text style={s.sec}>{t("mob.job.vehicle")}</Text>
            <Text style={s.text}>
              {v.vehicle
                ? [v.vehicle.title, v.vehicle.plate, v.vehicle.year].filter(Boolean).join(" · ")
                : v.vehicleType}
            </Text>
          </View>
        )}

        {/* ── Sharoit */}
        {v.benefits.length > 0 && (
          <View style={s.card}>
            <Text style={s.sec}>{t("mob.job.benefits")}</Text>
            <View style={s.chips}>
              {v.benefits.map((b) => (
                <View key={b} style={s.chip}>
                  <Text style={s.chipText}>{t(`mob.benefit.${b}`)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {v.note ? (
          <View style={s.card}>
            <Text style={s.sec}>{t("mob.job.note")}</Text>
            <Text style={s.text}>{v.note}</Text>
          </View>
        ) : null}

        {locked && (
          <View style={s.warn}>
            <Text style={s.warnTitle}>{t("mob.job.lockedTitle")}</Text>
            <Text style={s.warnText}>{t("mob.job.lockedText")}</Text>
          </View>
        )}

        {/* ── Ariza */}
        {viewer.isOwner ? (
          <Text style={s.own}>{t("mob.job.ownVacancy")}</Text>
        ) : !viewer.authed ? (
          <Pressable style={[s.btn, s.btnPri]} onPress={() => router.push("/kirish")}>
            <Text style={s.btnPriText}>{t("mob.market.signInToCall")}</Text>
          </Pressable>
        ) : viewer.application ? (
          <Pressable style={[s.btn, s.btnGhost]} onPress={() => router.push("/arizalarim")}>
            <Text style={s.btnGhostText}>
              {t("mob.job.applied", { s: t(`mob.appStatus.${viewer.application.status}`) })}
            </Text>
          </Pressable>
        ) : v.status !== "OPEN" ? (
          <Text style={s.own}>{t("mob.job.closed")}</Text>
        ) : (
          <>
            <Pressable
              style={[s.btn, s.btnPri]}
              onPress={() => (viewer.canApply ? setSheet(true) : setLocked(true))}
            >
              <Text style={s.btnPriText}>{t("mob.job.apply")}</Text>
            </Pressable>
            <Text style={s.note2}>{t("mob.job.applyNote")}</Text>
          </>
        )}
      </ScrollView>

      <ApplySheet
        open={sheet}
        vacancyId={v.id}
        onClose={() => setSheet(false)}
        onDone={() => {
          setSheet(false);
          reload();
        }}
      />
    </View>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.r, last && { borderBottomWidth: 0 }]}>
      <Text style={s.rk}>{label}</Text>
      <Text style={s.rv}>{value}</Text>
    </View>
  );
}

/** Ariza oynasi — bitta katak, majburiy emas */
function ApplySheet({
  open,
  vacancyId,
  onClose,
  onDone,
}: {
  open: boolean;
  vacancyId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const insets = useSafeAreaInsets();

  async function send() {
    setBusy(true);
    setErr("");
    try {
      await api(`/api/vacancies/${vacancyId}/apply`, {
        method: "POST",
        body: message.trim() ? { message: message.trim() } : {},
      });
      onDone();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.sheetBack}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[s.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <View style={s.grab} />
          <Text style={s.sheetTitle}>{t("mob.job.apply")}</Text>
          <Text style={s.sheetSub}>{t("mob.job.applySub")}</Text>

          {err ? <ErrorBox message={err} /> : null}

          <Field
            label={t("mob.job.message")}
            value={message}
            onChangeText={setMessage}
            placeholder={t("mob.job.messagePh")}
            multiline
            style={s.area}
          />

          <Button title={t("mob.job.send")} loading={busy} onPress={() => void send()} />
          <Pressable onPress={onClose} style={s.later}>
            <Text style={s.laterText}>{t("mob.common.cancel")}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.md,
  },
  cardGood: { borderColor: color.success + "66" },

  name: { fontSize: 19, fontWeight: "700", color: color.foreground },
  ownerRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  owner: { fontSize: 13, color: color.mutedForeground },
  furam: { fontSize: 12, color: "#94a3b8" },

  pay: { fontSize: 24, fontWeight: "700", color: color.foreground, marginTop: 13, letterSpacing: -0.5 },
  payCur: { fontSize: 14, color: color.mutedForeground },
  payKind: { fontSize: 13, color: color.mutedForeground, marginTop: 1 },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  chip: { height: 26, paddingHorizontal: 10, borderRadius: 8, backgroundColor: color.muted, justifyContent: "center" },
  chipText: { fontSize: 12, fontWeight: "500", color: color.mutedForeground },
  route: { fontSize: 13, color: color.mutedForeground, marginTop: 10 },

  matchHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  score: { height: 28, paddingHorizontal: 11, borderRadius: 8, backgroundColor: color.muted, justifyContent: "center" },
  scoreGood: { backgroundColor: color.success + "1f" },
  scoreText: { fontSize: 14, fontWeight: "700", color: color.mutedForeground },
  scoreTextGood: { color: "#15803d" },
  matchMeta: { flex: 1, fontSize: 12, color: color.mutedForeground },

  notes: { marginTop: 13, gap: 8 },
  note: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  noteText: { flex: 1, fontSize: 13, color: color.foreground, lineHeight: 19 },
  noteGap: { fontSize: 13, color: "#92400e", lineHeight: 19 },
  fix: { fontSize: 12, fontWeight: "600", color: color.brand, marginTop: 3 },
  line: { height: 1, backgroundColor: color.muted, marginVertical: 3 },

  hintBox: {
    padding: space.md,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
  },
  hintTitle: { fontSize: font.caption, fontWeight: "600", color: color.foreground },
  hintText: { fontSize: 12, color: color.mutedForeground, marginTop: 4, lineHeight: 18 },

  sec: { fontSize: 15, fontWeight: "700", color: color.foreground },
  text: { fontSize: 13, color: color.mutedForeground, marginTop: 8, lineHeight: 20 },

  r: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: color.muted,
    gap: space.md,
  },
  rk: { fontSize: 13, color: color.mutedForeground },
  rv: { flexShrink: 1, fontSize: 13, fontWeight: "600", color: color.foreground, textAlign: "right" },

  reqList: { marginTop: 10, gap: 4 },
  req: { fontSize: 13, color: color.mutedForeground, lineHeight: 19 },

  warn: {
    padding: space.md,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.warning + "59",
    backgroundColor: color.warning + "0d",
  },
  warnTitle: { fontSize: font.caption, fontWeight: "600", color: "#92400e" },
  warnText: { fontSize: 12, color: "#92400e", marginTop: 4, lineHeight: 18 },

  own: { fontSize: 13, color: color.mutedForeground, textAlign: "center", paddingVertical: space.md },
  note2: { fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 8, lineHeight: 16 },

  btn: { height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  btnPri: { backgroundColor: color.brand },
  btnPriText: { fontSize: 15, fontWeight: "600", color: color.brandForeground },
  btnGhost: { borderWidth: 1, borderColor: color.border, backgroundColor: color.card },
  btnGhostText: { fontSize: 14, fontWeight: "600", color: color.mutedForeground },

  sheetBack: { flex: 1, backgroundColor: "#0f172acc", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: color.background,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: space.lg,
    gap: space.sm,
  },
  grab: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#cbd5e1", alignSelf: "center", marginBottom: space.xs },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: color.foreground },
  sheetSub: { fontSize: 13, color: color.mutedForeground, lineHeight: 19, marginBottom: space.xs },
  area: { minHeight: 90, textAlignVertical: "top" },
  later: { alignItems: "center", paddingVertical: space.md },
  laterText: { fontSize: font.body, fontWeight: "600", color: color.mutedForeground },
});
