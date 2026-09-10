/**
 * «+» — tab bar o'rtasidagi tugma nima ochadi.
 *
 * Kornet, diip, LoadMe — uchalasida ham o'rtadagi katta tugma
 * «yangi narsa yaratish». Bizda yaratiladigan narsa beshta va ular
 * turli rollarga tegishli, shuning uchun tugma to'g'ridan-to'g'ri
 * ekranga emas, TANLOV varag'iga olib boradi.
 *
 * Tarif to'sig'i shu yerda tekshiriladi (`tariffBlocked`), ekranga
 * kirib xato ko'rgandan ko'ra oldindan aytilgani yaxshi (qoida 5).
 * Usta chaqirish — hammaga ochiq, to'siq yo'q.
 */
import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { useRouter } from "expo-router";
import { Icon, type IconName } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { can, tariffBlocked, type FeatureKey } from "@/lib/features";
import { color, radius, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Action = {
  icon: IconName;
  title: string;
  hint: string;
  href: "/yuk-joylash" | "/mashina-joylash" | "/bozor-joylash" | "/ish-beruvchi" | "/usta-chaqirish";
  feature: FeatureKey | null;
  tint: string;
  bg: string;
};

/* Funksiya: matn til tanlangandan keyin o'qilishi kerak */
function actions(): Action[] {
  return [
    {
      icon: "package",
      title: t("mob.loads.post"),
      hint: t("mob.post.loadHint"),
      href: "/yuk-joylash",
      feature: "post_load",
      tint: color.brand,
      bg: color.brandSoft,
    },
    {
      icon: "truck",
      title: t("mob.post.truck"),
      hint: t("mob.post.truckHint"),
      href: "/mashina-joylash",
      feature: "post_truck",
      tint: color.blue,
      bg: color.blueSoft,
    },
    {
      icon: "tag",
      title: t("mob.post.sale"),
      hint: t("mob.post.saleHint"),
      href: "/bozor-joylash",
      feature: "auto_sale",
      tint: color.purple,
      bg: color.purpleSoft,
    },
    {
      icon: "briefcase",
      title: t("mob.post.job"),
      hint: t("mob.post.jobHint"),
      href: "/ish-beruvchi",
      feature: "vacancies",
      tint: color.success,
      bg: color.successSoft,
    },
    {
      icon: "wrench",
      title: t("mob.svc.callTitle"),
      hint: t("mob.post.masterHint"),
      href: "/usta-chaqirish",
      feature: null,
      tint: color.warning,
      bg: color.warningSoft,
    },
  ];
}

/** Ro'yxatning o'zi — varaqda ham, `/joylash` ekranida ham shu */
export function PostActions({ onDone }: { onDone?: () => void }) {
  const router = useRouter();

  return (
    <View style={s.list}>
      {actions().map((a) => {
        const gated = a.feature !== null && !can(a.feature);
        return (
          <Pressable
            key={a.href}
            accessibilityRole="button"
            onPress={() => {
              if (a.feature && tariffBlocked(a.feature)) return;
              onDone?.();
              router.push(a.href);
            }}
            style={({ pressed }) => [s.row, pressed && { backgroundColor: color.muted }]}
          >
            <View style={[s.icon, { backgroundColor: a.bg }]}>
              <Icon name={a.icon} size={22} stroke={a.tint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{a.title}</Text>
              <Text style={s.hint} numberOfLines={1}>
                {a.hint}
              </Text>
            </View>
            {gated ? (
              <View style={s.lock}>
                <Icon name="lock" size={13} stroke={color.mutedForeground} />
              </View>
            ) : (
              <Icon name="chevron" size={18} stroke={color.iconFaint} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export function PostSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={t("mob.post.title")}>
      <PostActions onDone={onClose} />
    </Sheet>
  );
}

const s = themed(() => ({
  list: { gap: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radius.control,
  },
  icon: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15.5, fontWeight: "600", color: color.foreground },
  hint: { fontSize: 12.5, color: color.mutedForeground, marginTop: 2 },
  lock: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
}));
