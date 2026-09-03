/**
 * O2 — mening e'lonlarim.
 *
 * ASOSIY RAQAM — KO'RISHLAR. Odam e'lon berib qo'yib, «nega hech kim
 * qo'ng'iroq qilmaydi» deb o'ylaydi. Javob shu raqamda: 148 ko'rilgan
 * va 9 tasi raqam ochgan bo'lsa — e'lon yaxshi, narx muhokamaga
 * muhtoj. 6 ko'rilgan bo'lsa — e'lon umuman ko'rinmayapti.
 *
 * KAM KO'RILGAN E'LONGA SABAB YOZILADI. Raqamning o'zi hech nima
 * demaydi; yonida nima qilish mumkinligi turadi. Aks holda odam
 * raqamni ko'radi-yu, qo'lidan hech narsa kelmaydi.
 */
import { useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { Segment } from "@/components/Segment";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { ago } from "@/components/cards";
import { api, FuramError } from "@/lib/api";
import { vehiclePhoto } from "@/lib/img";
import { useApi } from "@/lib/use-api";
import { t } from "@/lib/i18n";
import { color, font, radius, space } from "@/lib/theme";

type Item = {
  id: string;
  kind: "load" | "truck";
  title: string | null;
  weightT: number | null;
  volumeM3?: number | null;
  type: string;
  from: string;
  to: string;
  price: number | null;
  currency: string;
  isNegotiable: boolean;
  status: string;
  isTop: boolean;
  views: number;
  contacts: number;
  offers: number;
  quiet: boolean;
  daysLeft: number | null;
  tripNo?: number | null;
  photo?: string | null;
  vehicleId?: string | null;
  createdAt: string;
};

type Feed = { loads: Item[]; trucks: Item[] };

export default function Elonlarim() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tab, setTab] = useState<"loads" | "trucks">("loads");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const { data, loading, error, refreshing, refresh, reload } = useApi<Feed>("/api/my-listings");

  const items = (tab === "loads" ? data?.loads : data?.trucks) ?? [];

  async function close(it: Item) {
    setBusy(it.id);
    setErr(null);
    try {
      await api(`/api/${it.kind === "load" ? "loads" : "trucks"}/${it.id}`, {
        method: "PATCH",
        body: { action: "close" },
      });
      reload();
    } catch (e) {
      setErr((e as FuramError).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={s.root}>
      <Header title={t("mob.mine.title")} />

      <View style={s.tabs}>
        <Segment
          value={tab}
          onChange={(v) => setTab(v as "loads" | "trucks")}
          options={[
            { key: "loads", label: `${t("mob.loads.title")} · ${data?.loads.length ?? 0}` },
            { key: "trucks", label: `${t("mob.trucks.title")} · ${data?.trucks.length ?? 0}` },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
        }
      >
        {loading && !data ? (
          <Skeleton rows={3} />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : !items.length ? (
          <Empty
            icon={tab === "loads" ? "package" : "truck"}
            title={t("mob.mine.empty")}
            text={t("mob.mine.emptyText")}
          />
        ) : (
          <>
            {err ? <ErrorBox message={err} /> : null}
            {items.map((it) => (
              <View key={it.id} style={[s.card, it.quiet && s.cardQuiet, it.status !== "ACTIVE" && s.cardDim]}>
                <View style={s.top}>
                  <View style={[s.badge, statusBg(it)]}>
                    <Text style={[s.badgeText, { color: statusFg(it) }]}>{statusLabel(it)}</Text>
                  </View>
                  <Text style={s.meta}>
                    {ago(it.createdAt)}
                    {it.status === "ACTIVE" && it.daysLeft != null
                      ? ` · ${t("mob.mine.daysLeft", { n: Math.max(0, it.daysLeft) })}`
                      : ""}
                  </Text>
                </View>

                <View style={s.head}>
                  {it.photo && it.vehicleId ? (
                    <Image source={vehiclePhoto(it.vehicleId, it.photo)} style={s.shot} resizeMode="cover" />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={s.route}>
                      {it.from} → {it.to}
                    </Text>
                    <Text style={s.sub} numberOfLines={1}>
                      {[it.title, it.weightT != null ? `${it.weightT} t` : null, it.type]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                </View>

                {/* Reysga aylangan bo'lsa — «yopilgan» emas, BAJARILGAN */}
                {it.tripNo ? (
                  <Text style={s.trip}>{t("mob.mine.becameTrip", { n: it.tripNo })}</Text>
                ) : (
                  <>
                    <View style={s.figs}>
                      <Fig n={it.views} label={t("mob.mine.views")} dim={it.quiet} />
                      <Fig n={it.contacts} label={t("mob.mine.contacts")} dim={it.quiet} />
                      {it.offers > 0 ? (
                        <Fig n={it.offers} label={t("mob.mine.offers")} hot />
                      ) : null}
                    </View>

                    {/* Raqamning o'zi hech nima demaydi — sabab va yechim */}
                    {it.quiet ? (
                      <View style={s.tip}>
                        <Icon name="alert" size={16} stroke={color.warning} />
                        <Text style={s.tipText}>{t("mob.mine.quietHint")}</Text>
                      </View>
                    ) : null}

                    {it.status === "ACTIVE" ? (
                      <View style={s.btns}>
                        <Pressable
                          style={s.btn}
                          onPress={() =>
                            router.push(
                              (it.kind === "load" ? `/yuk/${it.id}` : `/mashina/${it.id}`) as never,
                            )
                          }
                          accessibilityRole="button"
                        >
                          <Text style={s.btnText}>{t("mob.mine.open")}</Text>
                        </Pressable>
                        <Pressable
                          style={[s.btn, busy === it.id && s.btnOff]}
                          disabled={busy === it.id}
                          onPress={() => close(it)}
                          accessibilityRole="button"
                        >
                          <Text style={s.btnText}>{t("mob.mine.close")}</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Fig({ n, label, dim, hot }: { n: number; label: string; dim?: boolean; hot?: boolean }) {
  return (
    <View>
      <Text style={[s.figN, dim && { color: "#94a3b8" }, hot && { color: color.brand }]}>{n}</Text>
      <Text style={s.figL}>{label}</Text>
    </View>
  );
}

const statusLabel = (it: Item) =>
  it.tripNo ? t("mob.mine.done") : it.status === "ACTIVE" ? t("mob.mine.active") : t("mob.mine.closed");
const statusFg = (it: Item) =>
  it.tripNo || it.status === "ACTIVE" ? "#15803d" : "#64748b";
const statusBg = (it: Item) => ({
  backgroundColor: it.tripNo || it.status === "ACTIVE" ? color.success + "1f" : color.muted,
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  tabs: {
    backgroundColor: color.card,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  scroll: { padding: space.lg, gap: space.md },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: 15,
  },
  cardQuiet: { borderColor: color.warning + "66" },
  cardDim: { opacity: 0.72 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: { height: 22, paddingHorizontal: 8, borderRadius: 6, justifyContent: "center" },
  badgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  meta: { fontSize: 12, color: color.mutedForeground },

  head: { flexDirection: "row", gap: 12, marginTop: 10 },
  shot: { width: 56, height: 56, borderRadius: 10, backgroundColor: "#cbd5e1" },
  route: { fontSize: font.title, fontWeight: "700", color: color.foreground },
  sub: { fontSize: font.caption, color: "#475569", marginTop: 2 },
  trip: { fontSize: font.caption, fontWeight: "600", color: color.success, marginTop: 10 },

  figs: {
    flexDirection: "row",
    gap: 22,
    marginTop: 13,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  figN: { fontSize: 22, fontWeight: "700", color: color.foreground, letterSpacing: -0.4 },
  figL: { fontSize: 12, color: color.mutedForeground },

  tip: {
    flexDirection: "row",
    gap: 9,
    backgroundColor: color.warning + "0f",
    borderRadius: 10,
    padding: 11,
    marginTop: 12,
  },
  tipText: { flex: 1, fontSize: 12, color: "#92400e", lineHeight: 19 },

  btns: { flexDirection: "row", gap: 9, marginTop: 13 },
  btn: {
    flex: 1,
    height: 40,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  btnOff: { opacity: 0.5 },
  btnText: { fontSize: font.caption, fontWeight: "600", color: "#475569" },
});
