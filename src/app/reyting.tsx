/**
 * R1 — reytingim.
 *
 * ── BALL EMAS, SABAB ────────────────────────────────────────────
 *
 * «78» degan raqam nima qilish kerakligini aytmaydi. TZ «AI
 * TUSHUNTIRISHI» deb aynan shuni so'raydi: qaysi qism to'lmagan
 * va nega. Shuning uchun ball yonida darhol keyingi darajagacha
 * qancha qolgani turadi — maqsad shu.
 *
 * ── NOL EMAS, «HALI MA'LUMOT YO'Q» ──────────────────────────────
 *
 * Yangi foydalanuvchida ball `null`. Nol ko'rsatish yolg'on
 * bo'lardi: nol «yomon» degani, `null` esa «hali hisoblanmadi».
 * Ikkisi boshqa gap va ekran ham boshqacha yozadi.
 *
 * ── MATN SERVERDAN KELMAYDI ─────────────────────────────────────
 *
 * `TrustPart.label` va `.note` o'zbekcha yasaladi. Bu yerga
 * `key`, `noteKey` va raqamlar keladi — jumla o'quvchining
 * tilida quriladi.
 */
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Field, Header, Notice } from "@/components/ui";
import { Sheet } from "@/components/Sheet";
import { Icon } from "@/components/Icon";
import { ErrorBox, Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Part = {
  key: string;
  points: number;
  max: number;
  noteKey: string;
  noteVars: Record<string, string | number>;
};

type Trust = {
  score: number | null;
  band: string | null;
  status: string | null;
  next: { band: string; need: number } | null;
  parts: Part[];
  /* Sabab jumlasida foiz va son bor — kalitning o'zi yetmaydi */
  reasons: { key: string; vars: Record<string, string | number> }[];
  furamId: number | null;
  since: string | null;
  /* Menga berilgan baholar — ball qayerdan chiqqani va nohaq
     baho ustidan shikoyat qilish uchun */
  received: {
    id: string;
    stars: number;
    comment: string | null;
    byName: string;
    tripNo: number | null;
    at: string;
  }[];
};

/** `furam/src/lib/trust.ts:DEFAULT_BANDS` bilan bir xil to'plam */
const BAND_TONE: Record<string, string> = {
  TOP: "#4ade80",
  GOOD: "#4ade80",
  FAIR: "#e0a33a",
  CAREFUL: "#e0a33a",
  LOW: "#fca5a5",
};

export default function Reyting() {
  const insets = useSafeAreaInsets();

  const { data, loading, error, refreshing, refresh, reload } = useApi<Trust>("/api/trust");

  /* Nohaq baho ustidan shikoyat */
  const [report, setReport] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [sentOk, setSentOk] = useState(false);
  const [sendErr, setSendErr] = useState<string | null>(null);

  async function sendReport() {
    if (!report) return;
    setSending(true);
    setSendErr(null);
    try {
      await api(`/api/ratings/${report}/report`, {
        method: "POST",
        body: { reason: reason.trim() },
      });
      setSentOk(true);
      setReason("");
    } catch (e) {
      setSendErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setSending(false);
    }
  }

  const ring = data?.band ? (BAND_TONE[data.band] ?? "#94a3b8") : "#94a3b8";

  return (
    <View style={s.root}>
      <Header
        title={t("mob.trust.title")}
        subtitle={
          data?.furamId
            ? `FURAM-${data.furamId}`
            : undefined
        }
      />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {loading && !data ? (
          <Skeleton rows={3} />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : !data ? null : (
          <>
            {/* ══ BALL VA MAQSAD ══ */}
            <View style={s.hero}>
              <View style={[s.ring, { borderColor: ring }]}>
                {data.score == null ? (
                  <Text style={s.ringDash}>—</Text>
                ) : (
                  <>
                    <Text style={s.ringNum}>{data.score}</Text>
                    <Text style={s.ringMax}>/ 100</Text>
                  </>
                )}
              </View>

              <View style={{ flexGrow: 1, minWidth: 0 }}>
                <Text style={s.bandName}>
                  {data.band
                    ? t(`trustBand.${data.band}`)
                    : t(`trustStatus.${data.status ?? "NEW"}`)}
                </Text>
                <Text style={s.bandHint}>
                  {data.next
                    ? t("mob.trust.toNext", {
                        band: t(`trustBand.${data.next.band}`),
                        n: data.next.need,
                      })
                    : data.score == null
                      ? t("mob.trust.notYet")
                      : t("mob.trust.topBand")}
                </Text>
              </View>
            </View>

            {/* ══ QAYSI QISM TO'LMAGAN ══ */}
            {data.parts.length > 0 && (
              <View>
                <Text style={s.group}>{t("mob.trust.partsGroup")}</Text>
                <View style={[s.card, { gap: 14 }]}>
                  {data.parts.map((p) => {
                    const pct = p.max > 0 ? Math.round((p.points / p.max) * 100) : 0;
                    /* Yarmidan kam to'lgan qism — e'tibor
                       kerak bo'lgan joy, va sabab ham shunda
                       ajratib yoziladi */
                    const low = pct < 60;
                    return (
                      <View key={p.key}>
                        <View style={s.partTop}>
                          <Text style={s.partName}>{t(`trustPart.${p.key}`)}</Text>
                          <Text style={s.partVal}>
                            {p.points} / {p.max}
                          </Text>
                        </View>
                        <View style={s.bar}>
                          <View
                            style={[
                              s.barFill,
                              {
                                width: `${Math.max(2, pct)}%`,
                                backgroundColor: low ? color.warning : color.success,
                              },
                            ]}
                          />
                        </View>
                        <Text style={[s.partNote, low && { color: "#78350f" }]}>
                          {t(`trustNote.${p.noteKey}`, p.noteVars)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ══ ASOSIY OMILLAR ══ */}
            {data.reasons.length > 0 && (
              <View>
                <Text style={s.group}>{t("mob.trust.whyGroup")}</Text>
                <View style={[s.card, { gap: 9 }]}>
                  {data.reasons.map((r) => (
                    <View key={r.key} style={s.reason}>
                      <Icon name="check" size={15} stroke={color.mutedForeground} />
                      <Text style={s.reasonText}>{t(`trustReason.${r.key}`, r.vars)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ══ MENGA BERILGAN BAHOLAR ══
                Ball qayerdan chiqqanini ko'rmasdan uni tuzatib
                bo'lmaydi. Nohaq baho ustidan shu yerdan shikoyat
                qilinadi — uzoq bosib turiladi. */}
            {(data.received ?? []).length > 0 && (
              <View>
                <Text style={s.group}>{t("mob.trust.received")}</Text>
                <View style={{ gap: 8 }}>
                  {data.received.map((r) => (
                    <Pressable
                      key={r.id}
                      onLongPress={() => setReport(r.id)}
                      style={({ pressed }) => [s.rateRow, pressed && { opacity: 0.9 }]}
                    >
                      <View style={s.stars}>
                        <Icon name="star" size={14} stroke={color.warning} fill={color.warning} />
                        <Text style={s.starsText}>{r.stars}</Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.rateName} numberOfLines={1}>
                          {r.byName}
                          {r.tripNo ? ` · FURAM #${r.tripNo}` : ""}
                        </Text>
                        {r.comment ? (
                          <Text style={s.rateComment} numberOfLines={3}>
                            {r.comment}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={s.rateAt}>{r.at.slice(5, 10)}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={s.reportHint}>{t("mob.trust.reportHint")}</Text>
              </View>
            )}

            {/* ══ QANDAY YANGILANADI ══
                Reyting o'zgarmay turgandek ko'rinsa odam uni
                «buzuq» deb o'ylaydi. */}
            <View style={s.note}>
              <Icon name="alert" size={16} stroke={color.mutedForeground} />
              <Text style={s.noteText}>{t("mob.trust.howNote")}</Text>
            </View>
          </>
        )}
      </ScrollView>

      <Sheet open={report !== null} onClose={() => setReport(null)} title={t("mob.trust.reportTitle")}>
        <Text style={s.noteText}>{t("mob.trust.reportLead")}</Text>
        <View style={{ marginTop: space.md }}>
          <Field
            placeholder={t("mob.trust.reportPh")}
            value={reason}
            onChangeText={setReason}
            maxLength={500}
            multiline
          />
        </View>
        {sendErr ? <Notice tone="danger">{sendErr}</Notice> : null}
        {sentOk ? <Notice tone="info">{t("mob.trust.reportSent")}</Notice> : null}
        <View style={{ marginTop: space.md }}>
          <Button
            title={t("mob.trust.reportSend")}
            onPress={sendReport}
            loading={sending}
            disabled={reason.trim().length < 5}
          />
        </View>
      </Sheet>
    </View>
  );
}

const s = themed(() => ({
  rateRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 11,
    backgroundColor: color.card, borderRadius: radius.card, padding: space.md,
  },
  stars: { flexDirection: "row", alignItems: "center", gap: 3, paddingTop: 1 },
  starsText: { fontSize: 13, fontWeight: "800", color: color.foreground },
  rateName: { fontSize: 13.5, fontWeight: "700", color: color.foreground },
  rateComment: { fontSize: 12.5, color: color.mutedForeground, marginTop: 3, lineHeight: 18 },
  rateAt: { fontSize: 11, color: color.mutedForeground },
  reportHint: { fontSize: 11.5, color: color.mutedForeground, marginTop: 8, textAlign: "center" },

  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.lg },
  group: {
    fontSize: 12,
    fontWeight: "600",
    color: color.mutedForeground,
    letterSpacing: 0.3,
    marginBottom: 7,
    marginLeft: 4,
  },

  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: color.navy,
    borderRadius: radius.card,
    padding: 18,
  },
  ring: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  ringNum: { fontSize: 27, fontWeight: "700", color: "#fff", lineHeight: 30 },
  ringMax: { fontSize: 10, color: "#f1f5f999" },
  ringDash: { fontSize: 27, fontWeight: "700", color: "#f1f5f966" },
  bandName: { fontSize: 17, fontWeight: "700", color: "#fff" },
  bandHint: { fontSize: 12.5, color: "#f1f5f9bf", marginTop: 4, lineHeight: 19 },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.md,
  },

  partTop: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  partName: { fontSize: 13.5, fontWeight: "600", color: color.foreground },
  partVal: { fontSize: 13, color: color.mutedForeground },
  bar: { height: 7, borderRadius: 4, backgroundColor: color.muted, marginTop: 6, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  partNote: { fontSize: 12, color: color.mutedForeground, marginTop: 5, lineHeight: 18 },

  reason: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  reasonText: { flex: 1, fontSize: 13, color: color.foreground, lineHeight: 19 },

  note: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: color.mutedForeground + "12",
  },
  noteText: { flex: 1, fontSize: 12.5, color: color.mutedForeground, lineHeight: 19 },
}));
