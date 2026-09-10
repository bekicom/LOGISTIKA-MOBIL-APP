/**
 * Dispetcher paneli — beshta savolga javob.
 *
 * ── NEGA HAYDOVCHI PANELIDAN ALOHIDA ────────────────────────────
 *
 * `panelim` haydovchinikidir: bitta reys, bitta mashina, oylik.
 * Dispetcherda o'nlab reys va o'nlab mashina bo'ladi va savoli
 * boshqacha: qaysi biriga E'TIBOR kerak, bugun qancha ishladim,
 * menga qancha berilishi kerak. Webda ham ikkalasi alohida.
 *
 * ── VALYUTALAR QO'SHILMAYDI ─────────────────────────────────────
 *
 * «Bugun qancha ishladim» bitta raqam emas: dollar ham, so'm ham
 * bo'lishi mumkin. Ular alohida qatorda turadi (2-qoida) —
 * qo'shib yuborilsa raqam soxta bo'lardi.
 *
 * ── SABAB KALIT BILAN KELADI ────────────────────────────────────
 *
 * Server `why: ["sos", "salary"]` yuboradi, tayyor jumla emas.
 * Web «🆘 Ochiq SOS» deb yozadi, ilova esa o'z tilida (1-qoida).
 *
 * ── HISOBOT: PDF va Excel ───────────────────────────────────────
 *
 * Fayl `Authorization` bilan yuklab olinadi (`openRemoteFile`) —
 * oddiy havola bilan ochilsa 401 qaytardi. Hisobot «Analitika»
 * tarifiga kiradi va to'siq oldindan aytiladi (5-qoida).
 */
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Card, GroupLabel, Header } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { TariffNotice } from "@/components/TariffNotice";
import { FuramError } from "@/lib/api";
import { openRemoteFile } from "@/lib/files";
import { useApi } from "@/lib/use-api";
import { tariffBlocked } from "@/lib/features";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t, tripStatusLabel } from "@/lib/i18n";

type Money = { currency: string; amount: number };
type Panel = {
  counts: {
    liveTrips: number;
    attention: number;
    managedLoads: number;
    managedTrucks: number;
    pendingOffers: number;
    freeTrucks: number;
    matchingLoads: number;
    earnedToday: Money[];
    owed: Money[];
  };
  problems: {
    id: string;
    no: number;
    status: string;
    from: string;
    to: string;
    why: string[];
  }[];
  deals: {
    id: string;
    title: string | null;
    money: Money | null;
    paidMarkedAt: string | null;
  }[];
};

const PERIODS = ["", "30", "90", "365"] as const;

function money(m: Money): string {
  return `${new Intl.NumberFormat("ru-RU").format(m.amount)} ${m.currency}`;
}

export default function DispetcherPanel() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [period, setPeriod] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);
  const [repErr, setRepErr] = useState<string | null>(null);

  const { data, loading, error, refreshing, refresh, reload } = useApi<Panel>("/api/panel");
  const c = data?.counts;

  async function report(kind: "pdf" | "excel") {
    if (tariffBlocked("analytics")) return;
    setBusy(kind);
    setRepErr(null);
    try {
      await openRemoteFile(
        `/api/panel/report/${kind}${period ? `?period=${period}` : ""}`,
        kind === "pdf" ? "furam-hisobot.pdf" : "furam-hisobot.xlsx",
      );
    } catch (e) {
      /* `openRemoteFile` XATO TASHLAYDI (403, tarmoq, bo'sh fayl).
         Ushlanmasa ilova jim qolardi: tugma bosiladi, hech narsa
         ochilmaydi va sabab ko'rinmaydi. */
      setRepErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={s.root}>
      <Header title={t("mob.dpanel.title")} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading && !data ? <Skeleton rows={4} /> : null}
        {error && !data ? <ErrorBox message={error} onRetry={reload} /> : null}

        {c ? (
          <>
            {/* Beshta savol */}
            <View style={s.tiles}>
              <Tile
                q={t("mob.dpanel.qLive")}
                value={String(c.liveTrips)}
                sub={t("mob.dpanel.managed", { l: c.managedLoads, m: c.managedTrucks })}
                onPress={() => router.push("/reyslar")}
              />
              <Tile
                q={t("mob.dpanel.qAttention")}
                value={String(c.attention)}
                sub={c.attention > 0 ? t("mob.dpanel.listBelow") : t("mob.dpanel.allFine")}
                tone={c.attention > 0 ? color.danger : color.success}
              />
              <Tile
                q={t("mob.dpanel.qEarned")}
                value={c.earnedToday[0] ? money(c.earnedToday[0]) : "0"}
                sub={
                  c.earnedToday.length > 1
                    ? c.earnedToday.slice(1).map(money).join(" · ")
                    : c.earnedToday.length === 1
                      ? t("mob.dpanel.confirmedToday")
                      : t("mob.dpanel.noPayToday")
                }
                tone={c.earnedToday.length ? color.success : undefined}
                onPress={() => router.push("/moliya")}
              />
              <Tile
                q={t("mob.dpanel.qOwed")}
                value={c.owed[0] ? money(c.owed[0]) : "0"}
                sub={
                  c.owed.length > 1
                    ? c.owed.slice(1).map(money).join(" · ")
                    : c.owed.length === 1
                      ? t("mob.dpanel.notTakenYet")
                      : t("mob.dpanel.noDebt")
                }
                tone={c.owed.length ? color.brand : undefined}
                onPress={() => router.push("/moliya/qarzlar")}
              />
              <Tile
                q={t("mob.dpanel.qMore")}
                value={c.freeTrucks > 0 ? t("mob.dpanel.nLoads", { n: c.matchingLoads }) : "—"}
                sub={
                  c.freeTrucks === 0
                    ? t("mob.dpanel.noFreeTruck")
                    : c.matchingLoads > 0
                      ? t("mob.dpanel.matchFree", { n: c.freeTrucks })
                      : t("mob.dpanel.noMatch", { n: c.freeTrucks })
                }
                tone={c.matchingLoads > 0 ? color.success : undefined}
                onPress={() => router.push("/yuklar")}
              />
            </View>

            {/* Javob tezligi reytingga ta'sir qiladi — ko'rinib tursin */}
            {c.pendingOffers > 0 ? (
              <Pressable
                onPress={() => router.push("/kelishuvlar")}
                style={({ pressed }) => [s.pending, pressed && { opacity: 0.9 }]}
              >
                <Icon name="clock" size={18} stroke={color.brand} />
                <Text style={s.pendingText}>
                  {t("mob.dpanel.pendingOffers", { n: c.pendingOffers })}
                </Text>
                <Icon name="chevron" size={16} stroke={color.mutedForeground} />
              </Pressable>
            ) : null}

            {/* E'tibor kerak */}
            {data.problems.length > 0 ? (
              <View>
                <GroupLabel>{t("mob.dpanel.attention", { n: data.problems.length })}</GroupLabel>
                <Card>
                  {data.problems.map((p, i) => (
                    <Pressable
                      key={p.id}
                      onPress={() => router.push(`/reys/${p.id}`)}
                      style={({ pressed }) => [
                        s.row,
                        i < data.problems.length - 1 && s.rowLine,
                        pressed && { backgroundColor: color.muted },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={s.rowTitle}>
                          #{p.no} · {p.from} → {p.to}
                        </Text>
                        <Text style={s.rowSub}>{tripStatusLabel(p.status)}</Text>
                        <View style={s.whyRow}>
                          {p.why.map((w) => (
                            <View key={w} style={s.why}>
                              <Text style={s.whyText}>{t(`mob.dpanel.why.${w}`)}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                      <Icon name="chevron" size={16} stroke={color.mutedForeground} />
                    </Pressable>
                  ))}
                </Card>
              </View>
            ) : null}

            {/* Kutilayotgan xizmat haqi */}
            {data.deals.length > 0 ? (
              <View>
                <GroupLabel>{t("mob.dpanel.waitingFee")}</GroupLabel>
                <Card>
                  {data.deals.map((d, i) => (
                    <View
                      key={d.id}
                      style={[s.row, i < data.deals.length - 1 && s.rowLine]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={s.rowTitle}>{d.title ?? "—"}</Text>
                        <Text style={s.rowSub}>
                          {d.paidMarkedAt
                            ? t("mob.dpanel.saidTaken", { date: d.paidMarkedAt.slice(0, 10) })
                            : t("mob.dpanel.notTakenYet")}
                        </Text>
                      </View>
                      {d.money ? <Text style={s.fee}>{money(d.money)}</Text> : null}
                    </View>
                  ))}
                </Card>
              </View>
            ) : null}

            {data.problems.length === 0 && data.deals.length === 0 ? (
              <Empty title={t("mob.dpanel.allFine")} text={t("mob.dpanel.allFineText")} />
            ) : null}

            {/* Hisobot */}
            <View>
              <GroupLabel>{t("mob.dpanel.report")}</GroupLabel>
              <TariffNotice feature="analytics" />
              <View style={s.chips}>
                {PERIODS.map((p) => (
                  <Pressable
                    key={p || "all"}
                    onPress={() => setPeriod(p)}
                    style={[s.chip, period === p && s.chipOn]}
                  >
                    <Text style={[s.chipText, period === p && s.chipTextOn]}>
                      {t(`mob.dpanel.period.${p || "all"}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ flexDirection: "row", gap: 9, marginTop: space.md }}>
                <Pressable
                  onPress={() => void report("pdf")}
                  disabled={busy !== null}
                  style={({ pressed }) => [s.dl, pressed && { opacity: 0.85 }]}
                >
                  <Icon name="doc" size={17} stroke={color.brand} />
                  <Text style={s.dlText}>
                    {busy === "pdf" ? t("mob.common.saving") : "PDF"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void report("excel")}
                  disabled={busy !== null}
                  style={({ pressed }) => [s.dl, pressed && { opacity: 0.85 }]}
                >
                  <Icon name="chart" size={17} stroke={color.brand} />
                  <Text style={s.dlText}>
                    {busy === "excel" ? t("mob.common.saving") : "Excel"}
                  </Text>
                </Pressable>
              </View>
              {repErr ? <Text style={s.repErr}>{repErr}</Text> : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Tile({
  q,
  value,
  sub,
  tone,
  onPress,
}: {
  q: string;
  value: string;
  sub: string;
  tone?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [s.tile, pressed && !!onPress && { opacity: 0.9 }]}
    >
      <Text style={s.tileQ}>{q}</Text>
      <Text style={[s.tileV, !!tone && { color: tone }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={s.tileS} numberOfLines={2}>
        {sub}
      </Text>
    </Pressable>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.lg },

  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  tile: {
    flexGrow: 1,
    flexBasis: "47%",
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.md,
    ...shadow.card,
  },
  tileQ: { fontSize: 10.5, fontWeight: "700", color: color.mutedForeground, letterSpacing: 0.3 },
  tileV: { fontSize: 19, fontWeight: "800", color: color.foreground, marginTop: 4 },
  tileS: { fontSize: 11, color: color.mutedForeground, marginTop: 2, lineHeight: 15 },

  pending: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: color.brandSoft,
    borderRadius: radius.control,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  pendingText: { flex: 1, fontSize: 13, fontWeight: "700", color: color.brand },

  row: { flexDirection: "row", alignItems: "center", gap: 11, padding: space.md },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  rowTitle: { fontSize: 13.5, fontWeight: "700", color: color.foreground },
  rowSub: { fontSize: 11.5, color: color.mutedForeground, marginTop: 2 },
  fee: { fontSize: 13.5, fontWeight: "800", color: color.brand },

  whyRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 6 },
  why: {
    backgroundColor: color.danger + "1a",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  whyText: { fontSize: 10.5, fontWeight: "800", color: color.danger },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 6,
    backgroundColor: color.card,
  },
  chipOn: { borderColor: color.brand, backgroundColor: color.brandSoft },
  chipText: { fontSize: 12, fontWeight: "600", color: color.mutedForeground },
  chipTextOn: { color: color.brand, fontWeight: "800" },

  dl: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 46,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.brand + "66",
    backgroundColor: color.card,
  },
  dlText: { fontSize: 13.5, fontWeight: "700", color: color.brand },
  repErr: { fontSize: 12.5, color: color.danger, marginTop: space.sm },
}));
