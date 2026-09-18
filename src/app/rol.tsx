/**
 * A2b — rol tanlash, ro'yxatdan OLDIN (Kornet: «Аккаунт турини танланг»).
 *
 * ── HAMMA ROL (TZ-04, 2026-09-19) ───────────────────────────────
 *
 * Ilgari bu yerda 4 ta eski rol turardi (server faqat ularni qabul
 * qilardi) va usta, zapchast, logistika «Rollarim» da keyin
 * qo'shilardi. Natija: jonlida 114 kishi «dispecher» bo'lib yozildi,
 * 104 tasi hech narsa qilmadi — ro'yxatdagi birinchi tanish so'zni
 * tanlagan. Endi sotuvdagi 11 ta rol guruhlab ko'rsatiladi va
 * tanlangani ro'yxatdan o'tgan zahoti sinov muddati bilan ochiladi
 * (`roleKey`, `lib/rollar.ts`).
 *
 * Oxirgi karta — mehmon: kirmasdan ko'rib chiqish.
 */
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { Text } from "@/components/Text";
import { Button } from "@/components/ui";
import { AuthLine } from "@/components/AuthShell";
import { RolePicker } from "@/components/RolePicker";
import { setGuest } from "@/lib/guest";
import type { RoyxatRol } from "@/lib/rollar";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

export default function RolTanlash() {
  const [picked, setPicked] = useState<RoyxatRol | null>(null);
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

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>{t("mob.rol.title")}</Text>
        <Text style={s.sub}>{t("mob.rol.subtitle")}</Text>

        <RolePicker value={picked} onChange={setPicked} tone="onBrand" />

        <View style={[s.cards, { marginTop: space.lg }]}>
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

        <View style={{ marginTop: space.xl }}>
          <AuthLine
            text={t("mob.signUp.haveAccount")}
            link={t("mob.intro.signIn")}
            onPress={() => router.push("/kirish")}
          />
        </View>
      </ScrollView>

      {/* Tugma PASTDA MAHKAM (2026-09-19): 11 ta rol bilan u ro'yxat
          ostiga tushib ketardi va odam rolni tepada tanlab, tugmani
          izlab pastga aylantirishi kerak bo'lardi */}
      <View style={[s.footer, { paddingBottom: insets.bottom + space.md }]}>
        <Button
          title={t("mob.common.continueBtn")}
          disabled={!picked}
          onPress={() => picked && router.push({ pathname: "/royxat", params: { role: picked } })}
        />
      </View>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.blue },
  top: { flexDirection: "row", alignItems: "center", paddingHorizontal: space.lg, minHeight: 44 },
  back: { width: 44, height: 44, marginLeft: -10, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: space.lg, paddingTop: 14, paddingBottom: space.xl },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: color.blue,
    borderTopWidth: 1,
    borderTopColor: "#ffffff1f",
  },

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
  cardGuest: { backgroundColor: "#ffffff1a", borderColor: "#ffffff33" },
  icon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: color.foreground },
  cardDesc: { fontSize: 12.5, color: color.mutedForeground, marginTop: 2, lineHeight: 17 },

  later: { fontSize: 12.5, color: "#ffffffb3", textAlign: "center", marginTop: 16, lineHeight: 18 },
}));
