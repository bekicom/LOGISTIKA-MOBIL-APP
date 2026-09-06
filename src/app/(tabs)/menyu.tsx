/**
 * Menyu — ilovaning HAMMA bo'limi bir joyda.
 *
 * ── NEGA PROFIL ICHIDAN CHIQDI ──────────────────────────────────
 *
 * Ilgari 27 ta bo'lim profil yorlig'ining ichida, bitta uzun
 * ro'yxat edi — websaytning menyusi telefonga ko'chirilgan. Bekzod:
 * «pastda menyu bo'lsin, bosganda hamma imkoniyat shu ichida».
 * Namuna — Payme/Click/Kornet uslubidagi guruhlangan panjara:
 * beshta guruh, har birida o'z rangi, ikonka + qisqa nom.
 *
 * ── UCH HOLAT ───────────────────────────────────────────────────
 *
 * 1. Mehmon: ochiq bo'limlar oddiy, qolgani qulf bilan — odam nima
 *    olishini ko'rib turishi kerak (`GuestPanel` mantiqi).
 * 2. Kirgan, lekin tarif yo'q: qulf, bosilganda tarif taklifi
 *    (`tariffBlocked` — qoida 5, to'siq oldindan aytiladi).
 * 3. Ochiq: to'g'ridan-to'g'ri ekranga.
 *
 * Ro'yxat qo'lda yozilgan, serverdan kelmaydi — shuning uchun
 * `ScrollView` da `.map()` bo'lishi to'g'ri (`test-lists`).
 */
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon, type IconName } from "@/components/Icon";
import { TabHeader } from "@/components/TabHeader";
import { GroupLabel } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { isGuest } from "@/lib/guest";
import { guestBlocked } from "@/lib/guest-gate";
import { can, tariffBlocked, type FeatureKey } from "@/lib/features";
import { color, radius, shadow, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Item = {
  icon: IconName;
  title: string;
  href: string;
  /** Tarif ortidagi bo'lim — `accessOf()` bermasa qulf */
  feature?: FeatureKey;
  /** Mehmonga ham ochiq (server ham shularni beradi) */
  open?: boolean;
};

type Group = { key: string; title: string; tint: string; bg: string; items: Item[] };

function groups(): Group[] {
  return [
    {
      key: "work",
      title: t("mob.menu.work"),
      tint: color.brand,
      bg: color.brandSoft,
      items: [
        { icon: "route", title: t("mob.nav.trips"), href: "/reyslar", feature: "trips" },
        { icon: "package", title: t("mob.profile.myListings"), href: "/elonlarim" },
        { icon: "truck", title: t("mob.park.title"), href: "/parkim", feature: "fleet" },
        { icon: "users", title: t("pgStaff.title"), href: "/xodimlarim", feature: "drivers" },
        { icon: "handshake", title: t("mob.deals.title"), href: "/kelishuvlar", feature: "contracts" },
        { icon: "doc", title: t("mob.ctr.title"), href: "/shartnoma", feature: "contracts" },
        { icon: "border", title: t("mob.queue.title"), href: "/navbat", feature: "queues" },
        { icon: "doc", title: t("mob.profile.myDocs"), href: "/hujjatlarim", feature: "documents" },
        { icon: "user", title: t("mob.panel.title"), href: "/panelim" },
        /* Tashqarida topilgan yuk: reysni darhol jonli qiladi, ya'ni
           «Reys va yuk nazorati» tarifi ostida */
        { icon: "package", title: t("mob.extLoad.title"), href: "/tashqi-yuk", feature: "trips" },
        { icon: "calc", title: t("mob.calc.title"), href: "/kalkulyator", open: true },
      ],
    },
    {
      key: "market",
      title: t("mob.menu.market"),
      tint: color.blue,
      bg: color.blueSoft,
      items: [
        { icon: "truck", title: t("mob.trucks.title"), href: "/mashinalar", open: true },
        { icon: "tag", title: t("mob.market.title"), href: "/bozor", open: true },
        { icon: "check", title: t("mob.sale.mine"), href: "/sotuvlarim", feature: "auto_sale" },
        { icon: "package", title: t("mob.part.title"), href: "/zapchast", open: true },
        { icon: "briefcase", title: t("mob.job.title"), href: "/ish", open: true },
        { icon: "heart", title: t("mob.profile.saved"), href: "/saqlanganlar" },
      ],
    },
    {
      key: "service",
      title: t("mob.menu.service"),
      tint: color.success,
      bg: color.successSoft,
      items: [
        { icon: "wrench", title: t("mob.svc.title"), href: "/ustaxona", open: true },
        { icon: "headset", title: t("mob.disp.title"), href: "/dispetcherlar", open: true },
        { icon: "sparkle", title: t("mob.ai.title"), href: "/ai", feature: "ai" },
        { icon: "chat", title: t("mob.nav.chat"), href: "/chat", feature: "messenger" },
      ],
    },
    {
      key: "finance",
      title: t("mob.menu.finance"),
      tint: color.purple,
      bg: color.purpleSoft,
      items: [
        { icon: "wallet", title: t("mob.fin.title"), href: "/moliya", feature: "money" },
        { icon: "chart", title: t("mob.an.title"), href: "/analitika", feature: "analytics" },
        { icon: "star", title: t("mob.trust.title"), href: "/reyting" },
        { icon: "alert", title: t("mob.notes.problem"), href: "/bildirishnomalar?tab=problem" },
      ],
    },
    {
      key: "more",
      title: t("mob.menu.more"),
      tint: color.mutedForeground,
      bg: color.muted,
      items: [
        { icon: "user", title: t("mob.roles.title"), href: "/rollarim" },
        { icon: "headset", title: t("mob.support.title"), href: "/yordam" },
        { icon: "play", title: t("mob.video.title"), href: "/qollanma", open: true },
        { icon: "shield", title: t("mob.legal.title"), href: "/huquqiy", open: true },
      ],
    },
  ];
}

const COLS = 3;
const GAP = 10;

export default function MenyuTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const guest = !user && isGuest();

  const tileW = (width - space.lg * 2 - GAP * (COLS - 1)) / COLS;

  function open(it: Item) {
    if (guest && !it.open) {
      guestBlocked();
      return;
    }
    if (it.feature && tariffBlocked(it.feature)) return;
    router.push(it.href as Parameters<typeof router.push>[0]);
  }

  return (
    <View style={s.root}>
      <TabHeader title={t("mob.nav.menu")} search />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl * 2 }]}
        showsVerticalScrollIndicator={false}
      >
        {guest ? (
          <View style={s.hint}>
            <Icon name="lock" size={16} stroke={color.mutedForeground} />
            <Text style={s.hintText}>{t("mob.menu.guestHint")}</Text>
          </View>
        ) : null}

        {groups().map((g) => (
          <View key={g.key}>
            <GroupLabel>{g.title}</GroupLabel>
            <View style={s.grid}>
              {g.items.map((it) => {
                const locked = guest && !it.open;
                const gated = !guest && it.feature !== undefined && !can(it.feature);
                const dim = locked || gated;
                return (
                  <Pressable
                    key={it.href}
                    accessibilityRole="button"
                    onPress={() => open(it)}
                    style={({ pressed }) => [s.tile, { width: tileW }, pressed && { opacity: 0.7 }]}
                  >
                    <View style={[s.iconBox, { backgroundColor: dim ? color.muted : g.bg }]}>
                      <Icon name={it.icon} size={23} stroke={dim ? "#a3adbd" : g.tint} />
                      {dim ? (
                        <View style={s.lock}>
                          <Icon name="lock" size={9} stroke="#ffffff" />
                        </View>
                      ) : null}
                    </View>
                    <Text style={[s.tileText, dim && { color: color.mutedForeground }]} numberOfLines={2}>
                      {it.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { paddingHorizontal: space.lg, paddingTop: 4, gap: space.xl },

  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: radius.control,
    backgroundColor: color.card,
    ...shadow.card,
  },
  hintText: { flex: 1, fontSize: 13, color: color.mutedForeground, lineHeight: 18 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  tile: {
    backgroundColor: color.card,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: "center",
    minHeight: 104,
    ...shadow.card,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },
  lock: {
    position: "absolute",
    right: -4,
    top: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#a3adbd",
    borderWidth: 2,
    borderColor: color.card,
    alignItems: "center",
    justifyContent: "center",
  },
  tileText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: color.foreground,
    textAlign: "center",
    lineHeight: 16,
  },
});
