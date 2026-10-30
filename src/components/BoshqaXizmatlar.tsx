/**
 * «Boshqa xizmatlar» — «Mening ishim» ostidagi kataklar (TZ v2 §2.1, 2026-10-24).
 *
 * Pastki menyu beshta bo'limga qisqargach («Menyu» yorlig'i yo'q),
 * Bozor, ish topish, usta, zapchast va hisob-kitob vositalari shu
 * yerda turadi; «Hammasi» — to'liq menyu (`/menyu`). Web bilan bir xil
 * ro'yxat va tartib (`furam/src/components/boshqa-xizmatlar.tsx`).
 *
 * Admin o'chirgan modul katagi chizilmaydi (`yashirin`, TZ v2 §8.1).
 * Ro'yxat qo'lda yozilgan va qisqa — `.map()` to'g'ri.
 */
import { View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { Icon, type IconName } from "@/components/Icon";
import { Tap } from "@/components/Tap";
import { GroupLabel } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";
import { webToApp } from "@/lib/routes";

/** Ilova manzili + webdagi manzili (yashirish web yo'li bo'yicha ham ishlaydi) */
export const XIZMATLAR: { href: string; web: string; icon: IconName; k: string }[] = [
  { href: "/bozor", web: "/market", icon: "tag", k: "mob.market.title" },
  { href: "/ish", web: "/jobs", icon: "briefcase", k: "mob.job.title" },
  { href: "/ustaxona", web: "/service", icon: "wrench", k: "mob.svc.title" },
  { href: "/zapchast", web: "/parts", icon: "package", k: "mob.part.title" },
  { href: "/dispetcherlar", web: "/dispatchers", icon: "headset", k: "mob.disp.title" },
  { href: "/xarita", web: "/map", icon: "map-pin", k: "mob.map.title" },
  { href: "/kalkulyator", web: "/calc", icon: "calc", k: "mob.calc.title" },
];

const COLS = 4;
const GAP = 8;

/** Server bo'lim kaliti (`svc.*`) → ilova belgisi */
const BELGI: Record<string, IconName> = {
  trips: "route",
  documents: "doc",
  queues: "border",
  map: "map-pin",
  jobs: "briefcase",
  money: "wallet",
  finance: "wallet",
  reports: "chart",
  analytics: "chart",
  calc: "calc",
  currency: "globe",
  search: "search",
  dispatchers: "headset",
  drivers: "users",
  park: "truck",
  "my-trucks": "truck",
  "my-loads": "package",
  contracts: "handshake",
  trust: "star",
  parts: "wrench",
  repair: "wrench",
  passenger: "users",
  video: "play",
  chats: "chat",
  roles: "tag",
  profile: "user",
  market: "tag",
};

/**
 * `items` — serverdagi ro'yxat (`/api/home` → `boshqa`, TZ 29-okt §1.4): web
 * bilan BITTA ro'yxat, rolga mos, katta tugma va ish stoli bilan takrorlanmaydi.
 * Eski server bermasa — qo'lda yozilgan `XIZMATLAR`.
 */
export function BoshqaXizmatlar({ items }: { items?: { key: string; href: string | null }[] | null }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { yashirin } = useAuth();
  /* Pastga yaxlitlanadi — `menyu.tsx` dagi sabab (kasr en qatorni buzadi) */
  const w = Math.floor((width - space.lg * 2 - GAP * (COLS - 1)) / COLS);
  const serverdan = items?.length
    ? items.flatMap((x) => {
        const to = x.href ? webToApp(x.href) : null;
        return to && !yashirin(to) ? [{ href: to, web: x.href ?? "", icon: BELGI[x.key] ?? ("grid" as IconName), k: `svc.${x.key}` }] : [];
      })
    : null;
  const royxat = [
    ...(serverdan ?? XIZMATLAR.filter((x) => !yashirin(x.href) && !yashirin(x.web))),
    { href: "/menyu", web: "", icon: "grid" as IconName, k: "nav5.all" },
  ];

  return (
    <View>
      <GroupLabel>{t("nav5.otherServices")}</GroupLabel>
      <View style={s.grid}>
        {royxat.map((x) => (
          <Tap
            key={x.href}
            onPress={() => router.push(x.href as Parameters<typeof router.push>[0])}
            scale={0.96}
            feel="select"
            style={[s.tile, { width: w }]}
          >
            <View style={s.iconBox}>
              <Icon name={x.icon} size={22} stroke={color.brand} />
            </View>
            <Text style={s.title} numberOfLines={2}>
              {t(x.k)}
            </Text>
          </Tap>
        ))}
      </View>
    </View>
  );
}

const s = themed(() => ({
  grid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: GAP },
  tile: {
    alignItems: "center" as const,
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.card,
    backgroundColor: color.card,
    ...shadow.card,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: color.brandSoft,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  title: { fontSize: 11, fontFamily: "Manrope_600SemiBold", color: color.foreground, textAlign: "center" as const },
}));
