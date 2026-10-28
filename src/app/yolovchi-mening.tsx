/**
 * Yo'lovchi: mening bronlarim va so'rovlarim (TZ 28-okt 49, 52).
 * Webdagi `/rides/[id]` (ulashish, baho) va `/rides/yolovchilar?mening=1`
 * bilan bir xil so'rovlar.
 *
 *  · «Yaqinlarimga ulashish» — kirishsiz kuzatuv havolasi
 *  · safardan keyin baho — bron bo'yicha bir marta
 *  · so'rovimga kelgan takliflar — haydovchiga qo'ng'iroq
 */
import { useState } from "react";
import { FlatList, Linking, Pressable, RefreshControl, Share, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { Segment } from "@/components/Segment";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { api, API_BASE, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Bron = {
  id: string;
  seats: number;
  status: string;
  code: string;
  rideId: string;
  departAt: string;
  from: string;
  to: string;
  stars: number | null;
  bahoMumkin: boolean;
  ulashMumkin: boolean;
};
type Sorov = {
  id: string;
  kind: string;
  from: string;
  to: string;
  status: string;
  offers: { id: string; name: string; phone: string | null }[];
};

export default function YolovchiMening() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tab, setTab] = useState<"bron" | "sorov">("bron");
  const bronlar = useApi<{ items: Bron[] }>(tab === "bron" ? "/api/rides/yolovchilar?bronlar=1" : null, [tab]);
  const sorovlar = useApi<{ items: Sorov[] }>(tab === "sorov" ? "/api/rides/yolovchilar?mening=1" : null, [tab]);
  const faol = tab === "bron" ? bronlar : sorovlar;
  const [yulduz, setYulduz] = useState<Record<string, number>>({});
  const [xato, setXato] = useState<string | null>(null);

  async function ulash(id: string) {
    setXato(null);
    try {
      const r = await api<{ url: string }>("/api/rides/yolovchilar", { method: "POST", body: { action: "ulash", bookingId: id } });
      await Share.share({ message: `${t("yolovchi.ulashMatn")}: ${API_BASE}${r.url}` });
    } catch (e) {
      if (e instanceof FuramError) setXato(e.message);
    }
  }

  async function baho(id: string) {
    setXato(null);
    try {
      await api("/api/rides/yolovchilar", { method: "POST", body: { action: "baho", bookingId: id, stars: yulduz[id] } });
      bronlar.reload();
    } catch (e) {
      setXato(e instanceof FuramError ? e.message : String(e));
    }
  }

  const bronKarta = (b: Bron) => (
    <View style={s.card}>
      <Pressable onPress={() => router.push(`/yolovchi` as never)}>
        <Text style={s.yol}>
          {b.from} → {b.to}
        </Text>
      </Pressable>
      <Text style={s.meta}>
        {new Date(b.departAt).toLocaleString()} · {t(`yolovchi.kuzatHolat_${b.status}`)} · #{b.code}
      </Text>
      {b.ulashMumkin ? (
        <Pressable onPress={() => void ulash(b.id)} style={s.btn} accessibilityRole="button">
          <Text style={s.btnText}>📍 {t("yolovchi.yaqinlargaUlash")}</Text>
        </Pressable>
      ) : null}
      {b.stars ? <Text style={s.meta}>{"★".repeat(b.stars)}</Text> : null}
      {b.bahoMumkin ? (
        <View style={{ gap: 6 }}>
          <Text style={s.bosh}>{t("yolovchi.bahoSavol")}</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => setYulduz((v) => ({ ...v, [b.id]: n }))}
                accessibilityRole="radio"
                accessibilityState={{ selected: yulduz[b.id] === n }}
                hitSlop={6}
              >
                <Text style={{ fontSize: 28, color: n <= (yulduz[b.id] ?? 0) ? "#f59e0b" : color.mutedForeground }}>★</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={() => void baho(b.id)}
            disabled={!yulduz[b.id]}
            style={[s.btn, !yulduz[b.id] && { opacity: 0.5 }]}
            accessibilityRole="button"
          >
            <Text style={s.btnText}>{t("yolovchi.bahoYubor")}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  const sorovKarta = (q: Sorov) => (
    <View style={s.card}>
      <Text style={s.yol}>
        {q.from} → {q.to}
      </Text>
      <Text style={s.meta}>
        {t(`yolovchi.holat_${q.status}`)} · {t("yolovchi.takliflarSoni", { n: q.offers.length })}
      </Text>
      {q.offers.map((o) => (
        <Pressable
          key={o.id}
          onPress={() => (o.phone ? void Linking.openURL(`tel:${o.phone}`) : undefined)}
          style={s.taklif}
          accessibilityRole="button"
        >
          <Text style={s.taklifText}>
            {o.name}
            {o.phone ? `  📞 ${o.phone}` : ""}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.head}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/yolovchi" as never))} hitSlop={8} style={s.back} accessibilityRole="button">
          <Icon name="back" size={22} stroke={color.foreground} />
        </Pressable>
        <Text style={s.title} numberOfLines={1}>
          {t("yolovchi.meningSorovlarim")}
        </Text>
      </View>
      <View style={{ paddingHorizontal: space.lg }}>
        <Segment
          value={tab}
          onChange={(k) => setTab(k as "bron" | "sorov")}
          options={[
            { key: "bron", label: t("yolovchiUi.bron") },
            { key: "sorov", label: t("yolovchi.tabYolovchilar") },
          ]}
        />
      </View>
      {xato ? <Text style={{ color: color.danger, paddingHorizontal: space.lg, marginTop: 8 }}>{xato}</Text> : null}
      <FlatList
        data={(tab === "bron" ? bronlar.data?.items : sorovlar.data?.items) as (Bron | Sorov)[] | undefined}
        keyExtractor={(x) => x.id}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + space.xl }]}
        refreshControl={<RefreshControl refreshing={faol.refreshing} onRefresh={faol.refresh} tintColor={color.brand} />}
        renderItem={({ item }) => (tab === "bron" ? bronKarta(item as Bron) : sorovKarta(item as Sorov))}
        ListEmptyComponent={
          faol.loading ? <Skeleton rows={3} /> : faol.error ? <ErrorBox message={faol.error} onRetry={faol.reload} /> : <Empty icon="users" title={t("yolovchi.bosh")} />
        }
      />
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  head: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: space.lg, paddingTop: 4, paddingBottom: space.sm },
  back: { width: 40, height: 40, marginLeft: -10, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", color: color.foreground, flexShrink: 1 },
  list: { padding: space.lg, gap: space.md },
  card: { padding: 14, gap: 6, borderRadius: radius.card, backgroundColor: color.card, ...shadow.card },
  yol: { fontSize: 16, fontWeight: "800", color: color.foreground },
  meta: { fontSize: 13, color: color.mutedForeground },
  bosh: { fontSize: 14, fontWeight: "700", color: color.foreground },
  btn: { alignSelf: "flex-start", height: 36, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: color.brand, justifyContent: "center" },
  btnText: { fontSize: 13.5, fontWeight: "700", color: color.brandText },
  taklif: { padding: 10, borderRadius: radius.control, backgroundColor: color.muted },
  taklifText: { fontSize: 14, fontWeight: "600", color: color.foreground },
}));
