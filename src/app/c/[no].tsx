/**
 * Shartnoma raqamini tekshirish — `furam.uz/c/FURAM-2026-000158`.
 *
 * ── NEGA ILOVADA HAM BOR ────────────────────────────────────────
 *
 * Havola chegarada yoki bankda ochiladi. Telefonda FURAM
 * o'rnatilgan bo'lsa, brauzer emas, ilova ochilgani yaxshi: odam
 * allaqachon shu yerda va sahifa qayta yuklanmaydi.
 *
 * ── KIRISH TALAB QILINMAYDI ─────────────────────────────────────
 *
 * Nazoratchi FURAM'da yo'q va bo'lishi ham shart emas. Shuning
 * uchun javobda faqat «bunday shartnoma bor va holati shu» degan
 * gap bo'ladi — na narx, na tomonlar.
 */
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { useLocalSearchParams } from "expo-router";
import { Icon } from "@/components/Icon";
import { Header } from "@/components/ui";
import { ErrorBox, Skeleton } from "@/components/state";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Check =
  | { ok: false }
  | {
      ok: true;
      number: string;
      status: string;
      approvedAt: string | null;
      createdAt: string;
      tripNo: number | null;
    };

export default function ShartnomaTekshir() {
  const { no } = useLocalSearchParams<{ no: string }>();
  const insets = useSafeAreaInsets();
  const { data, loading, error, reload } = useApi<Check>(
    no ? `/api/contracts/check?no=${encodeURIComponent(String(no))}` : null,
    [no],
  );

  return (
    <View style={s.root}>
      <Header title={t("mob.check.title")} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {loading && !data ? <Skeleton rows={2} /> : null}
        {error && !data ? <ErrorBox message={error} onRetry={reload} /> : null}

        {data?.ok ? (
          <View style={s.card}>
            <View style={[s.badge, { backgroundColor: color.successSoft }]}>
              <Icon name="check" size={28} stroke={color.success} />
            </View>
            <Text style={s.title}>{t("mob.check.found")}</Text>
            <Text style={s.number}>{data.number}</Text>

            <View style={s.rows}>
              <Row k={t("mob.check.status")} v={t(`contractStatus.${data.status}`)} />
              <Row k={t("mob.check.created")} v={data.createdAt.slice(0, 10)} />
              {data.approvedAt ? (
                <Row k={t("mob.check.approved")} v={data.approvedAt.slice(0, 10)} />
              ) : null}
              {data.tripNo != null ? (
                <Row k={t("mob.nav.trips")} v={`FURAM #${data.tripNo}`} />
              ) : null}
            </View>

            <Text style={s.note}>{t("mob.check.note")}</Text>
          </View>
        ) : null}

        {data && !data.ok ? (
          <View style={s.card}>
            <View style={[s.badge, { backgroundColor: color.dangerSoft }]}>
              <Icon name="close" size={28} stroke={color.danger} />
            </View>
            <Text style={s.title}>{t("mob.check.none")}</Text>
            <Text style={s.note}>{t("mob.check.noneHint")}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <Text style={s.rowK}>{k}</Text>
      <Text style={s.rowV}>{v}</Text>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg },

  card: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.xl,
    alignItems: "center",
    ...shadow.card,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 17, fontWeight: "800", color: color.foreground, marginTop: 14 },
  number: {
    fontSize: 20,
    fontWeight: "800",
    color: color.brand,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  rows: { alignSelf: "stretch", gap: 8, marginTop: space.lg },
  rowK: { fontSize: 13, color: color.mutedForeground },
  rowV: { fontSize: 13, fontWeight: "700", color: color.foreground },
  note: {
    fontSize: 12,
    color: color.mutedForeground,
    marginTop: space.lg,
    textAlign: "center",
    lineHeight: 18,
  },
}));
