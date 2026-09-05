/**
 * Mehmon paneli — «profil» yorlig'ining kirmagan holati.
 *
 * ── NIMA UCHUN ALOHIDA EKRAN EMAS ───────────────────────────────
 *
 * Mehmonga profil yo'q, lekin yorliq bo'sh turishi ham yomon.
 * Shu yorliqda ikkita narsa turadi: kirish taklifi va OCHIQ
 * BO'LIMLAR ro'yxati — ya'ni odam nima borligini ko'rib,
 * keyin qaror qiladi.
 *
 * ── RO'YXAT — VA'DA, MENYU EMAS ─────────────────────────────────
 *
 * Yopiq bo'limlar («Reyslarim», «Moliya») ham ko'rsatiladi, lekin
 * qulf bilan: odam ro'yxatdan o'tsa NIMA olishini bilishi kerak.
 * Ularni umuman yashirsak, kirishning sababi ko'rinmay qolardi.
 */
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon, type IconName } from "@/components/Icon";
import { Button } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { color, font, radius, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

/**
 * `hint` hozir CHIZILMAYDI — katakchada faqat nom sig'adi.
 * O'chirilmadi: matnlar sakkiz tilga tarjima qilingan va ro'yxat
 * ko'rinishiga qaytilsa darrov kerak bo'ladi.
 */
type Row = { icon: IconName; title: string; hint: string; href: string };

/** Kirmasdan ochiladigan bo'limlar — server ham shularni beradi */
function openRows(): Row[] {
  return [
    { icon: "truck", title: t("mob.trucks.title"), hint: t("mob.guest.trucksHint"), href: "/mashinalar" },
    { icon: "package", title: t("mob.market.title"), hint: t("mob.guest.marketHint"), href: "/bozor" },
    { icon: "plus", title: t("mob.part.title"), hint: t("mob.guest.partsHint"), href: "/zapchast" },
    { icon: "route", title: t("mob.svc.title"), hint: t("mob.guest.svcHint"), href: "/ustaxona" },
    { icon: "user", title: t("mob.job.title"), hint: t("mob.guest.jobsHint"), href: "/ish" },
    { icon: "user", title: t("mob.disp.title"), hint: t("mob.disp.subtitle"), href: "/dispetcherlar" },
    { icon: "doc", title: t("mob.video.title"), hint: t("mob.video.subtitle"), href: "/qollanma" },
  ];
}

/** Kirish talab qiladigan bo'limlar — qulf bilan ko'rsatiladi */
function lockedRows(): { icon: IconName; title: string }[] {
  return [
    { icon: "route", title: t("mob.nav.trips") },
    { icon: "chat", title: t("mob.nav.chat") },
    { icon: "truck", title: t("mob.park.title") },
    { icon: "doc", title: t("mob.fin.title") },
    { icon: "sparkle", title: "AI" },
  ];
}

export function GuestPanel() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}>
        {/* ══ KIRISH TAKLIFI ══ */}
        <View style={s.hero}>
          <Logo width={112} light />
          <Text style={s.heroTitle}>{t("mob.guest.title")}</Text>
          <Text style={s.heroText}>{t("mob.guest.text")}</Text>

          <View style={{ marginTop: 18, gap: 9 }}>
            <Button title={t("mob.intro.signUp")} onPress={() => router.push("/royxat")} />
            <Button
              title={t("mob.intro.signIn")}
              variant="secondary"
              onPress={() => router.push("/kirish")}
            />
          </View>
        </View>

        {/* ══ OCHIQ BO'LIMLAR ══
            KATAKCHA, ro'yxat emas: ettita bo'lim ro'yxat holida
            butun ekranni egallardi va odam pastdagi «qulfli»
            qismini umuman ko'rmasdi. Katakchada ikkalasi ham bir
            ekranga sig'adi — taqqoslash shundan tug'iladi. */}
        <View>
          <Text style={s.group}>
            {t("mob.guest.openGroup")} ({openRows().length})
          </Text>
          <View style={s.grid}>
            {openRows().map((r) => (
              <Pressable
                key={r.href}
                style={({ pressed }) => [s.tile, pressed && { backgroundColor: color.muted }]}
                onPress={() => router.push(r.href as Parameters<typeof router.push>[0])}
              >
                <View style={s.tileIcon}>
                  <Icon name={r.icon} size={19} stroke={color.brand} />
                </View>
                <Text style={s.tileText} numberOfLines={2}>
                  {r.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ══ KIRGANDAN KEYIN OCHILADI ══ */}
        <View>
          <Text style={s.group}>
            {t("mob.guest.lockedGroup")} ({lockedRows().length})
          </Text>
          <View style={s.grid}>
            {lockedRows().map((r) => (
              <View key={r.title} style={[s.tile, s.tileOff]}>
                <View style={[s.tileIcon, { backgroundColor: color.muted }]}>
                  <Icon name={r.icon} size={19} stroke="#cbd5e1" />
                </View>
                <Text style={[s.tileText, { color: color.mutedForeground }]} numberOfLines={2}>
                  {r.title}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable style={s.lang} onPress={() => router.push("/til")}>
          <Text style={s.langText}>{t("mob.guest.langBtn")}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.lg },
  group: {
    fontSize: 12,
    fontWeight: "600",
    color: color.mutedForeground,
    letterSpacing: 0.3,
    marginBottom: 7,
    marginLeft: 4,
  },

  hero: { backgroundColor: color.navy, borderRadius: radius.card, padding: 20 },
  heroTitle: {
    fontSize: font.titleLg,
    fontWeight: "700",
    color: "#fff",
    marginTop: 16,
    letterSpacing: -0.3,
  },
  heroText: { fontSize: 14, color: "#f1f5f9bf", marginTop: 6, lineHeight: 21 },

  /* Uch ustun: to'rtta bo'lsa yozuv ikki qatorga bo'linib ketardi
     («Dispetcherlar» ruschada yanada uzun). */
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  tile: {
    width: "31.5%",
    flexGrow: 1,
    alignItems: "center",
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 8,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
  },
  tileOff: { backgroundColor: color.muted + "80", borderStyle: "dashed" },
  tileIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: color.brand + "14",
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

  lang: { alignSelf: "center", paddingVertical: 10, paddingHorizontal: 16 },
  langText: { fontSize: 14, fontWeight: "500", color: color.mutedForeground },
});
