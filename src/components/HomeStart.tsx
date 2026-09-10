/**
 * Bosh sahifadagi ikkita kichik blok: valyuta kursi va «Boshlash».
 *
 * ── NEGA KURS BOSH SAHIFADA ─────────────────────────────────────
 *
 * Haydovchi narxni kunda bir necha marta o'giradi: fraxt dollarda,
 * yoqilg'i so'mda, chegaradagi to'lov tengeda. Webda kurs bosh
 * sahifada turadi (`home/fx-calc`) va sabab shu. Ilovada esa u
 * `hisoblagichlar` ichida ko'milib qolgan edi — kunda bir necha
 * marta kerak bo'ladigan narsa uchun uzoq.
 *
 * Bu yerda faqat UCHTA kurs va bitta havola: to'liq konvertor
 * o'sha yerda qoladi. Bosh sahifa lentaga o'rin bermasa,
 * foydasidan ko'ra xalaqiti ko'p bo'lardi.
 *
 * ── «BOSHLASH» KIMGA CHIQADI ────────────────────────────────────
 *
 * Faqat o'rganish yo'li TUGAMAGANLARGA. Hammasini ko'rib chiqqan
 * odamga bu blok — bo'sh joy egallagan eslatma.
 *
 * Qadamlarni SERVER tanlaydi (`/api/profile/progress`): qaysi
 * bo'lim ochiq, qaysisi ishlatilgan, keyingisi qaysi — hammasi
 * o'sha yerda. Ilovada ikkinchi nusxa yozilsa, bosh sahifadagi
 * ro'yxat `profil/organish` dagisidan farq qila boshlardi.
 *
 * ── MEHMONGA BOSHQACHA ──────────────────────────────────────────
 *
 * Mehmonning profili yo'q, ya'ni to'ldiradigan narsasi ham yo'q.
 * Unga webdagi kabi uchta yo'l ko'rsatiladi: yuk qidirish,
 * mashina qo'yish, ro'yxatdan o'tish.
 */
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { useRouter } from "expo-router";
import { Icon, type IconName } from "@/components/Icon";
import { useApi } from "@/lib/use-api";
import { isGuest } from "@/lib/guest";
import { webToApp } from "@/lib/routes";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t, tOr } from "@/lib/i18n";

/* Bosh sahifada uchta kurs — logistikada eng ko'p ishlatiladigani.
   To'liq ro'yxat konvertorda. */
const FX = ["USD", "RUB", "KZT"] as const;

type Rates = { rates: Record<string, number> | null; diff?: Record<string, number> };

export function FxStrip() {
  const router = useRouter();
  const { data } = useApi<Rates>("/api/rates");
  const rates = data?.rates;

  /* Manba yiqilsa blok umuman ko'rinmaydi. «Kurs olinmadi» degan
     qizil quti bosh sahifada — o'zi kutilmagan narsa uchun juda
     baland ovoz. */
  if (!rates) return null;
  const shown = FX.filter((c) => (rates[c] ?? 0) > 0);
  if (shown.length === 0) return null;

  return (
    <Pressable
      onPress={() => router.push("/hisoblagichlar")}
      style={({ pressed }) => [s.fx, pressed && { opacity: 0.9 }]}
      accessibilityRole="button"
    >
      {shown.map((c) => {
        const d = data?.diff?.[c] ?? 0;
        return (
          <View key={c} style={s.fxCell}>
            <Text style={s.fxCode}>{c}</Text>
            <Text style={s.fxVal}>{new Intl.NumberFormat("ru-RU").format(rates[c])}</Text>
            {d !== 0 ? (
              <Text style={[s.fxDiff, { color: d > 0 ? color.success : color.danger }]}>
                {d > 0 ? "+" : ""}
                {new Intl.NumberFormat("ru-RU").format(Math.round(d))}
              </Text>
            ) : null}
          </View>
        );
      })}
      <View style={s.fxCalc}>
        <Icon name="calc" size={17} stroke={color.brand} />
      </View>
    </Pressable>
  );
}

type Step = { section: string; href: string; state: string; next: boolean };
type Progress = { total: number; done: number; pct: number; waiting: Step[] };

/** Mehmonga: uchta yo'l (web `StartHere` bilan bir xil) */
const GUEST: { icon: IconName; title: string; body: string; cta: string; to: string }[] = [
  { icon: "package", title: "mob.start.g1", body: "mob.start.g1b", cta: "mob.start.g1c", to: "/yuklar" },
  { icon: "truck", title: "mob.start.g2", body: "mob.start.g2b", cta: "mob.start.g2c", to: "/mashina-joylash" },
  { icon: "user", title: "mob.start.g3", body: "mob.start.g3b", cta: "mob.start.g3c", to: "/royxat" },
];

export function StartHere() {
  const router = useRouter();
  const guest = isGuest();
  const { data } = useApi<Progress>(guest ? null : "/api/profile/progress");

  if (guest) {
    return (
      <View style={{ marginTop: space.lg }}>
        <Text style={s.head}>{t("mob.start.title")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.cards}>
          {GUEST.map((g) => (
            <Pressable
              key={g.title}
              onPress={() => router.push(g.to as Parameters<typeof router.push>[0])}
              style={({ pressed }) => [s.card, pressed && { opacity: 0.9 }]}
            >
              <View style={s.cardIcon}>
                <Icon name={g.icon} size={20} stroke={color.brand} />
              </View>
              <Text style={s.cardTitle}>{t(g.title)}</Text>
              <Text style={s.cardBody}>{t(g.body)}</Text>
              <Text style={s.cardCta}>{t(g.cta)} →</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  /* Hammasi ko'rib chiqilgan bo'lsa blok yo'qoladi */
  if (!data || data.waiting.length === 0 || data.pct >= 100) return null;

  /* Uchtadan ko'p ko'rsatilmaydi: bosh sahifa vazifalar ro'yxati
     emas. To'liq yo'l `profil/organish` da. */
  const steps = data.waiting.slice(0, 3);

  return (
    <View style={{ marginTop: space.lg }}>
      <View style={s.headRow}>
        <Text style={s.head}>{t("mob.start.title")}</Text>
        <Pressable onPress={() => router.push("/profil/organish")} hitSlop={8}>
          <Text style={s.all}>{t("mob.start.all")}</Text>
        </Pressable>
      </View>

      <View style={s.bar}>
        <View style={[s.barFill, { width: `${Math.max(3, data.pct)}%` }]} />
      </View>
      <Text style={s.barText}>{t("mob.start.progress", { a: data.done, b: data.total })}</Text>

      <View style={{ gap: 8, marginTop: space.md }}>
        {steps.map((st) => (
          <Pressable
            key={st.section}
            onPress={() => {
              const to = webToApp(st.href);
              if (to) router.push(to as Parameters<typeof router.push>[0]);
            }}
            style={({ pressed }) => [s.step, pressed && { backgroundColor: color.muted }]}
          >
            <View style={[s.dot, st.next && { backgroundColor: color.brand }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.stepTitle}>{tOr(`svc.${st.section}`, st.section)}</Text>
              <Text style={s.stepBody} numberOfLines={2}>
                {tOr(`onboardBody.${st.section}`, "")}
              </Text>
            </View>
            <Icon name="chevron" size={16} stroke={color.mutedForeground} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = themed(() => ({
  /* ── Kurs ── */
  fx: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: color.card,
    borderRadius: radius.card,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    marginTop: space.md,
    ...shadow.card,
  },
  fxCell: { flex: 1 },
  fxCode: { fontSize: 10.5, fontWeight: "800", color: color.mutedForeground, letterSpacing: 0.4 },
  fxVal: { fontSize: 14.5, fontWeight: "800", color: color.foreground, marginTop: 1 },
  fxDiff: { fontSize: 10.5, fontWeight: "700", marginTop: 1 },
  fxCalc: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.brandSoft,
  },

  /* ── Boshlash ── */
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  head: { fontSize: 15, fontWeight: "800", color: color.foreground },
  all: { fontSize: 12.5, fontWeight: "700", color: color.brand },

  bar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: color.muted,
    marginTop: space.md,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 3, backgroundColor: color.brand },
  barText: { fontSize: 11.5, color: color.mutedForeground, marginTop: 5 },

  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: color.card,
    borderRadius: radius.control,
    paddingHorizontal: 13,
    paddingVertical: 11,
    ...shadow.card,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.border },
  stepTitle: { fontSize: 13.5, fontWeight: "700", color: color.foreground },
  stepBody: { fontSize: 11.5, color: color.mutedForeground, marginTop: 2, lineHeight: 16 },

  cards: { gap: 9, paddingTop: space.md, paddingRight: space.lg },
  card: {
    width: 190,
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.lg,
    ...shadow.card,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.brandSoft,
  },
  cardTitle: { fontSize: 14, fontWeight: "800", color: color.foreground, marginTop: 10 },
  cardBody: { fontSize: 11.5, color: color.mutedForeground, marginTop: 4, lineHeight: 16 },
  cardCta: { fontSize: 12.5, fontWeight: "700", color: color.brand, marginTop: 10 },
}));
