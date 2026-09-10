/**
 * A2b — rol tanlash, ro'yxatdan OLDIN (Kornet: «Аккаунт турини танланг»).
 *
 * ── NEGA TO'RTTA ────────────────────────────────────────────────
 *
 * Serverning `registerSchema` faqat to'rt rolni qabul qiladi:
 * SHIPPER, DRIVER, VEHICLE_OWNER, DISPATCHER. Qolgan to'qqiztasi
 * (usta, do'kon, ish beruvchi…) ro'yxatdan keyin «Rollarim» da
 * qo'shiladi — har birining o'z tarifi bor. Bu yerda beshta
 * «guruh» ko'rsatsak, odam ustani tanlab ro'yxatdan o'ta olmasdi.
 *
 * Beshinchi karta — mehmon: kirmasdan ko'rib chiqish.
 */
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon, type IconName } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { Text } from "@/components/Text";
import { Button } from "@/components/ui";
import { AuthLine } from "@/components/AuthShell";
import { setGuest } from "@/lib/guest";
import { color, radius, space, themed } from "@/lib/theme";
import { roleLabel, t } from "@/lib/i18n";

type Card = { role: string; icon: IconName; desc: string; tint: string; bg: string };

/* Rol nomi `mob.role.*`, tavsifi `mob.signUp.role*` — ikkalasi
   lug'atda. Bu yerda faqat ENUM qiymati va kalit. */
const CARDS: Card[] = [
  { role: "DRIVER", icon: "truck", desc: "mob.signUp.roleDriver", tint: color.brand, bg: color.brandSoft },
  { role: "SHIPPER", icon: "package", desc: "mob.signUp.roleShipper", tint: color.blue, bg: color.blueSoft },
  { role: "VEHICLE_OWNER", icon: "users", desc: "mob.signUp.roleOwner", tint: color.success, bg: color.successSoft },
  { role: "DISPATCHER", icon: "headset", desc: "mob.signUp.roleDispatcher", tint: color.purple, bg: color.purpleSoft },
];

export default function RolTanlash() {
  const [picked, setPicked] = useState<string | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.root, { paddingTop: insets.top + 6 }]}>
      <View style={s.top}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.back} accessibilityRole="button">
          <Icon name="back" size={22} stroke="#ffffff" />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Logo width={110} light />
        <View style={{ flex: 1 }} />
        <View style={s.back} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.title}>{t("mob.rol.title")}</Text>
        <Text style={s.sub}>{t("mob.rol.subtitle")}</Text>

        <View style={s.cards}>
          {CARDS.map((c) => {
            const on = picked === c.role;
            return (
              <Pressable
                key={c.role}
                onPress={() => setPicked(c.role)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={({ pressed }) => [s.card, on && s.cardOn, pressed && { opacity: 0.92 }]}
              >
                <View style={[s.icon, { backgroundColor: c.bg }]}>
                  <Icon name={c.icon} size={26} stroke={c.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{roleLabel(c.role)}</Text>
                  <Text style={s.cardDesc}>{t(c.desc)}</Text>
                </View>
                {on ? (
                  <View style={s.picked}>
                    <Icon name="check" size={12} stroke="#ffffff" />
                    <Text style={s.pickedText}>{t("mob.rol.selected")}</Text>
                  </View>
                ) : (
                  <View style={s.radio} />
                )}
              </Pressable>
            );
          })}

          {/* Mehmon — kirmasdan ko'rish */}
          <Pressable
            onPress={async () => {
              await setGuest(true);
              router.replace("/yuklar");
            }}
            accessibilityRole="button"
            style={({ pressed }) => [s.card, s.cardGuest, pressed && { opacity: 0.92 }]}
          >
            <View style={[s.icon, { backgroundColor: "#ffffff22" }]}>
              <Icon name="search" size={24} stroke="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.cardTitle, { color: "#ffffff" }]}>{t("mob.rol.guest")}</Text>
              <Text style={[s.cardDesc, { color: "#ffffffcc" }]}>{t("mob.rol.guestHint")}</Text>
            </View>
            <Icon name="chevron" size={18} stroke="#ffffffaa" />
          </Pressable>
        </View>

        <Text style={s.later}>{t("mob.rol.later")}</Text>

        <View style={{ marginTop: space.lg }}>
          <Button
            title={t("mob.common.continueBtn")}
            disabled={!picked}
            onPress={() => router.push({ pathname: "/royxat", params: { role: picked ?? "" } })}
          />
        </View>

        <View style={{ marginTop: space.xl }}>
          <AuthLine
            text={t("mob.signUp.haveAccount")}
            link={t("mob.intro.signIn")}
            onPress={() => router.push("/kirish")}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.blue },
  top: { flexDirection: "row", alignItems: "center", paddingHorizontal: space.lg, minHeight: 44 },
  back: { width: 44, height: 44, marginLeft: -10, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: space.lg, paddingTop: 14 },

  title: { fontSize: 28, fontWeight: "800", color: "#ffffff", letterSpacing: -0.5 },
  sub: { fontSize: 15, color: "#ffffffcc", marginTop: 4, marginBottom: 18 },

  cards: { gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#ffffff",
    borderRadius: radius.card,
    padding: 14,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  cardOn: { borderColor: color.brand },
  cardGuest: { backgroundColor: "#ffffff1a", borderColor: "#ffffff33" },
  icon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: color.foreground },
  cardDesc: { fontSize: 12.5, color: color.mutedForeground, marginTop: 2, lineHeight: 17 },

  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color.border },
  picked: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: color.brand,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    height: 24,
  },
  pickedText: { fontSize: 11, fontWeight: "700", color: "#ffffff" },

  later: { fontSize: 12.5, color: "#ffffffb3", textAlign: "center", marginTop: 16, lineHeight: 18 },
}));
