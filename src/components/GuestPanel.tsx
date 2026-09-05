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

        {/* ══ OCHIQ BO'LIMLAR ══ */}
        <View>
          <Text style={s.group}>{t("mob.guest.openGroup")}</Text>
          <View style={s.card}>
            {openRows().map((r, i) => (
              <Pressable
                key={r.href}
                style={[s.row, i < openRows().length - 1 && s.rowLine]}
                onPress={() => router.push(r.href as Parameters<typeof router.push>[0])}
              >
                <View style={s.icon}>
                  <Icon name={r.icon} size={18} stroke={color.mutedForeground} />
                </View>
                <View style={{ flexGrow: 1, minWidth: 0 }}>
                  <Text style={s.rowTitle}>{r.title}</Text>
                  <Text style={s.rowHint} numberOfLines={1}>
                    {r.hint}
                  </Text>
                </View>
                <Icon name="chevron" size={17} stroke={color.mutedForeground} />
              </Pressable>
            ))}
          </View>
        </View>

        {/* ══ KIRGANDAN KEYIN OCHILADI ══ */}
        <View>
          <Text style={s.group}>{t("mob.guest.lockedGroup")}</Text>
          <View style={s.card}>
            {lockedRows().map((r, i) => (
              <View key={r.title} style={[s.row, i < lockedRows().length - 1 && s.rowLine]}>
                <View style={s.icon}>
                  <Icon name={r.icon} size={18} stroke="#cbd5e1" />
                </View>
                <Text style={[s.rowTitle, { flexGrow: 1, color: color.mutedForeground }]}>
                  {r.title}
                </Text>
                <Icon name="close" size={15} stroke="#cbd5e1" />
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

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: space.md },
  rowLine: { borderBottomWidth: 1, borderBottomColor: color.muted },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 14, fontWeight: "600", color: color.foreground },
  rowHint: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },

  lang: { alignSelf: "center", paddingVertical: 10, paddingHorizontal: 16 },
  langText: { fontSize: 14, fontWeight: "500", color: color.mutedForeground },
});
