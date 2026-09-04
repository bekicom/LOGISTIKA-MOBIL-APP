/**
 * K1 — kalkulyator.
 *
 * ── NEGA QORONG'I ───────────────────────────────────────────────
 *
 * Bu ekran yo'lda, bir qo'l bilan ishlatiladi. Qorong'i fon tunda
 * ko'zni qamashtirmaydi va tugmalar ekranning qolganidan ajralib
 * turadi.
 *
 * ── TUGMALAR KATTA ──────────────────────────────────────────────
 *
 * 68px — `size.touch` (44) dan ancha katta. Bu ekranning ASOSIY
 * ishi shu tugmalar, ya'ni ular uchun joyni ayamaydi. Qo'lqopda
 * ham bosiladigan o'lchamda.
 *
 * ── HISOB SERVERDA EMAS ─────────────────────────────────────────
 *
 * To'rt amal — offline ishlaydi. Valyuta va logistika hisoblari
 * boshqa joyda: ular kurs va me'yorga bog'liq, ya'ni serverdan
 * keladi.
 */
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { color, font, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Op = "+" | "−" | "×" | "÷" | null;

/** Ming ajratgich bilan — uzun summalar o'qilishi uchun */
function show(v: string) {
  const [a, b] = v.split(".");
  const head = a.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return b === undefined ? head : `${head},${b}`;
}

export default function Kalkulyator() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [cur, setCur] = useState("0");
  const [prev, setPrev] = useState<string | null>(null);
  const [op, setOp] = useState<Op>(null);
  /* Amaldan keyin birinchi raqam eskisini ALMASHTIRADI, ustiga
     qo'shilmaydi — aks holda «12 + 3» o'rniga «123» chiqardi. */
  const [fresh, setFresh] = useState(true);

  function digit(d: string) {
    if (fresh) {
      setCur(d === "." ? "0." : d);
      setFresh(false);
      return;
    }
    if (d === "." && cur.includes(".")) return;
    /* 15 xonadan uzun son telefonda baribir sig'maydi va
       aniqligi ham yo'qoladi */
    if (cur.replace(/[^0-9]/g, "").length >= 15) return;
    setCur(cur === "0" && d !== "." ? d : cur + d);
  }

  function calc(a: string, b: string, o: Op): string {
    const x = Number(a);
    const y = Number(b);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return "0";
    let r: number;
    switch (o) {
      case "+": r = x + y; break;
      case "−": r = x - y; break;
      case "×": r = x * y; break;
      /* Nolga bo'lish — xato emas, javob yo'q. `Infinity`
         ko'rsatish odamga hech nima aytmasdi. */
      case "÷": r = y === 0 ? NaN : x / y; break;
      default: return b;
    }
    if (!Number.isFinite(r)) return "";
    return String(Math.round(r * 1e9) / 1e9);
  }

  function press(o: Op) {
    if (op && prev != null && !fresh) {
      const r = calc(prev, cur, op);
      setCur(r);
      setPrev(r);
    } else {
      setPrev(cur);
    }
    setOp(o);
    setFresh(true);
  }

  function equals() {
    if (!op || prev == null) return;
    setCur(calc(prev, cur, op));
    setPrev(null);
    setOp(null);
    setFresh(true);
  }

  function clear() {
    setCur("0");
    setPrev(null);
    setOp(null);
    setFresh(true);
  }

  function back() {
    if (fresh) return;
    setCur(cur.length > 1 ? cur.slice(0, -1) : "0");
  }

  function percent() {
    /* Amal ichida foiz — «1000 + 5%» degan odatdagi hisob.
       Yolg'iz turganda esa oddiy yuzdan bir. */
    if (op && prev != null) {
      setCur(String((Number(prev) * Number(cur)) / 100));
    } else {
      setCur(String(Number(cur) / 100));
    }
    setFresh(false);
  }

  const line = op && prev != null ? `${show(prev)} ${op}` : "";

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.head}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.back}>
          <Icon name="back" size={22} stroke="#ffffff" />
        </Pressable>
        <Text style={s.title}>{t("mob.calc.title")}</Text>
      </View>

      <View style={[s.pad, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={s.screen}>
          <Text style={s.line} numberOfLines={1}>
            {line}
          </Text>
          <Text style={s.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>
            {cur === "" ? t("mob.calc.noAnswer") : show(cur)}
          </Text>
        </View>

        <View style={{ gap: 10 }}>
          <View style={s.row}>
            <Key label="C" tone="soft" onPress={clear} />
            <Key label="←" tone="soft" onPress={back} />
            <Key label="%" tone="soft" onPress={percent} />
            <Key label="÷" tone="op" on={op === "÷"} onPress={() => press("÷")} />
          </View>
          <View style={s.row}>
            {["7", "8", "9"].map((d) => (
              <Key key={d} label={d} onPress={() => digit(d)} />
            ))}
            <Key label="×" tone="op" on={op === "×"} onPress={() => press("×")} />
          </View>
          <View style={s.row}>
            {["4", "5", "6"].map((d) => (
              <Key key={d} label={d} onPress={() => digit(d)} />
            ))}
            <Key label="−" tone="op" on={op === "−"} onPress={() => press("−")} />
          </View>
          <View style={s.row}>
            {["1", "2", "3"].map((d) => (
              <Key key={d} label={d} onPress={() => digit(d)} />
            ))}
            <Key label="+" tone="op" on={op === "+"} onPress={() => press("+")} />
          </View>
          <View style={s.row}>
            <Key label="0" flex={2.1} onPress={() => digit("0")} />
            <Key label="," onPress={() => digit(".")} />
            <Key label="=" tone="op" onPress={equals} />
          </View>
        </View>
      </View>
    </View>
  );
}

function Key({
  label,
  onPress,
  tone = "num",
  flex = 1,
  on,
}: {
  label: string;
  onPress: () => void;
  tone?: "num" | "soft" | "op";
  flex?: number;
  on?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        s.key,
        { flex },
        tone === "num" && s.keyNum,
        tone === "soft" && s.keySoft,
        tone === "op" && s.keyOp,
        /* Bosilgan amal YORITILADI: odam «nima bosgandim» deb
           qayta bosib, hisobni buzardi. */
        on && s.keyOn,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[s.keyText, tone === "op" && s.keyOpText, on && s.keyOnText]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.navy },

  head: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: space.md },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: font.titleLg, fontWeight: "700", color: "#fff" },

  pad: { flexGrow: 1, justifyContent: "flex-end", padding: space.lg },

  screen: { alignItems: "flex-end", paddingHorizontal: 8, paddingBottom: 22 },
  line: { fontSize: 15, color: "#f1f5f980" },
  value: {
    fontSize: 44,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -1.5,
    marginTop: 6,
  },

  row: { flexDirection: "row", gap: 10 },
  key: { height: 68, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  keyNum: { backgroundColor: "#ffffff12" },
  keySoft: { backgroundColor: "#ffffff1f" },
  keyOp: { backgroundColor: color.brand },
  keyOn: { backgroundColor: "#fff" },
  keyText: { fontSize: 23, color: "#fff" },
  keyOpText: { fontSize: 24, fontWeight: "600" },
  /* Yoritilgan amalda oq fon — matn ham rangini almashtiradi,
     aks holda oq ustida oq bo'lib ko'rinmay qolardi */
  keyOnText: { color: color.brand },
});
