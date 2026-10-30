/**
 * FURAM AI robot — har ekranda, suriladigan (yakuniy TZ 29-okt, 10-bo'lim;
 * 13-bo'lim, 4-qator: «AI faqat Ish stolida ikonka» → «suriladigan,
 * yo'qolmaydigan robot har ekranda»).
 *
 * Web bilan bir xil xulq (`furam/src/components/layout/ai-robot.tsx`):
 *   · barmoq bilan suriladi, joyi saqlanadi (`secure-kv`), ekran
 *     aylansa yoki klaviatura ochilsa ekran ichiga qaytariladi;
 *   · YOPILMAYDI — faqat kichraytiriladi (burchakdagi «–» / «+»);
 *   · bosilsa AI yordamchi ochiladi; mehmonga — «Men FURAM AI
 *     yordamchisiman» va Kirish/Ro'yxatdan o'tish taklifi;
 *   · «Harakatni kamaytirish» yoqilgan bo'lsa robot qimirlamaydi.
 *
 * Kirish ekranlarida (hali kim ekani noma'lum) chizilmaydi.
 */
import { useEffect, useRef, useState, type RefObject } from "react";
import {
  AccessibilityInfo,
  Alert,
  Animated,
  Easing,
  Image,
  Keyboard,
  PanResponder,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { useAuth } from "@/lib/auth-context";
import { isGuest } from "@/lib/guest";
import { kvGet, kvSet } from "@/lib/secure-kv";
import { color, shadow } from "@/lib/theme";
import { t } from "@/lib/i18n";

const KALIT = "furam.aiRobotJoy";
const KATTA = 56;
const KICHIK = 40;
const CHET = 8;
const SILJISH = 6;

/** Kirish va tanishtiruv ekranlari — robot ko'rinmaydi */
const YOQ = ["/", "/kirish", "/royxat", "/parol", "/tanishtiruv"];

/** Ekran ichiga qaytarish — sof funksiya (web dagi `qisish` bilan bir xil) */
export function qisish(x: number, y: number, o: number, w: number, h: number) {
  return {
    x: Math.min(Math.max(CHET, x), Math.max(CHET, w - o - CHET)),
    y: Math.min(Math.max(CHET, y), Math.max(CHET, h - o - CHET)),
  };
}

type Joy = { x: number; y: number; kichik: boolean };

export function AiRobot() {
  const { user } = useAuth();
  const pathname = usePathname();
  const { width: w, height: h } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [saqlangan, setSaqlangan] = useState<Joy | null>(null);
  const [yuklandi, setYuklandi] = useState(false);
  const [klaviatura, setKlaviatura] = useState(0);
  const [jonli, setJonli] = useState<{ x: number; y: number } | null>(null);
  const [bob] = useState(() => new Animated.Value(0));

  /* Saqlangan joy — bir marta */
  useEffect(() => {
    let tirik = true;
    void kvGet(KALIT)
      .then((v) => {
        if (!tirik || !v) return;
        const j = JSON.parse(v) as Partial<Joy>;
        if (typeof j.x === "number" && typeof j.y === "number") {
          setSaqlangan({ x: j.x, y: j.y, kichik: j.kichik === true });
        }
      })
      .catch(() => {})
      .finally(() => tirik && setYuklandi(true));
    return () => {
      tirik = false;
    };
  }, []);

  /* Klaviatura ochilsa robot uning ustiga ko'tariladi — yashirinmaydi */
  useEffect(() => {
    const a = Keyboard.addListener("keyboardDidShow", (e) => setKlaviatura(e.endCoordinates.height));
    const b = Keyboard.addListener("keyboardDidHide", () => setKlaviatura(0));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);

  /* Sekin «nafas olish» — harakatni kamaytirish yoqilgan bo'lsa yo'q */
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    void AccessibilityInfo.isReduceMotionEnabled().then((kam) => {
      if (kam) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(bob, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(bob, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      );
      loop.start();
    });
    return () => loop?.stop();
  }, [bob]);

  const kichik = saqlangan?.kichik === true;
  const o = kichik ? KICHIK : KATTA;
  /* Boshlang'ich joy: o'ng pastda, pastki menyu va yozish maydonidan yuqorida */
  const asos = saqlangan ?? { x: w - o - 16, y: h - o - insets.bottom - 140 };
  const joy = qisish(jonli?.x ?? asos.x, jonli?.y ?? asos.y, o, w, h - klaviatura);
  /* Javobchi bir marta yasaladi (surish o'rtasida qayta yasalsa harakat
     uziladi) — joriy qiymatlarni ref orqali o'qiydi. Ref chizish paytida
     emas, effektda yangilanadi (`react-hooks/refs`) */
  const joyRef = useRef(joy);
  const holatRef = useRef({ kichik, user: !!user });
  useEffect(() => {
    joyRef.current = joy;
    holatRef.current = { kichik, user: !!user };
  });

  const surish = useRef<{ sx: number; sy: number; surildi: boolean }>({ sx: 0, sy: 0, surildi: false });
  /* Ref'lar faqat barmoq harakatida o'qiladi, chizishda emas — lint buni ajrata olmaydi */
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => javobchi({ joyRef, holatRef, surish, setJonli, setSaqlangan }));

  if (!yuklandi || YOQ.includes(pathname) || (!user && !isGuest())) return null;

  function olchamAlmashtir() {
    const j = { ...joy, kichik: !kichik };
    setSaqlangan(j);
    void kvSet(KALIT, JSON.stringify(j)).catch(() => {});
  }

  const chapda = joy.x + o / 2 < w / 2;
  const siljish = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });

  return (
    <View style={[s.idish, { left: joy.x, top: joy.y, width: o, height: o }]} pointerEvents="box-none">
      <View
        {...pan.panHandlers}
        accessible
        accessibilityRole="button"
        accessibilityLabel={t("aiRobot.open")}
        accessibilityHint={t("aiRobot.dragHint")}
        style={[s.disk, { width: o, height: o, borderRadius: o / 2 }, shadow.float]}
      >
        <Animated.View style={{ transform: [{ translateY: siljish }] }}>
          <Image
            source={require("../../assets/images/ai-robot.png")}
            style={{ width: o + 10, height: o + 10, marginTop: -8 }}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
      <Pressable
        onPress={olchamAlmashtir}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={kichik ? t("aiRobot.expand") : t("aiRobot.minimize")}
        style={[s.chip, chapda ? { right: -6 } : { left: -6 }]}
      >
        <Text style={s.chipMatn}>{kichik ? "+" : "–"}</Text>
      </Pressable>
    </View>
  );
}

type Javob = {
  joyRef: RefObject<{ x: number; y: number }>;
  holatRef: RefObject<{ kichik: boolean; user: boolean }>;
  surish: RefObject<{ sx: number; sy: number; surildi: boolean }>;
  setJonli: (v: { x: number; y: number } | null) => void;
  setSaqlangan: (v: Joy) => void;
};

/** Surish javobchisi — komponentdan tashqarida: ref faqat harakat paytida o'qiladi */
function javobchi({ joyRef, holatRef, surish, setJonli, setSaqlangan }: Javob) {
  return PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      surish.current = { sx: joyRef.current.x, sy: joyRef.current.y, surildi: false };
    },
    onPanResponderMove: (_e, g) => {
      if (!surish.current.surildi && Math.hypot(g.dx, g.dy) < SILJISH) return;
      surish.current.surildi = true;
      setJonli({ x: surish.current.sx + g.dx, y: surish.current.sy + g.dy });
    },
    onPanResponderRelease: () => {
      if (surish.current.surildi) {
        const j = { ...joyRef.current, kichik: holatRef.current.kichik };
        setSaqlangan(j);
        setJonli(null);
        void kvSet(KALIT, JSON.stringify(j)).catch(() => {});
        return;
      }
      ochish(holatRef.current.user);
    },
    onPanResponderTerminate: () => setJonli(null),
  });
}

function ochish(kirgan: boolean) {
  if (!kirgan) {
    Alert.alert(t("aiRobot.guestTitle"), t("aiRobot.guestText"), [
      { text: t("mob.common.cancel"), style: "cancel" },
      { text: t("aiRobot.signIn"), onPress: () => router.push("/kirish") },
      { text: t("aiRobot.signUp"), onPress: () => router.push("/royxat") },
    ]);
    return;
  }
  router.push("/ai");
}

const s = StyleSheet.create({
  idish: { position: "absolute", zIndex: 50, elevation: 50 },
  disk: { backgroundColor: color.navy, alignItems: "center", justifyContent: "center", overflow: "visible" },
  chip: {
    position: "absolute",
    top: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
  },
  chipMatn: { fontSize: 13, fontWeight: "700", lineHeight: 15, color: color.foreground },
});
