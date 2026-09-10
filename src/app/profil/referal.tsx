/**
 * Do'stlarni taklif qilish va balans (TZ 19, 29-31-band).
 *
 * Balans alohida maydonda saqlanmaydi — harakatlar yig'indisi,
 * shuning uchun tepadagi raqam va pastdagi ro'yxat doim mos keladi.
 *
 * ⚠️ BALANSNI TO'LDIRISH TUGMASI YO'Q. Web'da bor (Click), lekin
 * ilova ichida raqamli xizmat uchun to'lov App Store 3.1.1 ga
 * tegadi. To'lov qarori alohida (16-bo'lim) — u kelguncha ekran
 * faqat HOLATNI ko'rsatadi.
 */
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Share, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { Header } from "@/components/ui";
import { ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { currentLocale, t } from "@/lib/i18n";

type Tx = { id: string; kind: string; amount: number; note: string | null; createdAt: string; fromFuramId: number | null };
type Ref = {
  furamId: number; code: string; link: string;
  invited: number; purchased: number; balance: number; cashbackPct: number; txs: Tx[];
};

function day(iso: string) {
  return new Date(iso).toLocaleDateString(currentLocale(), { day: "numeric", month: "short" });
}

export default function Referal() {
  const insets = useSafeAreaInsets();
  const { data, loading, error, refreshing, refresh, reload } = useApi<Ref>("/api/profile/referral");
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!data) return;
    await Clipboard.setStringAsync(data.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function share() {
    if (!data) return;
    try {
      await Share.share({ message: `${t("mob.ref.lead")}\n${data.link}` });
    } catch {
      await copy();
    }
  }

  return (
    <View style={s.root}>
      <Header title={t("mob.ref.title")} />
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
        showsVerticalScrollIndicator={false}
      >
        {loading && !data ? <Skeleton rows={2} /> : null}
        {error && !data ? <ErrorBox message={error} onRetry={reload} /> : null}

        {data ? (
          <>
            {/* Balans */}
            <View style={s.hero}>
              <Text style={s.heroLabel}>{t("mob.ref.balance")}</Text>
              <Text style={s.heroValue}>{fmtNum(data.balance)} UZS</Text>
              <Text style={s.heroHint}>{t("mob.ref.cashbackHint", { pct: data.cashbackPct })}</Text>
              <View style={s.stats}>
                <Stat label={t("mob.ref.invited")} value={data.invited} />
                <View style={s.vline} />
                <Stat label={t("mob.ref.purchased")} value={data.purchased} />
              </View>
            </View>

            {/* Kod va havola */}
            <View style={s.card}>
              <Text style={s.label}>{t("mob.ref.yourCode")}</Text>
              <Text style={s.code}>{data.code}</Text>
              <Pressable onPress={copy} style={({ pressed }) => [s.linkRow, pressed && { opacity: 0.8 }]}>
                <Text style={s.link} numberOfLines={1}>{data.link}</Text>
                <Icon name={copied ? "check" : "copy"} size={17} stroke={copied ? color.success : color.mutedForeground} />
              </Pressable>
              {copied ? <Text style={s.copied}>{t("mob.ref.copied")}</Text> : null}
              <Pressable onPress={share} style={({ pressed }) => [s.shareBtn, pressed && { opacity: 0.85 }]}>
                <Icon name="send" size={18} stroke="#fff" />
                <Text style={s.shareText}>{t("mob.ref.share")}</Text>
              </Pressable>
            </View>

            {/* Balans harakati */}
            <View style={s.card}>
              <Text style={s.cardTitle}>{t("mob.ref.history")}</Text>
              {data.txs.length === 0 ? (
                <Text style={s.meta}>{t("mob.ref.noTx")}</Text>
              ) : (
                data.txs.map((x, i) => (
                  <View key={x.id} style={[s.tx, i > 0 && s.txLine]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.txKind}>{t(`mob.balance.kind.${x.kind}`)}</Text>
                      <Text style={s.meta}>
                        {day(x.createdAt)}
                        {x.fromFuramId ? ` · ${t("mob.ref.from", { id: x.fromFuramId })}` : ""}
                      </Text>
                    </View>
                    <Text style={[s.txAmount, { color: x.amount > 0 ? color.success : color.danger }]}>
                      {x.amount > 0 ? "+" : "−"}{fmtNum(Math.abs(x.amount))}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },

  hero: { backgroundColor: color.navy, borderRadius: radius.card, padding: space.xl },
  heroLabel: { fontSize: 12, color: "#94a3b8", letterSpacing: 0.3 },
  heroValue: { fontSize: 30, fontWeight: "800", color: "#ffffff", marginTop: 4, letterSpacing: -0.6 },
  heroHint: { fontSize: 12.5, color: color.iconFaint, marginTop: 8, lineHeight: 18 },
  stats: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#ffffff1f" },
  vline: { width: 1, height: 28, backgroundColor: "#ffffff1f" },
  statValue: { fontSize: 20, fontWeight: "800", color: "#ffffff" },
  statLabel: { fontSize: 11.5, color: "#94a3b8", marginTop: 1 },

  card: { backgroundColor: color.card, borderRadius: radius.card, padding: space.lg, ...shadow.card },
  cardTitle: { fontSize: 15, fontWeight: "800", color: color.foreground, marginBottom: 8 },
  label: { fontSize: 12, color: color.mutedForeground, letterSpacing: 0.3 },
  code: { fontSize: 26, fontWeight: "800", color: color.brand, letterSpacing: 1, marginTop: 2 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, padding: 12, borderRadius: radius.control, backgroundColor: color.background },
  link: { flex: 1, fontSize: 13, fontWeight: "600", color: color.blue },
  copied: { fontSize: 12, fontWeight: "700", color: color.success, marginTop: 6 },
  shareBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    height: 50, borderRadius: radius.control, backgroundColor: color.brand, marginTop: 12,
  },
  shareText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  tx: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  txLine: { borderTopWidth: 1, borderTopColor: color.border },
  txKind: { fontSize: 14, fontWeight: "600", color: color.foreground },
  txAmount: { fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"] },
  meta: { fontSize: 12, color: color.mutedForeground, marginTop: 2 },
}));
