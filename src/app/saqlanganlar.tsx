/**
 * O3 — saqlanganlar.
 *
 * SAQLANGAN E'LON O'LIK HAVOLA BO'LIB QOLMAYDI. Saqlab qo'ygan yukni
 * boshqa odam olib ketishi yoki muddati tugashi mumkin. Ro'yxatdan
 * yashirsak, odam «qani mening yukim» deb qidiradi; oddiy qatordek
 * ko'rsatsak, bosib «topilmadi» ekraniga tushadi.
 *
 * Shuning uchun qator qoladi, holati ochiq yoziladi va «o'chirish»
 * taklif qilinadi. Holatni server hisoblaydi (`state`).
 */
import { useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { Segment } from "@/components/Segment";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { money } from "@/components/cards";
import { api, FuramError } from "@/lib/api";
import { vehiclePhoto } from "@/lib/img";
import { useApi } from "@/lib/use-api";
import { t } from "@/lib/i18n";
import { color, font, radius, space } from "@/lib/theme";

type Item = {
  id: string;
  kind: "load" | "truck";
  title?: string | null;
  weightT: number | null;
  volumeM3?: number | null;
  type: string;
  from: string;
  to: string;
  price: number | null;
  currency: string;
  isNegotiable: boolean;
  state: "active" | "taken" | "closed" | "expired";
  photo?: string | null;
  vehicleId?: string | null;
  savedAt: string;
};

type Feed = { loads: Item[]; trucks: Item[] };

export default function Saqlanganlar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tab, setTab] = useState<"loads" | "trucks">("loads");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const { data, loading, error, refreshing, refresh, reload } = useApi<Feed>("/api/saved/list");
  const items = (tab === "loads" ? data?.loads : data?.trucks) ?? [];

  async function remove(it: Item) {
    setBusy(it.id);
    setErr(null);
    try {
      await api("/api/saved", { method: "DELETE", body: { kind: it.kind, id: it.id } });
      reload();
    } catch (e) {
      setErr((e as FuramError).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={s.root}>
      <Header title={t("mob.saved.title")} />

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
          <Empty icon="heart" title={t("mob.saved.empty")} text={t("mob.saved.emptyText")} />
        ) : (
          <>
            {err ? <ErrorBox message={err} /> : null}
            {items.map((it) => {
              const gone = it.state !== "active";
              return (
                <Pressable
                  key={it.id}
                  style={[s.card, gone && s.cardGone]}
                  disabled={gone}
                  onPress={() =>
                    router.push((it.kind === "load" ? `/yuk/${it.id}` : `/mashina/${it.id}`) as never)
                  }
                  accessibilityRole="button"
                >
                  <View style={s.head}>
                    {it.photo && it.vehicleId ? (
                      <Image source={vehiclePhoto(it.vehicleId, it.photo)} style={s.shot} resizeMode="cover" />
                    ) : null}
                    <View style={{ flex: 1 }}>
                      <Text style={[s.route, gone && s.dimText]}>
                        {it.from} → {it.to}
                      </Text>
                      <Text style={[s.sub, gone && { color: "#94a3b8" }]} numberOfLines={1}>
                        {[it.title, it.weightT != null ? `${it.weightT} t` : null, it.type]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </View>
                    <Icon name="heart" size={20} stroke={gone ? "#cbd5e1" : color.brand} fill={gone ? "#cbd5e1" : color.brand} />
                  </View>

                  {gone ? (
                    /* O'lik havola emas — holat ochiq aytiladi */
                    <View style={s.goneRow}>
                      <Icon
                        name={it.state === "expired" ? "clock" : "close"}
                        size={15}
                        stroke="#94a3b8"
                      />
                      <Text style={s.goneText}>{t(`mob.saved.st_${it.state}`)}</Text>
                      <Pressable
                        disabled={busy === it.id}
                        onPress={() => remove(it)}
                        hitSlop={8}
                        accessibilityRole="button"
                      >
                        <Text style={s.remove}>{t("mob.saved.remove")}</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={s.foot}>
                      <Text style={s.price}>
                        {money(it.price, it.currency, it.isNegotiable) ?? t("mob.loads.negotiable")}
                      </Text>
                      <Text style={s.meta}>
                        {t("mob.saved.savedOn", { d: it.savedAt.slice(0, 10) })}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

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
  cardGone: { backgroundColor: "#f8fafc" },
  head: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  shot: { width: 56, height: 56, borderRadius: 10, backgroundColor: "#cbd5e1" },
  route: { fontSize: font.title, fontWeight: "700", color: color.foreground },
  dimText: { color: color.mutedForeground },
  sub: { fontSize: font.caption, color: "#475569", marginTop: 2 },

  foot: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 12,
  },
  price: { fontSize: font.title, fontWeight: "700", color: color.foreground, letterSpacing: -0.3 },
  meta: { fontSize: 12, color: color.mutedForeground },

  goneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  goneText: { flex: 1, fontSize: font.caption, color: color.mutedForeground },
  remove: { fontSize: font.caption, fontWeight: "600", color: color.brand },
});
