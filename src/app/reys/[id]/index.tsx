/**
 * E2 — reys tafsiloti. Ilovadagi eng ko'p ochiladigan ekran.
 *
 * Ma'lumot bitta so'rovdan (`/api/trips/[id]`): bosqichlar, marshrut, yuk,
 * mashina, hujjat va xarajat soni, pul, ishtirokchilar.
 */
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";
import { Icon } from "@/components/Icon";
import { StatusChip, toneFor } from "@/components/cards";
import { ErrorBox, Skeleton } from "@/components/state";
import { HolatSheet } from "@/components/HolatSheet";
import { useApi } from "@/lib/use-api";
import { color, font, radius, shadow, space } from "@/lib/theme";

type Step = { status: string; label: string; at: string | null; state: "done" | "current" | "next" };

type Trip = {
  id: string; no: number; status: string; statusLabel: string;
  isLive: boolean; trackingOn: boolean; myRoleLabel: string;
  steps: Step[];
  route: {
    from: string; fromCountry: string; to: string; toCountry: string; distanceKm: number | null;
  };
  position: {
    placeName: string | null; remainingKm: number | null; etaAt: string | null;
    speedKmh: number | null; at: string;
  } | null;
  cargo: { title: string | null; weightT: number | null; volumeM3: number | null; vehicleType: string };
  truck: { plate: string; model: string | null } | null;
  driver: { name: string; phone: string | null } | null;
  counts: { documents: number; expenses: number };
  payment: { status: string; agreed: number | null; currency: string; paid: number };
  participants: { role: string; roleLabel: string; name: string; phone: string | null }[];
};

/**
 * Asosiy tugma matni — KEYINGI bosqich nomi bilan.
 *
 * Joriy holat emas, maqsad holat bo'yicha: haydovchi «hozir qayerdaman»
 * emas, «endi nima qildim» deb bosadi.
 */
const ACTION: Record<string, string> = {
  TO_LOADING: "Yuklashga yo'l oldim",
  LOADED: "Yuk yuklandi",
  ON_ROAD: "Yo'lga chiqdim",
  AT_BORDER: "Chegaraga yetdim",
  NEAR_DESTINATION: "Chegaradan o'tdim",
  UNLOADED: "Yukni tushirdim",
  CLOSING: "Reysni yopishga o'tish",
};

export default function ReysTafsiloti() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sheet, setSheet] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, loading, error, refreshing, refresh, reload } = useApi<Trip>(
    id ? `/api/trips/${id}` : null,
    [id],
  );

  /* Keyingi bosqich — serverning `steps` ro'yxatidagi birinchi «next».
     Zanjir mantiqi bitta joyda (serverda) tursin. */
  const next = data?.steps.find((st) => st.state === "next")?.status ?? null;

  const eta = data?.position?.etaAt ? new Date(data.position.etaAt) : null;
  const covered =
    data?.route.distanceKm != null && data.position?.remainingKm != null
      ? Math.max(0, data.route.distanceKm - data.position.remainingKm)
      : null;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.back}>
          <Icon name="back" size={22} stroke={color.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Reys #TR-{data?.no ?? "…"}</Text>
          {data ? (
            <Text style={s.sub}>
              {data.route.from} → {data.route.to}
            </Text>
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: space.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ padding: space.lg }}>
            <Skeleton rows={2} />
          </View>
        ) : null}
        {error ? (
          <View style={{ padding: space.lg }}>
            <ErrorBox message={error} onRetry={reload} />
          </View>
        ) : null}

        {data ? (
          <>
            <RouteMap trip={data} />

            {/* Jonli raqamlar */}
            <View style={s.figures}>
              <Figure value={data.position?.remainingKm ?? null} label="km qoldi" />
              <View style={s.vline} />
              <Figure
                text={eta ? `${String(eta.getHours()).padStart(2, "0")}:${String(eta.getMinutes()).padStart(2, "0")}` : null}
                label="yetib boradi"
              />
              <View style={s.vline} />
              <Figure value={covered} label="km bosildi" />
            </View>

            <View style={s.body}>
              {/* Bosqichlar */}
              <View style={s.card}>
                <View style={s.cardHead}>
                  <Text style={s.cardTitle}>Reys bosqichlari</Text>
                  <StatusChip label={data.statusLabel} tone={toneFor(data.status)} />
                </View>
                <View style={{ marginTop: 14 }}>
                  {data.steps.map((st, i) => (
                    <StepRow key={st.status} step={st} last={i === data.steps.length - 1} />
                  ))}
                </View>
              </View>

              {/* Yuk */}
              <View style={s.card}>
                <Text style={s.cardTitle}>Yuk</Text>
                {data.cargo.title ? <Text style={s.cargoName}>{data.cargo.title}</Text> : null}
                <View style={s.grid3}>
                  <Cell label="Og'irlik" value={data.cargo.weightT != null ? `${data.cargo.weightT} t` : "—"} />
                  <Cell label="Hajm" value={data.cargo.volumeM3 != null ? `${data.cargo.volumeM3} m³` : "—"} />
                  <Cell label="Transport" value={data.cargo.vehicleType} />
                </View>
              </View>

              {/* Mashina va haydovchi */}
              {data.truck || data.driver ? (
                <View style={s.card}>
                  <Text style={s.cardTitle}>Mashina va haydovchi</Text>
                  <View style={s.driverRow}>
                    <View style={s.driverIcon}>
                      <Icon name="truck" size={20} />
                    </View>
                    <View style={{ flex: 1 }}>
                      {data.truck ? (
                        <Text style={s.driverName}>
                          {data.truck.plate}
                          {data.truck.model ? ` · ${data.truck.model}` : ""}
                        </Text>
                      ) : null}
                      {data.driver ? <Text style={s.meta}>{data.driver.name}</Text> : null}
                    </View>
                    {data.driver?.phone ? (
                      <Pressable style={s.call} onPress={() => Linking.openURL(`tel:${data.driver!.phone}`)}>
                        <Text style={s.callText}>Qo&apos;ng&apos;iroq</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ) : null}

              {/* Ro'yxatlar */}
              <View style={s.list}>
                <ListRow icon="doc" title="Hujjatlar" sub="CMR, invoys, suratlar" value={String(data.counts.documents)}
                  onPress={() => router.push(`/reys/${id}/hujjatlar`)} />
                <ListRow icon="package" title="Xarajatlar" sub="Yoqilg'i, yo'l haqi" value={String(data.counts.expenses)}
                  onPress={() => router.push(`/reys/${id}/xarajatlar`)} />
                <ListRow icon="user" title="Ishtirokchilar" sub={data.participants.map((p) => p.roleLabel).join(", ")} value={String(data.participants.length)} last />
              </View>

              {/* Pul */}
              {data.payment.agreed != null ? (
                <View style={s.card}>
                  <Text style={s.cardTitle}>Hisob-kitob</Text>
                  <Row label="Kelishilgan summa" value={fmt(data.payment.agreed, data.payment.currency)} />
                  <Row label="To'langan" value={fmt(data.payment.paid, data.payment.currency)} tone={color.success} />
                  <View style={s.total}>
                    <Text style={s.totalLabel}>Qoldi</Text>
                    <Text style={s.totalValue}>
                      {fmt(Math.max(0, data.payment.agreed - data.payment.paid), data.payment.currency)}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Pastki harakat paneli */}
      {data && !next ? (
        <View style={[s.actions, { paddingBottom: insets.bottom + space.lg }]}>
          <Pressable
            style={({ pressed }) => [s.primary, pressed && { backgroundColor: color.brandHover }]}
            onPress={() => router.push(`/reys/${id}/hisobot`)}
          >
            <Icon name="doc" size={19} stroke="#fff" />
            <Text style={s.primaryText}>Hisobotni ko&apos;rish</Text>
          </Pressable>
        </View>
      ) : null}

      {next && ACTION[next] ? (
        <View style={[s.actions, { paddingBottom: insets.bottom + space.lg }]}>
          <Pressable
            style={({ pressed }) => [s.primary, pressed && { backgroundColor: color.brandHover }]}
            onPress={() => setSheet(true)}
          >
            <Icon name="check" size={19} stroke="#fff" />
            <Text style={s.primaryText}>{ACTION[next]}</Text>
          </Pressable>
          <View style={s.sos}>
            <Icon name="alert" size={18} stroke={color.danger} />
            <Text style={s.sosText}>SOS</Text>
          </View>
        </View>
      ) : null}

      <HolatSheet
        open={sheet}
        tripId={String(id)}
        next={next}
        onClose={() => setSheet(false)}
        onDone={() => {
          setSheet(false);
          reload();
        }}
      />
    </View>
  );
}

/* ─────────────────────────────────────────────── bo'laklar */

function fmt(n: number, cur: string) {
  return `${new Intl.NumberFormat("ru-RU").format(n)} ${cur}`;
}

function Figure({ value, text, label }: { value?: number | null; text?: string | null; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={s.figureNum}>{text ?? (value != null ? value : "—")}</Text>
      <Text style={s.figureLabel}>{label}</Text>
    </View>
  );
}

function StepRow({ step, last }: { step: Step; last: boolean }) {
  const done = step.state === "done";
  const now = step.state === "current";
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <View style={{ alignItems: "center", width: 20 }}>
        {done ? (
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Circle cx={12} cy={12} r={10} fill={color.success} />
            <Path d="m8.5 12 2.5 2.5 4.5-5" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        ) : now ? (
          <View style={s.dotNow}>
            <View style={s.dotNowInner} />
          </View>
        ) : (
          <View style={s.dotNext} />
        )}
        {!last ? <View style={[s.line, done && { backgroundColor: color.success }]} /> : null}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : 14 }}>
        <Text style={[s.stepLabel, now && { color: color.brand, fontWeight: "700" }, step.state === "next" && s.stepNext]}>
          {step.label}
        </Text>
        {step.at ? <Text style={s.meta}>{when(step.at)}</Text> : now ? <Text style={s.meta}>Hozir</Text> : null}
      </View>
    </View>
  );
}

function when(iso: string) {
  const d = new Date(iso);
  const M = ["yanv", "fev", "mart", "apr", "may", "iyun", "iyul", "avg", "sent", "okt", "noya", "dek"];
  return `${d.getDate()}-${M[d.getMonth()]}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.cellLabel}>{label}</Text>
      <Text style={s.cellValue}>{value}</Text>
    </View>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={s.moneyRow}>
      <Text style={s.meta}>{label}</Text>
      <Text style={[s.moneyValue, tone ? { color: tone } : null]}>{value}</Text>
    </View>
  );
}

function ListRow({ icon, title, sub, value, last, onPress }: {
  icon: "doc" | "package" | "user"; title: string; sub: string; value: string;
  last?: boolean; onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.listRow, !last && s.listDivider, pressed && onPress ? { backgroundColor: "#fafbfc" } : null]}
    >
      <View style={s.listIcon}>
        <Icon name={icon} size={18} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.listTitle}>{title}</Text>
        <Text style={s.meta} numberOfLines={1}>{sub}</Text>
      </View>
      <Text style={s.listValue}>{value}</Text>
      <Icon name="chevron" size={18} stroke="#94a3b8" />
    </Pressable>
  );
}

/**
 * Marshrut ko'rinishi.
 *
 * Bu HAQIQIY xarita emas — chizma. Haqiqiy xarita uchun Android'da
 * Google Maps kaliti kerak, u hali olinmagan. Kalit kelganda
 * `react-native-maps` bilan almashtiriladi; qolgan hammasi joyida
 * qoladi.
 */
function RouteMap({ trip }: { trip: Trip }) {
  const total = trip.route.distanceKm ?? null;
  const left = trip.position?.remainingKm ?? null;
  const t = total && left != null ? Math.min(1, Math.max(0, (total - left) / total)) : 0.45;

  const x = 40 + (330 - 40) * t;
  const y = 132 - (132 - 44) * t;

  return (
    <View style={s.map}>
      <Svg width="100%" height={190} viewBox="0 0 373 190">
        <Rect width={373} height={190} fill="#dfe6ef" />
        <Path d="M0 52 L373 40" stroke="#cfd9e6" strokeWidth={1.5} />
        <Path d="M0 128 L373 144" stroke="#cfd9e6" strokeWidth={1.5} />
        <Path d="M80 0 L62 190" stroke="#cfd9e6" strokeWidth={1.5} />
        <Path d="M262 0 L286 190" stroke="#cfd9e6" strokeWidth={1.5} />
        <Path d="M-10 168 C 60 160, 120 182, 200 174 S 330 152, 383 162" fill="none" stroke="#c8d4e3" strokeWidth={9} strokeLinecap="round" />
        <Path d="M40 132 C 110 130, 150 90, 210 86 S 300 60, 330 44" fill="none" stroke={color.brand} strokeWidth={4} strokeLinecap="round" />
        <Circle cx={40} cy={132} r={7} fill="#fff" stroke={color.foreground} strokeWidth={3} />
        <Circle cx={330} cy={44} r={7} fill="#fff" stroke={color.brand} strokeWidth={3} />
        <G>
          <Circle cx={x} cy={y} r={17} fill={color.brand} opacity={0.18} />
          <Circle cx={x} cy={y} r={11} fill={color.brand} stroke="#fff" strokeWidth={3} />
        </G>
      </Svg>

      <View style={s.mapBadge}>
        <View style={[s.gpsDot, !trip.trackingOn && { backgroundColor: "#94a3b8" }]} />
        <Text style={s.mapBadgeText}>
          {trip.trackingOn ? "Jonli kuzatuv" : "Kuzatuv o'chirilgan"}
        </Text>
      </View>

      {trip.position?.placeName ? (
        <View style={s.mapPlace}>
          <Text style={s.mapPlaceText}>{trip.position.placeName}</Text>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  header: { backgroundColor: color.card, flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, gap: 4 },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "700", color: color.foreground },
  sub: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },

  map: { height: 190, backgroundColor: "#dfe6ef", overflow: "hidden" },
  mapBadge: {
    position: "absolute", left: space.lg, top: 14, flexDirection: "row", alignItems: "center", gap: 7,
    height: 28, paddingHorizontal: 11, borderRadius: radius.control, backgroundColor: "rgba(255,255,255,0.94)",
  },
  gpsDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: color.brand },
  mapBadgeText: { fontSize: 12, fontWeight: "600", color: color.foreground },
  mapPlace: {
    position: "absolute", right: space.lg, bottom: 14, height: 28, paddingHorizontal: 11,
    borderRadius: radius.control, backgroundColor: "rgba(255,255,255,0.94)", justifyContent: "center",
  },
  mapPlaceText: { fontSize: 12, fontWeight: "500", color: "#475569" },

  figures: {
    backgroundColor: color.card, flexDirection: "row", paddingVertical: space.lg,
    borderBottomWidth: 1, borderBottomColor: color.border,
  },
  vline: { width: 1, backgroundColor: color.border },
  figureNum: { fontSize: 26, fontWeight: "700", color: color.foreground, letterSpacing: -0.5 },
  figureLabel: { fontSize: 11, color: color.mutedForeground, marginTop: 2 },

  body: { padding: space.lg, gap: space.md },
  card: {
    backgroundColor: color.card, borderRadius: radius.card, borderWidth: 1,
    borderColor: color.border, padding: space.lg, ...shadow.card,
  },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: font.body, fontWeight: "600", color: color.foreground },

  dotNow: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#f45a182e", alignItems: "center", justifyContent: "center" },
  dotNowInner: { width: 9, height: 9, borderRadius: 5, backgroundColor: color.brand },
  dotNext: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: color.border },
  line: { flex: 1, width: 2, backgroundColor: color.border, minHeight: 18 },
  stepLabel: { fontSize: 14, fontWeight: "600", color: color.foreground },
  stepNext: { fontWeight: "500", color: "#94a3b8" },

  cargoName: { fontSize: font.body, fontWeight: "600", color: color.foreground, marginTop: 10 },
  grid3: { flexDirection: "row", gap: 12, marginTop: 14 },
  cellLabel: { fontSize: 11, color: color.mutedForeground },
  cellValue: { fontSize: font.body, fontWeight: "600", color: color.foreground, marginTop: 2 },

  driverRow: { flexDirection: "row", alignItems: "center", gap: 11, marginTop: 12 },
  driverIcon: { width: 36, height: 36, borderRadius: radius.control, backgroundColor: color.muted, alignItems: "center", justifyContent: "center" },
  driverName: { fontSize: 14, fontWeight: "600", color: color.foreground },
  call: { height: 36, paddingHorizontal: 14, borderRadius: radius.control, backgroundColor: "#16a34a1a", justifyContent: "center" },
  callText: { fontSize: 13, fontWeight: "600", color: color.success },

  list: { backgroundColor: color.card, borderRadius: radius.card, borderWidth: 1, borderColor: color.border, ...shadow.card },
  listRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: space.lg },
  listDivider: { borderBottomWidth: 1, borderBottomColor: color.border },
  listIcon: { width: 36, height: 36, borderRadius: radius.control, backgroundColor: color.muted, alignItems: "center", justifyContent: "center" },
  listTitle: { fontSize: 14, fontWeight: "600", color: color.foreground },
  listValue: { fontSize: font.body, fontWeight: "600", color: color.foreground },

  moneyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 10 },
  moneyValue: { fontSize: font.body, fontWeight: "600", color: color.foreground },
  total: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: color.border },
  totalLabel: { fontSize: 14, fontWeight: "600", color: color.foreground },
  totalValue: { fontSize: 19, fontWeight: "700", color: color.foreground },

  meta: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },

  actions: {
    flexDirection: "row", gap: 8, backgroundColor: color.card,
    paddingHorizontal: space.lg, paddingTop: space.md,
    borderTopWidth: 1, borderTopColor: color.border,
  },
  primary: {
    flex: 1, height: 52, borderRadius: radius.control, backgroundColor: color.brand,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  primaryText: { fontSize: font.body, fontWeight: "600", color: "#fff" },
  sos: {
    width: 52, height: 52, borderRadius: radius.control, borderWidth: 1,
    borderColor: "#dc262659", backgroundColor: "#dc26260f", alignItems: "center", justifyContent: "center", gap: 1,
  },
  sosText: { fontSize: 9, fontWeight: "700", color: color.danger },
});
