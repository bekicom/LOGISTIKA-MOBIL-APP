/**
 * Bosh ekrandagi kichik xarita — 2026-09-13.
 *
 * ── NIMANI KO'RSATADI ───────────────────────────────────────────
 *
 * Bugun eng ko'p yuk ketayotgan yo'nalishlar — chiziq bo'lib.
 * Webda bu bosh sahifada turadi (`components/home/live-map.tsx`)
 * va maqsadi bitta: platforma TIRIK ekanini ko'rsatish. «Bo'sh
 * bozor» taassuroti odamni birinchi ochilishda yo'qotadi.
 *
 * Chiziqlar HAQIQIY e'lonlardan olinadi (`/api/map/routes`) —
 * o'ylab topilgan yo'nalish ko'rsatilsa, odam xaritani ochib
 * boshqa manzara ko'rardi.
 *
 * ── YO'NALISH BO'LMASA CHIZILMAYDI ──────────────────────────────
 *
 * Bo'sh xarita «hech narsa yo'q» degan xabar beradi. Shunday
 * holatda kartochka umuman ko'rinmaydi — ekranda joy ham
 * bo'shamaydi.
 *
 * ── BOSILSA KATTA XARITA ────────────────────────────────────────
 *
 * Kichik xaritada barmoq bilan ishlash qiyin, shuning uchun u
 * BOSHQARILMAYDI: butun kartochka bosiladi va `/xarita` ochiladi.
 * Chiziqlar esa shu qadar ma'lumotni beradi — «qayerdan qayerga
 * yuk bor».
 */
import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { MapCanvas, type CanvasLine, type CanvasPoint } from "@/components/MapCanvas";
import { useApi } from "@/lib/use-api";
import { color, radius, space, themed, themeName } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Place = { name: string; lat: number; lng: number };
type Route = { key: string; from: Place; to: Place; count: number };
type Resp = {
  routes: Route[];
  tile: { url: string; dark: string; credit: string; premium: boolean };
};

export function HomeMap() {
  const router = useRouter();
  const { data } = useApi<Resp>("/api/map/routes");

  const lines = useMemo<CanvasLine[]>(
    () =>
      (data?.routes ?? []).map((r) => ({
        points: [
          [r.from.lat, r.from.lng] as [number, number],
          [r.to.lat, r.to.lng] as [number, number],
        ],
        color: "#f45a18",
      })),
    [data?.routes],
  );

  /* Nuqta ustidagi yozuv — e'lon SONI. Shahar nomi yozilsa
     kichik xaritada ular ustma-ust tushib o'qilmas bo'lib
     qolardi; son esa qisqa va aynan kerakli ma'lumot. */
  const points = useMemo<CanvasPoint[]>(
    () =>
      (data?.routes ?? []).map((r) => ({
        id: r.key,
        lat: r.from.lat,
        lng: r.from.lng,
        badge: String(r.count),
        badgeKind: "load" as const,
        badgeColor: "#f45a18",
      })),
    [data?.routes],
  );

  if (!data || data.routes.length === 0) return null;

  const dark = themeName() === "dark";

  return (
    <Pressable style={s.card} onPress={() => router.push("/xarita")}>
      <View style={s.head}>
        <Text style={s.title}>{t("mob.map.title")}</Text>
        <Text style={s.count}>{t("mob.map.busyRoutes", { n: data.routes.length })}</Text>
        <Icon name="chevron" size={16} stroke={color.icon} />
      </View>

      {/* Xarita BOSHQARILMAYDI: barmoq bosilsa kartochka ochiladi.
          `pointerEvents="none"` shuning uchun. */}
      <View style={s.map} pointerEvents="none">
        <MapCanvas
          tile={dark ? data.tile.dark : data.tile.url}
          credit={data.tile.credit}
          points={points}
          lines={lines}
          fit
        />
      </View>
    </Pressable>
  );
}

const s = themed(() => ({
  card: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: color.border,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: space.md,
    paddingVertical: 11,
  },
  title: { fontSize: 14, fontWeight: "800", color: color.foreground },
  count: { flex: 1, fontSize: 12, color: color.mutedForeground },
  map: { height: 170 },
}));
