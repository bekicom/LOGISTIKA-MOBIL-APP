/**
 * E9 — reysni yopish (TZ 20-23).
 *
 * ── UCH BOSQICH, BITTA EKRAN ────────────────────────────────────
 *
 * 1. Shofyorda: «oyligingizni oldingizmi?» — birinchi va yolg'iz
 *    savol. Javob berilmaguncha qolgani ko'rsatilmaydi, aks holda
 *    u baho yulduzlari orasida ko'zdan qochardi.
 * 2. Hammada: kim rozi, kim yo'q — ODAM NOMI bilan. «2/3 tasdiqladi»
 *    kimni kutayotganini aytmaydi.
 * 3. Hamma rozi bo'lgach server o'zi yopadi.
 *
 * ── QIZIL RANG FAQAT NOROZILIKDA ────────────────────────────────
 *
 * Yopishdan oldingi masalalar (`checks`) — SARIQ. Ular to'sqinlik
 * qilmaydi: haqiqiy hayotda chek yo'qoladi, hujjat keyin
 * rasmiylashtiriladi. Reysni yopmay turish mashinani band qilib
 * qo'yadi — bu kamchilikdan ko'ra ko'proq zarar.
 */
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Button, Field, Header, Notice } from "@/components/ui";
import { ErrorBox, Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

type DocIssue =
  | { key: "missing"; kind: string }
  | { key: "expired"; kind: string; title: string | null }
  | { key: "soon"; kind: string; title: string | null; days: number }
  | { key: "country"; country: string };

type Check = { key: string; hard: boolean; n?: number; doc?: DocIssue };
type Approval = {
  userId: string;
  name: string;
  role: string;
  approved: boolean | null;
  stars: number | null;
  comment: string | null;
};
type State = {
  status: string;
  closed: boolean;
  salaryReceived: boolean | null;
  canAnswerSalary: boolean;
  myUserId: string;
  approvals: Approval[];
  checks: Check[];
};

/** Masala matni — KALITDAN yasaladi, serverdan tayyor jumla kelmaydi */
function checkText(c: Check): string {
  if (c.key !== "vehicleDoc" || !c.doc) {
    return t(`mob.close.chk.${c.key}`, { n: c.n ?? 0 });
  }
  const d = c.doc;
  if (d.key === "country") return t("mob.vdoc.country", { c: d.country });
  const doc = d.key === "missing" ? t(`vehDocKind.${d.kind}`) : d.title || t(`vehDocKind.${d.kind}`);
  return d.key === "soon" ? t("mob.vdoc.soon", { doc, n: d.days }) : t(`mob.vdoc.${d.key}`, { doc });
}

export default function ReysYopish() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, loading, error, refreshing, refresh, reload } = useApi<State>(
    id ? `/api/trips/${id}/close` : null,
    [id],
  );

  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [again, setAgain] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const mine = data?.approvals.find((a) => a.userId === data.myUserId) ?? null;
  const answered = data?.approvals.filter((a) => a.approved !== null).length ?? 0;
  const rejected = data?.approvals.filter((a) => a.approved === false) ?? [];

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ closed?: boolean }>(`/api/trips/${id}/close`, {
        method: "POST",
        body,
      });
      setAgain(false);
      if (r?.closed) router.back();
      else reload();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  /* Shofyorning oylik savoli — birinchi va yolg'iz */
  const askSalary = data?.canAnswerSalary && data.salaryReceived === null;

  return (
    <View style={s.root}>
      <Header title={t("mob.close.title")} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {loading && !data ? <Skeleton rows={3} /> : null}
        {error && !data ? <ErrorBox message={error} onRetry={reload} /> : null}

        {data && data.status !== "CLOSING" && !data.closed ? (
          <Notice tone="info">{t("mob.close.notYet")}</Notice>
        ) : null}

        {/* Yopishdan oldingi masalalar — to'sqinlik qilmaydi */}
        {data && data.checks.length > 0 ? (
          <View style={s.checks}>
            <Text style={s.checksTitle}>
              {t("mob.close.checksTitle", { n: data.checks.length })}
            </Text>
            <View style={{ gap: 4, marginTop: 8 }}>
              {data.checks.map((c, i) => (
                <View key={`${c.key}-${i}`} style={{ flexDirection: "row", gap: 7 }}>
                  <Text style={[s.dot, c.hard && { color: color.danger }]}>·</Text>
                  <Text style={[s.checkLine, c.hard && { color: color.danger, fontWeight: "600" }]}>
                    {checkText(c)}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={s.checksHint}>{t("mob.close.checksHint")}</Text>
          </View>
        ) : null}

        {askSalary ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>{t("mob.close.salaryQ")}</Text>
            <Text style={s.hint}>{t("mob.close.salaryHint")}</Text>
            {err ? <Notice tone="danger">{err}</Notice> : null}
            <View style={{ gap: 9, marginTop: space.md }}>
              <Pressable
                onPress={() => post({ action: "salary", salaryReceived: true })}
                disabled={busy}
                style={({ pressed }) => [s.big, s.bigYes, pressed && { opacity: 0.9 }]}
              >
                <Icon name="check" size={19} stroke="#fff" />
                <Text style={s.bigText}>{t("mob.close.yes")}</Text>
              </Pressable>
              <Pressable
                onPress={() => post({ action: "salary", salaryReceived: false })}
                disabled={busy}
                style={({ pressed }) => [s.big, s.bigNo, pressed && { opacity: 0.9 }]}
              >
                <Icon name="close" size={19} stroke="#fff" />
                <Text style={s.bigText}>{t("mob.close.no")}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {data && !askSalary ? (
          <>
            <View style={s.card}>
              <Text style={s.cardTitle}>{t("mob.close.title")}</Text>
              <Text style={s.hint}>{t("mob.close.lead")}</Text>

              {data.salaryReceived === false ? (
                <View style={{ marginTop: space.md }}>
                  <Notice tone="warning">{t("mob.close.salaryUnpaid")}</Notice>
                </View>
              ) : null}

              <View style={{ gap: 9, marginTop: space.md }}>
                {data.approvals.map((a) => (
                  <View key={a.userId} style={s.person}>
                    <View
                      style={[
                        s.mark,
                        a.approved === true && { backgroundColor: color.successSoft },
                        a.approved === false && { backgroundColor: color.dangerSoft },
                      ]}
                    >
                      <Icon
                        name={a.approved === true ? "check" : a.approved === false ? "close" : "clock"}
                        size={15}
                        stroke={
                          a.approved === true
                            ? color.success
                            : a.approved === false
                              ? color.danger
                              : color.mutedForeground
                        }
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.personName} numberOfLines={1}>
                        {a.name}
                        {a.userId === data.myUserId ? ` · ${t("mob.tpart.you")}` : ""}
                      </Text>
                      <Text style={s.personRole}>{t(`mob.role.${a.role}`)}</Text>
                    </View>
                    {a.stars != null ? (
                      <View style={s.stars}>
                        <Icon name="star" size={13} stroke={color.warning} fill={color.warning} />
                        <Text style={s.starsText}>{a.stars}</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>

              <Text style={s.counter}>
                {t("mob.close.answered", { done: answered, total: data.approvals.length })}
              </Text>

              {rejected.map((r) => (
                <View key={r.userId} style={s.reject}>
                  <Text style={s.rejectText}>
                    {r.name}: {r.comment}
                  </Text>
                </View>
              ))}
            </View>

            {/* O'z javobim */}
            <View style={s.card}>
              {mine?.approved === true && !again ? (
                <>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Icon name="check" size={18} stroke={color.success} />
                    <Text style={s.done}>
                      {t("mob.close.mine")}
                      {mine.stars ? ` · ${mine.stars}★` : ""}
                    </Text>
                  </View>
                  <Pressable onPress={() => setAgain(true)} hitSlop={8}>
                    <Text style={s.link}>{t("mob.close.changeMind")}</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={s.cardTitle}>{t("mob.close.rate")}</Text>
                  <View style={s.starRow}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Pressable key={n} onPress={() => setStars(n)} hitSlop={6}>
                        <Icon
                          name="star"
                          size={30}
                          stroke={n <= stars ? color.warning : "#cbd5e1"}
                          fill={n <= stars ? color.warning : "none"}
                        />
                      </Pressable>
                    ))}
                    <Text style={s.starCount}>{stars}/5</Text>
                  </View>

                  <Field
                    placeholder={stars < 3 ? t("mob.close.ratePhLow") : t("mob.close.ratePh")}
                    value={comment}
                    onChangeText={setComment}
                    maxLength={500}
                    multiline
                  />

                  {err ? <Notice tone="danger">{err}</Notice> : null}

                  <View style={{ gap: 9, marginTop: space.md }}>
                    <Button
                      title={t("mob.close.approve")}
                      loading={busy}
                      onPress={() =>
                        post({ action: "approve", stars, comment: comment.trim() || undefined })
                      }
                    />
                    <Pressable
                      onPress={() => post({ action: "reject", comment: comment.trim() || undefined })}
                      disabled={busy}
                      style={({ pressed }) => [s.rejectBtn, pressed && { opacity: 0.9 }]}
                    >
                      <Text style={s.rejectBtnText}>{t("mob.close.reject")}</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },

  card: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.lg,
    ...shadow.card,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: color.foreground },
  hint: { fontSize: 13, color: color.mutedForeground, marginTop: 5, lineHeight: 19 },

  checks: {
    borderRadius: radius.card,
    backgroundColor: color.warningSoft,
    borderWidth: 1,
    borderColor: color.warning + "3d",
    padding: space.md,
  },
  checksTitle: { fontSize: 13.5, fontWeight: "800", color: color.warning },
  dot: { fontSize: 13, color: color.mutedForeground, width: 8 },
  checkLine: { flex: 1, fontSize: 12.5, color: color.mutedForeground, lineHeight: 18 },
  checksHint: { fontSize: 11, color: color.mutedForeground, marginTop: 9, lineHeight: 16 },

  big: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    height: 52,
    borderRadius: radius.control,
  },
  bigYes: { backgroundColor: color.success },
  bigNo: { backgroundColor: color.danger },
  bigText: { fontSize: 15.5, fontWeight: "800", color: "#fff" },

  person: { flexDirection: "row", alignItems: "center", gap: 11 },
  mark: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  personName: { fontSize: 14, fontWeight: "700", color: color.foreground },
  personRole: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },
  stars: { flexDirection: "row", alignItems: "center", gap: 3 },
  starsText: { fontSize: 13, fontWeight: "800", color: color.foreground },
  counter: {
    fontSize: 12,
    fontWeight: "700",
    color: color.mutedForeground,
    marginTop: 12,
  },
  reject: {
    marginTop: 9,
    borderRadius: radius.control,
    backgroundColor: color.dangerSoft,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  rejectText: { fontSize: 12.5, color: color.danger, fontWeight: "600", lineHeight: 18 },

  starRow: { flexDirection: "row", alignItems: "center", gap: 6, marginVertical: 14 },
  starCount: { marginLeft: 6, fontSize: 14, fontWeight: "800", color: color.foreground },

  done: { fontSize: 14.5, fontWeight: "700", color: color.success },
  link: { fontSize: 12.5, fontWeight: "700", color: color.mutedForeground, marginTop: 10 },

  rejectBtn: {
    height: 50,
    borderRadius: radius.control,
    borderWidth: 1.5,
    borderColor: color.danger + "55",
    backgroundColor: color.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectBtnText: { fontSize: 14.5, fontWeight: "800", color: color.danger },
});
