/**
 * I3 — arizalarim.
 *
 * ── «ISH TAKLIFI» — NOMZODNING QADAMI ───────────────────────────
 *
 * Holat zanjirida `OFFERED → ACCEPTED` ni aynan nomzod bosadi.
 * Bu ekrandagi eng muhim tugma: taklifga javob bermay qolish —
 * ishni yo'qotish. Shuning uchun u kartochkada, ikkita tugma
 * bilan, va kartochkaning o'zi ajratib ko'rsatiladi.
 *
 * Qaysi amal mumkinligini SERVER aytadi (`canAccept`,
 * `canWithdraw`): holat qoidasi `lib/jobs.ts` da qoladi va bu
 * yerda takrorlanmaydi.
 *
 * ── RAD JAVOBI HAM JAVOB ────────────────────────────────────────
 *
 * Rad etilgan ariza ro'yxatdan yo'qolmaydi — odam kutib
 * o'tirmasligi kerak.
 */
import { useState } from "react";
import { FlatList, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Header } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, font, radius, space } from "@/lib/theme";
import { payKindLabel, t } from "@/lib/i18n";

type App = {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  vacancy: {
    id: string;
    title: string | null;
    owner: string;
    phone: string | null;
    location: string | null;
    pay: { amount: number | null; to: number | null; currency: string; kind: string; negotiable: boolean };
    closed: boolean;
  };
  canAccept: boolean;
  canWithdraw: boolean;
  todo: "accept" | null;
};

const TONE: Record<string, string> = {
  PENDING: color.mutedForeground,
  REVIEWING: color.mutedForeground,
  INTERVIEW: color.warning,
  OFFERED: color.brand,
  ACCEPTED: color.success,
  REJECTED: color.danger,
  WITHDRAWN: color.mutedForeground,
};

export default function Arizalarim() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, loading, error, refreshing, refresh, reload } = useApi<{ items: App[] }>(
    "/api/jobs/applications",
  );

  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState("");

  async function move(id: string, to: string) {
    setBusy(id);
    setFailed("");
    try {
      await api("/api/jobs", { method: "POST", body: { action: "app-move", id, to } });
      reload();
    } catch (e) {
      setFailed((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(null);
    }
  }

  const items = data?.items ?? [];

  return (
    <View style={s.root}>
      <Header
        title={t("mob.job.myApps")}
        subtitle={t("mob.job.appsN", { n: items.length })}
      />

      {/* Arizalar tarixi o'sib boradi va hech qachon qisqarmaydi —
          rad etilgani ham ro'yxatda qoladi. */}
      <FlatList
        data={loading && !data ? [] : items}
        keyExtractor={(a) => a.id}
        renderItem={({ item: a }) => {
        const tone = TONE[a.status] ?? color.mutedForeground;
        const done = a.status === "REJECTED" || a.status === "WITHDRAWN";

        return (
          <View
            style={[s.card, a.todo === "accept" && s.cardTodo, done && s.cardDone]}
          >
            <Pressable onPress={() => router.push(`/ish/${a.vacancy.id}`)}>
              <View style={s.head}>
                <View style={[s.tag, { backgroundColor: tone + "1a" }]}>
                  <Text style={[s.tagText, { color: tone }]}>
                    {t(`mob.appStatus.${a.status}`)}
                  </Text>
                </View>
                <Text style={s.when}>{when(a.createdAt)}</Text>
              </View>

              <Text style={s.name} numberOfLines={2}>
                {a.vacancy.title ?? t("mob.job.noTitle")}
              </Text>
              <Text style={s.meta} numberOfLines={1}>
                {[a.vacancy.owner, a.vacancy.location].filter(Boolean).join(" · ")}
              </Text>

              {!a.vacancy.pay.negotiable && a.vacancy.pay.amount != null && (
                <Text style={s.pay}>
                  {fmtNum(a.vacancy.pay.amount)}{" "}
                  <Text style={s.payMeta}>
                    {a.vacancy.pay.currency} · {payKindLabel(a.vacancy.pay.kind)}
                  </Text>
                </Text>
              )}
            </Pressable>

            {/* ══ ISH TAKLIFI — javob mendan kutilmoqda ══ */}
            {a.todo === "accept" && (
              <>
                <View style={s.offerBox}>
                  <Text style={s.offerText}>{t("mob.job.offerHint")}</Text>
                </View>
                <View style={s.row2}>
                  <Pressable
                    style={[s.btn, s.btnGhost]}
                    disabled={busy === a.id}
                    onPress={() => void move(a.id, "WITHDRAWN")}
                  >
                    <Text style={s.btnGhostText}>{t("mob.job.declineOffer")}</Text>
                  </Pressable>
                  <Pressable
                    style={[s.btn, s.btnPri]}
                    disabled={busy === a.id}
                    onPress={() => void move(a.id, "ACCEPTED")}
                  >
                    <Text style={s.btnPriText}>{t("mob.job.acceptOffer")}</Text>
                  </Pressable>
                </View>
              </>
            )}

            {/* Suhbatdan boshlab telefon beriladi */}
            {a.todo !== "accept" && (a.vacancy.phone || a.canWithdraw) && (
              <View style={s.acts}>
                {a.vacancy.phone && (
                  <Pressable
                    style={[s.small, s.smallGhost]}
                    onPress={() => void Linking.openURL(`tel:${a.vacancy.phone}`)}
                  >
                    <Text style={s.smallGhostText}>{a.vacancy.phone}</Text>
                  </Pressable>
                )}
                {a.canWithdraw && (
                  <Pressable
                    style={[s.small, s.smallGhost, { marginLeft: "auto" }]}
                    disabled={busy === a.id}
                    onPress={() => void move(a.id, "WITHDRAWN")}
                  >
                    <Text style={s.smallGhostText}>{t("mob.job.withdraw")}</Text>
                  </Pressable>
                )}
              </View>
            )}

            {a.vacancy.closed && a.status !== "ACCEPTED" && (
              <Text style={s.closed}>{t("mob.job.vacancyClosed")}</Text>
            )}
          </View>
        );
        }}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          failed ? (
            <View style={s.failed}>
              <Text style={s.failedText}>{failed}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading && !data ? (
            <Skeleton rows={3} />
          ) : error ? (
            <ErrorBox message={error} onRetry={reload} />
          ) : (
            <Empty
              icon="package"
              title={t("mob.job.noAppsTitle")}
              text={t("mob.job.noAppsHint")}
              actionLabel={t("mob.job.title")}
              onAction={() => router.push("/ish")}
            />
          )
        }
      />
    </View>
  );
}

/** «bugun» / «3 kun oldin» — `ago()` bilan bir xil qoida */
function when(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return t("mob.job.today");
  return t("mob.ago.day", { n: days });
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
  cardTodo: { borderWidth: 2, borderColor: color.brand },
  cardDone: { opacity: 0.7 },

  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  tag: { height: 21, paddingHorizontal: 8, borderRadius: 6, justifyContent: "center" },
  tagText: { fontSize: 10, fontWeight: "700" },
  when: { marginLeft: "auto", fontSize: 11, color: "#94a3b8" },

  name: { fontSize: 16, fontWeight: "700", color: color.foreground, marginTop: 10 },
  meta: { fontSize: 12, color: color.mutedForeground, marginTop: 2 },
  pay: { fontSize: 18, fontWeight: "700", color: color.foreground, marginTop: 8 },
  payMeta: { fontSize: 13, fontWeight: "400", color: color.mutedForeground },

  offerBox: {
    marginTop: 11,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: color.brand + "12",
  },
  offerText: { fontSize: 13, color: "#9a3412", lineHeight: 19 },

  row2: { flexDirection: "row", gap: 8, marginTop: 12 },
  btn: { flex: 1, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  btnPri: { backgroundColor: color.brand },
  btnPriText: { fontSize: 14, fontWeight: "600", color: color.brandForeground },
  btnGhost: { borderWidth: 1, borderColor: color.border, backgroundColor: color.card },
  btnGhostText: { fontSize: 14, fontWeight: "600", color: color.mutedForeground },

  acts: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: color.muted,
  },
  small: { height: 38, paddingHorizontal: 14, borderRadius: 9, justifyContent: "center" },
  smallGhost: { borderWidth: 1, borderColor: color.border },
  smallGhostText: { fontSize: 13, fontWeight: "600", color: color.mutedForeground },

  closed: { fontSize: 12, color: "#94a3b8", marginTop: 10 },
});
