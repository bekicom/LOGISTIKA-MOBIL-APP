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
import { Image, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
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
import { saqlanganDeb } from "@/lib/saqlangan";
import { xabarcha } from "@/components/Xabarcha";
import { t } from "@/lib/i18n";
import { color, font, radius, space, themed } from "@/lib/theme";

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
      /* ⚠️ SO'ROV QATORIDA (2026-09-21). Ilgari tanada yuborilardi,
         server esa `DELETE` da faqat `?kind=&id=` ni o'qiydi — javob
         doim 400 VALIDATION edi, ya'ni «O'chirish» HECH QACHON
         ishlamagan. */
      await api(`/api/saved?kind=${it.kind}&id=${encodeURIComponent(it.id)}`, { method: "DELETE" });
      /* Lentadagi karta 🔖 ham bo'shasin */
      saqlanganDeb(it.kind, it.id, false);
      xabarcha({ matn: t("mob.saved.removed") });
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
          <Empty icon="bookmark" title={t("mob.saved.empty")} text={t("mob.saved.emptyText")} />
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
                      <Text style={[s.sub, gone && { color: color.faintText }]} numberOfLines={1}>
                        {[it.title, it.weightT != null ? `${it.weightT} t` : null, it.type]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </View>
                    {/* 🔖 — TUGMA (2026-09-21). Ilgari bezak yurak edi: faol e'lonni
                        bu ekrandan olib tashlashning umuman yo'li yo'q edi,
                        «O'chirish» faqat yopilganlarida chiqardi */}
                    <Pressable
                      onPress={() => remove(it)}
                      disabled={busy === it.id}
                      hitSlop={12}
                      accessibilityRole="button"
                      accessibilityLabel={t("mob.saved.unsave")}
                      style={({ pressed }) => [s.yurak, pressed && { opacity: 0.6 }]}
                    >
                      <Icon
                        name="bookmark"
                        size={20}
                        stroke={gone ? color.iconFaint : color.brand}
                        fill={gone ? color.iconFaint : color.brand}
                      />
                    </Pressable>
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

const s = themed(() => ({
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
  cardGone: { backgroundColor: color.surface },
  head: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  yurak: { width: 32, height: 32, alignItems: "center", justifyContent: "center", marginRight: -6, marginTop: -4 },
  shot: { width: 56, height: 56, borderRadius: 10, backgroundColor: color.iconFaint },
  route: { fontSize: font.title, fontWeight: "700", color: color.foreground },
  dimText: { color: color.mutedForeground },
  sub: { fontSize: font.caption, color: color.icon, marginTop: 2 },

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
  remove: { fontSize: font.caption, fontWeight: "600", color: color.brandText },
}));
