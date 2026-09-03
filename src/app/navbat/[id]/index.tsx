/**
 * J2 — navbat tafsiloti.
 *
 * VAQT QORA FONDA, 40px. Bu ekrandagi yagona muhim narsa — soat.
 * Haydovchi uni qorong'i kabinada ham, quyoshda ham o'qishi kerak.
 *
 * Tarix ko'rsatiladi: navbatni ba'zan egasi, ba'zan haydovchi
 * oladi. Kim yozgani ko'rinmasa keyin «men olmagandim» degan bahs
 * chiqadi.
 */
import { useState } from "react";
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Card, Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ErrorBox, Skeleton } from "@/components/state";
import { api, API_BASE, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { t } from "@/lib/i18n";
import { color, font, radius, space } from "@/lib/theme";

type Detail = {
  queue: {
    id: string; status: string; border: string; borderMode: string; leadDays: number;
    direction: string | null; slotAt: string | null; timeText: string | null;
    queueNo: string | null; ticketNo: string | null; neededBy: string | null;
    note: string | null; hasProof: boolean; plate: string;
    driver: { fullName: string; phone: string | null } | null;
    trip: { id: string; furamNo: number } | null;
    isOwner: boolean;
  };
  events: { id: string; type: string; at: string; actor: string | null }[];
};

/** Navbat olingan va hali o'tilmagan holatlar */
const OPEN = ["BOOKED", "SOON", "EN_ROUTE"];

function countdown(iso: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) return { text: t("mob.queue.overdue"), share: 1 };
  const min = Math.floor(ms / 60000);
  if (min < 60 * 24) {
    return {
      text: t("mob.queue.leftHM", { h: Math.floor(min / 60), m: min % 60 }),
      // Sanoq chizig'i: bir kunlik oraliqda qancha o'tgani
      share: 1 - min / (60 * 24),
    };
  }
  return { text: t("mob.queue.leftDays", { n: Math.ceil(min / 60 / 24) }), share: 0.1 };
}

export default function NavbatTafsilot() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const { data, loading, error, refreshing, refresh, reload } = useApi<Detail>(
    id ? `/api/queues/${id}` : null,
    [id],
  );

  async function act(action: "passed" | "answer", extra?: Record<string, unknown>) {
    setBusy(true);
    try {
      await api(`/api/queues/${id}`, { method: "PATCH", body: { action, ...extra } });
      reload();
    } catch (e) {
      Alert.alert(t("mob.queue.saveFailed"), (e as FuramError).message ?? t("mob.common.tryAgain"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={s.root}>
        <Header title={t("mob.queue.title")} />
        <View style={{ padding: space.lg }}>
          <Skeleton rows={4} />
        </View>
      </View>
    );
  }
  if (error || !data) {
    return (
      <View style={s.root}>
        <Header title={t("mob.queue.title")} />
        <View style={{ padding: space.lg }}>
          <ErrorBox message={error ?? t("mob.vehicle.notFound")} onRetry={reload} />
        </View>
      </View>
    );
  }

  const q = data.queue;
  const left = countdown(q.slotAt);
  const booked = OPEN.includes(q.status);

  return (
    <View style={s.root}>
      <Header
        title={q.border}
        subtitle={[q.plate, q.direction].filter(Boolean).join(" · ")}
      />

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
      >
        {/* Sanoq — ekrandagi yagona katta element */}
        {q.timeText || q.slotAt ? (
          <View style={s.clock}>
            <Text style={s.clockLabel}>{t("mob.queue.slotTime")}</Text>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, marginTop: 6 }}>
              <Text style={s.clockTime}>{q.timeText ?? "—"}</Text>
              {q.slotAt ? (
                <Text style={s.clockDate}>
                  {new Date(q.slotAt).toLocaleDateString(undefined, { day: "numeric", month: "long" })}
                </Text>
              ) : null}
            </View>
            {left ? (
              <>
                <View style={s.bar}>
                  <View style={[s.barFill, { width: `${Math.max(4, Math.min(100, left.share * 100))}%` }]} />
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 10 }}>
                  <Icon name="clock" size={15} stroke={color.brand} />
                  <Text style={s.clockLeft}>{left.text}</Text>
                </View>
              </>
            ) : null}
          </View>
        ) : null}

        {/* Ma'lumot */}
        <Card>
          <Text style={s.sec}>{t("mob.queue.info")}</Text>
          {q.queueNo ? <Row k={t("mob.queue.queueNo")} v={q.queueNo} mono /> : null}
          {q.ticketNo ? <Row k={t("mob.queue.ticketNo")} v={q.ticketNo} mono /> : null}
          {q.trip ? <Row k={t("mob.nav.trips")} v={`FURAM #${q.trip.furamNo}`} /> : null}
          {q.driver ? (
            <Row
              k={t("mob.vehicle.mainDriver")}
              v={q.driver.fullName}
              onPress={q.driver.phone ? () => Linking.openURL(`tel:${q.driver!.phone}`) : undefined}
            />
          ) : null}
          {q.note ? <Row k={t("mob.exp.note")} v={q.note} /> : null}
        </Card>

        {/* Tasdiq hujjati */}
        <Card>
          <Text style={s.sec}>{t("mob.queue.proof")}</Text>
          <View style={s.proof}>
            <View style={[s.thumb, !q.hasProof && { borderStyle: "dashed", borderWidth: 1, borderColor: color.border }]}>
              <Icon name="doc" size={20} stroke={q.hasProof ? "#475569" : "#cbd5e1"} />
            </View>
            <Text style={[s.proofName, !q.hasProof && { color: color.mutedForeground }]}>
              {q.hasProof ? `talon-${q.queueNo ?? q.id.slice(0, 6)}.pdf` : t("mob.queue.noProof")}
            </Text>
            {q.hasProof ? (
              <Pressable
                onPress={() => Linking.openURL(`${API_BASE}/api/queues/${q.id}/proof`)}
                style={({ pressed }) => [s.btnSm, pressed && { backgroundColor: color.muted }]}
              >
                <Text style={s.btnSmText}>{t("mob.queue.open")}</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={s.proofHint}>{t("mob.queue.proofHint")}</Text>
        </Card>

        {/* Tarix */}
        {data.events.length > 0 ? (
          <Card style={{ padding: space.lg }}>
            <Text style={s.histTitle}>{t("mob.queue.history")}</Text>
            {data.events.map((e, i) => (
              <View key={e.id} style={s.step}>
                <View style={{ alignItems: "center", width: 24 }}>
                  <View style={[s.dot, i === data.events.length - 1 && s.dotNow]}>
                    {i < data.events.length - 1 ? (
                      <Icon name="check" size={13} stroke={color.success} />
                    ) : null}
                  </View>
                  {i < data.events.length - 1 ? <View style={s.line} /> : null}
                </View>
                <View style={{ flex: 1, paddingBottom: i < data.events.length - 1 ? 16 : 0 }}>
                  <Text style={[s.stepT, i === data.events.length - 1 && { color: color.brand }]}>
                    {t(`mob.queueEv.${e.type}`)}
                  </Text>
                  <Text style={s.stepW}>
                    {new Date(e.at).toLocaleString(undefined, {
                      day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
                    })}
                    {e.actor ? ` · ${e.actor}` : ""}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        ) : null}

        {/* Amallar */}
        <View style={{ gap: space.md }}>
          {booked ? (
            <Button title={t("mob.queue.passedBtn")} loading={busy} onPress={() => act("passed")} />
          ) : (
            <Button
              title={t("mob.queue.record")}
              loading={busy}
              onPress={() => router.push(`/navbat/${q.id}/yozish`)}
            />
          )}
          {/* Vaqtni faqat EGASI o'zgartiradi — navbatni u oladi */}
          {q.isOwner ? (
            <Button
              title={t("mob.queue.changeTime")}
              variant="secondary"
              onPress={() => router.push(`/navbat/${q.id}/yozish`)}
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ k, v, mono, onPress }: { k: string; v: string; mono?: boolean; onPress?: () => void }) {
  const body = (
    <>
      <Text style={s.rowK}>{k}</Text>
      <Text style={[s.rowV, mono && { fontFamily: "monospace" }]}>{v}</Text>
      {onPress ? <Icon name="chevron" size={16} stroke={color.brand} /> : null}
    </>
  );
  if (!onPress) return <View style={s.row}>{body}</View>;
  return (
    <Pressable style={({ pressed }) => [s.row, pressed && { backgroundColor: color.muted }]} onPress={onPress}>
      {body}
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md, paddingBottom: space.xxl * 2 },

  clock: { backgroundColor: color.navy, borderRadius: radius.card, padding: 20 },
  clockLabel: { fontSize: 12, color: "rgba(241,245,249,0.65)", letterSpacing: 0.3 },
  clockTime: { fontSize: 40, fontWeight: "700", color: "#fff", letterSpacing: -1.4 },
  clockDate: { fontSize: 15, color: "rgba(241,245,249,0.75)" },
  bar: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.15)", marginTop: 12, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3, backgroundColor: color.brand },
  clockLeft: { fontSize: 14, fontWeight: "600", color: color.brand },

  sec: {
    padding: space.lg, paddingBottom: 8, fontSize: 12, fontWeight: "600",
    color: color.mutedForeground, letterSpacing: 0.3,
  },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: space.lg, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: color.border,
  },
  rowK: { flex: 1, fontSize: font.caption, color: color.mutedForeground },
  rowV: { fontSize: font.body, fontWeight: "600", color: color.foreground },

  proof: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: space.lg, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: color.border,
  },
  thumb: {
    width: 44, height: 54, borderRadius: 6, backgroundColor: color.muted,
    alignItems: "center", justifyContent: "center",
  },
  proofName: { flex: 1, fontSize: font.body, fontWeight: "600", color: color.foreground },
  btnSm: {
    height: 34, paddingHorizontal: 12, borderRadius: radius.control,
    borderWidth: 1, borderColor: color.border, alignItems: "center", justifyContent: "center",
  },
  btnSmText: { fontSize: font.caption, fontWeight: "600", color: "#475569" },
  proofHint: {
    fontSize: 12, color: color.mutedForeground, lineHeight: 18,
    paddingHorizontal: space.lg, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: color.border,
  },

  histTitle: { fontSize: font.caption, fontWeight: "700", color: color.foreground, marginBottom: 14 },
  step: { flexDirection: "row", gap: 12 },
  dot: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: color.success + "1f",
    alignItems: "center", justifyContent: "center",
  },
  dotNow: { backgroundColor: color.brand + "24", borderWidth: 2, borderColor: color.brand },
  line: { flex: 1, width: 2, backgroundColor: color.border, marginVertical: 2 },
  stepT: { fontSize: 14, fontWeight: "600", color: color.foreground },
  stepW: { fontSize: 12, color: color.mutedForeground, marginTop: 2 },
});
