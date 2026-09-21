/**
 * Qisqa xabar — ekran tepasida bir necha soniya (2026-09-21).
 *
 * Bekzod: «e'londa yurakchani bossam saqlangan xabar bo'lishi kerak».
 * Kartadagi 🔖 lentada, mashinalarda, mosliklarda turadi — har ekranga
 * o'z xabar holatini qo'shish o'rniga BITTA joy: ildiz layout'da
 * `XabarchaJoyi`, chaqirish esa istalgan joydan `xabarcha()`.
 *
 * TEPADA, pastda emas: pastda tab bar va markaziy «+» turadi, tab
 * bo'lmagan ekranlarda esa «Taklif yuborish» kabi asosiy tugma —
 * xabar ularni yopib qo'yardi.
 *
 * BIR VAQTDA BITTA: yangisi eskisining o'rnini oladi va vaqt qaytadan
 * boshlanadi. Tez-tez bosilganda xabarlar navbatga tizilib, bosishdan
 * keyin ham ancha vaqt ekranda aylanib yurmaydi.
 *
 * Rang ikkala rejimda ham to'q (navy): och fonda ham, qorong'i fonda
 * ham ekrandagi hamma narsadan ajralib turadi, matn esa doim oq.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { AccessibilityInfo, Animated, Platform, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { DUR, EASE, useReduceMotion } from "@/lib/motion";
import { color, font, radius, shadow, themed } from "@/lib/theme";

export type Xabar = {
  matn: string;
  ohang?: "ok" | "xato";
  /** O'ngdagi tugma — masalan «Ko'rish» */
  amal?: { nom: string; bos: () => void };
};

type Joriy = Xabar & { n: number };

/** Ekranda qancha turadi — o'qib ulgurish uchun, lekin xalaqit bermay */
const MUDDAT = 2600;

let joriy: Joriy | null = null;
let sanoq = 0;
const tinglovchi = new Set<() => void>();
const xabarBer = () => tinglovchi.forEach((l) => l());
const obuna = (cb: () => void) => {
  tinglovchi.add(cb);
  return () => {
    tinglovchi.delete(cb);
  };
};

export function xabarcha(x: Xabar) {
  joriy = { ...x, n: ++sanoq };
  xabarBer();
  /* Android `accessibilityLiveRegion` bilan o'zi o'qiydi, iOS'da esa aytish kerak */
  if (Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(x.matn);
}

/** Faqat SHU xabarni yopadi — o'rniga yangisi kelgan bo'lsa, unga tegmaydi */
function yop(n: number) {
  if (joriy?.n !== n) return;
  joriy = null;
  xabarBer();
}

/** Ildiz layout'da bir marta — `Stack` dan KEYIN, ya'ni ustida */
export function XabarchaJoyi() {
  const x = useSyncExternalStore(obuna, () => joriy, () => joriy);
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const [k] = useState(() => new Animated.Value(0));
  /* Yopilayotganda ham matn ko'rinib tursin — shuning uchun alohida */
  const [kor, setKor] = useState<Joriy | null>(null);

  useEffect(() => {
    const vaqt = reduce ? 0 : DUR.base;
    if (x) {
      setKor(x);
      Animated.timing(k, { toValue: 1, duration: vaqt, easing: EASE, useNativeDriver: true }).start();
      const tm = setTimeout(() => yop(x.n), MUDDAT);
      return () => clearTimeout(tm);
    }
    Animated.timing(k, { toValue: 0, duration: vaqt, easing: EASE, useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished) setKor(null);
      },
    );
  }, [x, k, reduce]);

  if (!kor) return null;
  const xato = kor.ohang === "xato";

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        s.joy,
        {
          top: insets.top + 8,
          opacity: k,
          transform: [{ translateY: k.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }],
        },
      ]}
    >
      <Pressable onPress={() => yop(kor.n)} style={s.quti} accessibilityLiveRegion="polite">
        <Icon name={xato ? "alert" : "check"} size={18} stroke={xato ? color.danger : color.success} />
        <Text style={s.matn} numberOfLines={2}>
          {kor.matn}
        </Text>
        {kor.amal ? (
          <Pressable
            onPress={() => {
              kor.amal?.bos();
              yop(kor.n);
            }}
            hitSlop={8}
            accessibilityRole="button"
            style={({ pressed }) => [s.amal, pressed && { opacity: 0.7 }]}
          >
            <Text style={s.amalMatn}>{kor.amal.nom}</Text>
          </Pressable>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const s = themed(() => ({
  joy: { position: "absolute", left: 12, right: 12, alignItems: "center", zIndex: 1000 },
  quti: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    maxWidth: 480,
    minHeight: 50,
    paddingVertical: 9,
    paddingLeft: 14,
    paddingRight: 9,
    borderRadius: radius.card,
    backgroundColor: color.navy,
    /* Qorong'i rejimda fon ham to'q — chekka shu bilan ajraladi */
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    ...shadow.float,
  },
  matn: { flex: 1, fontSize: font.body, fontWeight: "600", color: color.navyForeground },
  amal: {
    height: 32,
    paddingHorizontal: 13,
    borderRadius: radius.pill,
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.13)",
  },
  amalMatn: { fontSize: 13, fontWeight: "700", color: color.navyForeground },
}));
