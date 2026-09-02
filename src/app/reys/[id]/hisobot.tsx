/**
 * E6 — reys hisoboti.
 *
 * Yakuniy raqamlar, hujjatlar, xarajatlar va hamkorni baholash.
 * Ma'lumot ikkita mavjud endpointdan yig'iladi — hisobot uchun alohida
 * endpoint yozilmadi, chunki hammasi allaqachon bor.
 */
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Icon } from "@/components/Icon";
import { Button, Notice } from "@/components/ui";
import { ErrorBox, Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, font, radius, shadow, space } from "@/lib/theme";

type Trip = {
  no: number; statusLabel: string; status: string;
  route: { from: string; to: string; distanceKm: number | null };
  cargo: { title: string | null; weightT: number | null };
  payment: { agreed: number | null; currency: string; paid: number };
  participants: { role: string; roleLabel: string; name: string }[];
  counts: { documents: number; expenses: number };
  createdAt: string; closedAt: string | null;
};
type Expenses = { totals: Record<string, number>; count: number };
type Target = { userId: string; name: string; role: string; roleLabel?: string };

function fmt(n: number, cur: string) {
  return `${new Intl.NumberFormat("ru-RU").format(n)} ${cur}`;
}

function days(a: string, b: string | null) {
  const ms = new Date(b ?? Date.now()).getTime() - new Date(a).getTime();
  const h = Math.max(0, Math.round(ms / 3600000));
  return h < 24 ? `${h} soat` : `${Math.floor(h / 24)} kun ${h % 24} soat`;
}

export default function Hisobot() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const trip = useApi<Trip>(id ? `/api/trips/${id}` : null, [id]);
  const exp = useApi<Expenses>(id ? `/api/trips/${id}/expenses/list` : null, [id]);
  const rate = useApi<{ targets: Target[] }>(id ? `/api/ratings?tripId=${id}` : null, [id]);

  const t = trip.data;
  const totals = Object.entries(exp.data?.totals ?? {});

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.back}>
          <Icon name="back" size={22} stroke="#f1f5f9" />
        </Pressable>
        <Text style={s.title}>Reys hisoboti</Text>
      </View>

      {t ? (
        <View style={s.hero}>
          <View style={s.heroChip}>
            <Icon name="check" size={12} stroke="#4ade80" />
            <Text style={s.heroChipText}>{t.statusLabel}</Text>
          </View>
          <View style={s.heroRoute}>
            <Text style={s.heroCity}>{t.route.from}</Text>
            <Icon name="arrow-right" size={20} stroke="#64748b" />
            <Text style={s.heroCity}>{t.route.to}</Text>
          </View>
          <Text style={s.heroNo}>#TR-{t.no}</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: insets.bottom + space.xl }]}
        refreshControl={
          <RefreshControl
            refreshing={trip.refreshing}
            onRefresh={() => { trip.refresh(); exp.refresh(); }}
            tintColor={color.brand}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {trip.loading ? <Skeleton rows={2} /> : null}
        {trip.error ? <ErrorBox message={trip.error} onRetry={trip.reload} /> : null}

        {t ? (
          <>
            {/* Yig'ma raqamlar */}
            <View style={s.card}>
              <View style={s.grid2}>
                <Big label="Bosib o'tilgan yo'l" value={t.route.distanceKm != null ? String(t.route.distanceKm) : "—"} unit="km" />
                <Big label="Davomiyligi" value={days(t.createdAt, t.closedAt)} />
              </View>

              <View style={s.hr} />

              {t.payment.agreed != null ? (
                <>
                  <Line label="Kelishilgan summa" value={fmt(t.payment.agreed, t.payment.currency)} />
                  <Line label="To'langan" value={fmt(t.payment.paid, t.payment.currency)} tone={color.success} />
                </>
              ) : null}
              {totals.map(([cur, sum]) => (
                <Line key={cur} label="Xarajatlar" value={`−${fmt(sum, cur)}`} tone={color.danger} />
              ))}

              {t.payment.agreed != null ? (
                <View style={s.total}>
                  <Text style={s.totalLabel}>Sof natija</Text>
                  <Text style={s.totalValue}>
                    {fmt(
                      t.payment.agreed - (exp.data?.totals?.[t.payment.currency] ?? 0),
                      t.payment.currency,
                    )}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Baholash */}
            {(rate.data?.targets?.length ?? 0) > 0 ? (
              <View style={s.card}>
                <Text style={s.cardTitle}>Hamkorni baholang</Text>
                <Text style={s.cardSub}>Baholaringiz FURAM ishonch reytingini shakllantiradi</Text>
                {rate.data!.targets.map((tg) => (
                  <RateBlock key={tg.userId} tripId={String(id)} target={tg} onDone={rate.reload} />
                ))}
              </View>
            ) : null}

            {/* Tarkib */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Tarkib</Text>
              <Line label="Yuk" value={t.cargo.title ?? "—"} />
              {t.cargo.weightT != null ? <Line label="Og'irlik" value={`${t.cargo.weightT} t`} /> : null}
              <Line label="Hujjatlar" value={`${t.counts.documents} ta`} />
              <Line label="Xarajat yozuvlari" value={`${t.counts.expenses} ta`} />
            </View>

            {/* Ishtirokchilar */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Ishtirokchilar</Text>
              {t.participants.map((p, i) => (
                <View key={i} style={s.person}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{(p.name || "?").slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.personName}>{p.name || "—"}</Text>
                    <Text style={s.meta}>{p.roleLabel}</Text>
                  </View>
                </View>
              ))}
            </View>

            <Notice tone="info">
              To&apos;liq hisobotni PDF yoki Excel qilib yuklab olish saytda mavjud —
              ilovada keyingi bosqichda qo&apos;shiladi.
            </Notice>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

/* ─────────────────────────────────────────────── baholash bloki */

function RateBlock({ tripId, target, onDone }: { tripId: string; target: Target; onDone: () => void }) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      await api("/api/ratings", {
        method: "POST",
        body: { tripId, toUserId: target.userId, stars, comment: comment.trim() || null },
      });
      setSent(true);
      onDone();
    } catch (e) {
      setErr((e as FuramError).message ?? "Baho yuborilmadi");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <View style={s.rated}>
        <Icon name="check" size={17} stroke={color.success} />
        <Text style={s.ratedText}>{target.name} baholandi</Text>
      </View>
    );
  }

  return (
    <View style={s.rate}>
      <View style={s.person}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{(target.name || "?").slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.personName}>{target.name}</Text>
          <Text style={s.meta}>{target.roleLabel ?? target.role}</Text>
        </View>
      </View>

      <View style={s.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setStars(n)} hitSlop={4}>
            <Svg width={36} height={36} viewBox="0 0 24 24">
              <Path
                d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"
                fill={n <= stars ? color.brand : "none"}
                stroke={n <= stars ? color.brand : "#cbd5e1"}
                strokeWidth={1.8}
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
        ))}
      </View>

      {stars > 0 ? (
        <>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder={stars < 3 ? "Nima yoqmadi? (majburiy)" : "Izoh — ixtiyoriy"}
            placeholderTextColor="#94a3b8"
            multiline
            style={s.comment}
          />
          {err ? <Text style={s.err}>{err}</Text> : null}
          <View style={{ marginTop: space.md }}>
            <Button
              title="Baho berish"
              onPress={submit}
              loading={busy}
              disabled={stars < 3 && comment.trim().length < 3}
            />
          </View>
        </>
      ) : null}
    </View>
  );
}

/* ─────────────────────────────────────────────── bo'laklar */

function Big({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.meta}>{label}</Text>
      <Text style={s.bigValue}>
        {value}
        {unit ? <Text style={s.bigUnit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

function Line({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={s.line}>
      <Text style={s.meta}>{label}</Text>
      <Text style={[s.lineValue, tone ? { color: tone } : null]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  header: { backgroundColor: color.navy, flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, gap: 4 },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "700", color: "#f1f5f9" },

  hero: { backgroundColor: color.navy, paddingHorizontal: space.lg, paddingBottom: space.xl, gap: space.md },
  heroChip: {
    alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6,
    height: 24, paddingHorizontal: 10, borderRadius: radius.control, backgroundColor: "#16a34a33",
  },
  heroChipText: { fontSize: 11, fontWeight: "600", color: "#4ade80" },
  heroRoute: { flexDirection: "row", alignItems: "center", gap: 10 },
  heroCity: { flex: 1, fontSize: 20, fontWeight: "700", color: "#fff" },
  heroNo: { fontSize: 12, color: "#94a3b8", fontFamily: "monospace" },

  body: { padding: space.lg, gap: space.md },
  card: {
    backgroundColor: color.card, borderRadius: radius.card, borderWidth: 1,
    borderColor: color.border, padding: space.lg, ...shadow.card,
  },
  cardTitle: { fontSize: font.body, fontWeight: "600", color: color.foreground },
  cardSub: { fontSize: font.caption, color: color.mutedForeground, marginTop: 4, lineHeight: 19 },

  grid2: { flexDirection: "row", gap: space.lg },
  bigValue: { fontSize: 22, fontWeight: "700", color: color.foreground, marginTop: 2 },
  bigUnit: { fontSize: 14, fontWeight: "600", color: color.mutedForeground },
  hr: { height: 1, backgroundColor: color.border, marginVertical: space.lg },

  line: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 10, gap: space.md },
  lineValue: { fontSize: font.body, fontWeight: "600", color: color.foreground, flexShrink: 1, textAlign: "right" },
  total: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: color.border },
  totalLabel: { fontSize: 14, fontWeight: "600", color: color.foreground },
  totalValue: { fontSize: 20, fontWeight: "700", color: color.success },

  meta: { fontSize: 12, color: color.mutedForeground },

  person: { flexDirection: "row", alignItems: "center", gap: 11, marginTop: space.md },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: color.muted, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 14, fontWeight: "600", color: color.mutedForeground },
  personName: { fontSize: 14, fontWeight: "600", color: color.foreground },

  rate: { marginTop: space.lg, paddingTop: space.lg, borderTopWidth: 1, borderTopColor: color.border },
  stars: { flexDirection: "row", justifyContent: "center", gap: 10, marginTop: space.lg },
  comment: {
    minHeight: 68, borderWidth: 1, borderColor: color.border, borderRadius: radius.control,
    padding: 14, marginTop: space.lg, fontSize: font.body, color: color.foreground, textAlignVertical: "top",
  },
  err: { fontSize: 12, color: color.danger, marginTop: 8 },
  rated: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: space.lg, paddingTop: space.lg, borderTopWidth: 1, borderTopColor: color.border },
  ratedText: { fontSize: font.caption, fontWeight: "600", color: color.success },
});
