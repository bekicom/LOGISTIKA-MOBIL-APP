/**
 * Lenta manbasi: 👤 ◯━ ✈ — odamlar joylagani / Telegram bilan birga.
 *
 * Bekzod: «yuklar bo'limiga kichik galochka qo'y — o'chirsa odamlar
 * joylagan yuklarni ko'rsatadi, bu webda ham bor». Birinchi variant
 * belgi-katakcha edi; ko'rib: «galochka emas, radioli qil» — raqobatchi
 * ilovadagidek KALIT, ikki tomonida ma'nosi bilan:
 *
 *   · chapda 👤 — kalit shu tomonda bo'lsa, faqat odamlar o'zi joylagan
 *     e'lonlar (server: `tg=0` → `source: USER`);
 *   · o'ngda ✈ — Telegram guruhlaridan yig'ilganlar ham (sukut, web'dagi
 *     «+ Telegram» yoqiq holati).
 *
 * Faol tomon belgisi rangli, ikkinchisi xira — kalit qayerda turganini
 * o'qimasdan ham ko'rish mumkin.
 *
 * RN'ning o'z `Switch` i ishlatilmadi: iOS'da u 51×31 va 34 px lik filtr
 * qatoriga sig'maydi, Android'da esa boshqacha ko'rinadi. Bu yerda ikki
 * platformada bir xil, ixcham kalit.
 */
import { useEffect, useState } from "react";
import { Animated, Pressable, View } from "react-native";
import { Icon } from "@/components/Icon";
import { useTgLenta } from "@/lib/tg-lenta";
import { SPRING, useReduceMotion } from "@/lib/motion";
import { color, radius, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

/* Telegram ko'kining to'qroq tusi: asl `#2AABEE` oq ustida 2.6:1 edi */
const TG = "#1273B8";
const YO_L = 38 - 18 - 4; // yo'lak kengligi − tugmacha − ikki chekka

export function TgToggle() {
  const [on, set] = useTgLenta();
  const reduce = useReduceMotion();
  const [x] = useState(() => new Animated.Value(on ? 1 : 0));

  useEffect(() => {
    if (reduce) {
      x.setValue(on ? 1 : 0);
      return;
    }
    Animated.spring(x, { toValue: on ? 1 : 0, useNativeDriver: true, ...SPRING }).start();
  }, [on, reduce, x]);

  return (
    <Pressable
      onPress={() => set(!on)}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={t("mob.feed.tgHint")}
      hitSlop={4}
      style={({ pressed }) => [s.pill, pressed && { opacity: 0.8 }]}
    >
      <Icon name="user" size={16} stroke={on ? color.faintText : color.brand} />
      <View style={[s.track, { backgroundColor: on ? TG : color.border }]}>
        <Animated.View
          style={[
            s.knob,
            { transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, YO_L] }) }] },
          ]}
        />
      </View>
      <Icon name="send" size={15} stroke={on ? TG : color.faintText} />
    </Pressable>
  );
}

const s = themed(() => ({
  pill: {
    height: 34,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
  },
  track: { width: 38, height: 22, borderRadius: 11, padding: 2, justifyContent: "center" },
  knob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
}));
