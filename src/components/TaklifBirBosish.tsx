/**
 * AI topgan mos variantga BIR BOSISHDA taklif (TZ 29-okt §11.5) — webdagi
 * `components/taklif-bir-bosish.tsx` bilan bir xil.
 *
 * Yukda narx bo'lsa — o'sha narx bilan darhol ketadi. Narx yo'q bo'lsa
 * server `PRICE_REQUIRED` qaytaradi va shu joyda narx so'raladi.
 * Xato matni `apiErr.<KOD>` dan (`api.ts:errorText`).
 */
import { useState } from "react";
import { TextInput, View } from "react-native";
import { Text } from "@/components/Text";
import { Tap } from "@/components/Tap";
import { api, type FuramError } from "@/lib/api";
import { color, radius, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

const VALYUTALAR = ["USD", "UZS", "RUB", "KZT", "EUR", "CNY"] as const;

export function TaklifBirBosish({ loadId, truckId }: { loadId: string; truckId: string }) {
  const [holat, setHolat] = useState<"bosh" | "band" | "ketdi" | "narx">("bosh");
  const [xato, setXato] = useState<string | null>(null);
  const [narx, setNarx] = useState("");
  const [val, setVal] = useState<string>("USD");

  async function yubor() {
    setHolat("band");
    setXato(null);
    const n = Number(narx.replace(/\s/g, ""));
    try {
      await api("/api/takliflar", {
        method: "POST",
        body: { loadId, truckId, ...(n > 0 ? { price: n, currency: val } : {}) },
      });
      setHolat("ketdi");
    } catch (e) {
      const err = e as FuramError;
      if (err.code === "PRICE_REQUIRED") {
        setHolat("narx");
        return;
      }
      setXato(err.message ?? t("tz5e.panelXato"));
      setHolat(narx ? "narx" : "bosh");
    }
  }

  if (holat === "ketdi") {
    return <Text style={s.ketdi}>✓ {t("tz5e.taklifKetdi")}</Text>;
  }

  return (
    <View style={{ gap: 6 }}>
      {holat === "narx" ? (
        <View style={s.qator}>
          <TextInput
            autoFocus
            keyboardType="numeric"
            value={narx}
            onChangeText={setNarx}
            placeholder={t("tz5e.narxKiriting")}
            placeholderTextColor={color.mutedForeground}
            style={s.input}
          />
          {VALYUTALAR.map((v) => (
            <Tap key={v} onPress={() => setVal(v)} style={[s.val, v === val && s.valOn]}>
              <Text style={[s.valTxt, v === val && { color: color.brand }]}>{v}</Text>
            </Tap>
          ))}
        </View>
      ) : null}
      <Tap
        onPress={() => void yubor()}
        feel="action"
        disabled={holat === "band" || (holat === "narx" && !narx)}
        accessibilityRole="button"
        style={[s.btn, (holat === "band" || (holat === "narx" && !narx)) && { opacity: 0.6 }]}
      >
        <Text style={s.btnTxt}>{t("tz5e.taklifYuborish")}</Text>
      </Tap>
      {xato ? <Text style={s.xato}>{xato}</Text> : null}
    </View>
  );
}

const s = themed(() => ({
  qator: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  input: {
    minWidth: 110,
    height: 38,
    paddingHorizontal: 10,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    color: color.foreground,
    backgroundColor: color.card,
  },
  val: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: radius.control, borderWidth: 1, borderColor: color.border },
  valOn: { borderColor: color.brand, backgroundColor: color.brandSoft },
  valTxt: { fontSize: 12, fontWeight: "700", color: color.mutedForeground },
  btn: { alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.control, backgroundColor: color.brand },
  btnTxt: { fontSize: 13, fontWeight: "800", color: "#ffffff" },
  ketdi: { fontSize: 13, fontWeight: "700", color: color.success },
  xato: { fontSize: 12, color: color.danger },
}));
