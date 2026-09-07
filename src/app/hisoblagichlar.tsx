/**
 * K2 — logistika hisoblagichlari (web `tools` bilan bir xil uchtasi).
 *
 * ── NEGA KALKULYATORDAN ALOHIDA ─────────────────────────────────
 *
 * `kalkulyator` — qorong'i, katta tugmali, yo'lda bir qo'l bilan
 * bosiladigan to'rt amal. Bu esa forma: maydonlar to'ldiriladi va
 * javob o'zi chiqadi. Ikkalasini bitta ekranga tiqsak, ikkalasi ham
 * yomonlashardi.
 *
 * ── HISOB SHU YERDA, KURS SERVERDAN ─────────────────────────────
 *
 * Ko'paytirish va bo'lish offline ishlaydi — yo'lda internet
 * yo'qolishi odatiy hol. Faqat valyuta kursi serverdan keladi
 * (`/api/rates`, manbasi cbu.uz). Kurs kelmasa konvertor
 * ko'rsatilmaydi, qolgan ikkitasi ishlayveradi.
 */
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { Field, Header } from "@/components/ui";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Rates = { rates: Record<string, number> | null; diff?: Record<string, number>; date?: string };

const num = (v: string) => {
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const fmt = (n: number, digits = 0) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: digits }).format(n);

export default function Hisoblagichlar() {
  const insets = useSafeAreaInsets();
  const fx = useApi<Rates>("/api/rates");

  return (
    <View style={s.root}>
      <Header title={t("mob.calc2.title")} />
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.lead}>{t("mob.calc2.lead")}</Text>

        {fx.data?.rates ? <Converter rates={fx.data.rates} date={fx.data.date} /> : null}
        <PerKm />
        <Fuel />
      </ScrollView>
    </View>
  );
}

/** Valyuta konvertori — kurs 1 birlik necha so'm turishida keladi */
function Converter({ rates, date }: { rates: Record<string, number>; date?: string }) {
  const list = Object.keys(rates);
  const [cur, setCur] = useState(list[0] ?? "USD");
  const [amount, setAmount] = useState("");
  const [back, setBack] = useState(false);

  const rate = rates[cur] ?? 0;
  const v = num(amount);
  /* Ikki tomonga: valyuta → so'm va so'm → valyuta. Odam yo'lda
     ikkalasini ham so'raydi, ikkinchi ekran ochirish shart emas. */
  const out = back ? (rate > 0 ? v / rate : 0) : v * rate;

  return (
    <View style={s.card}>
      <View style={s.head}>
        <Text style={s.title}>{t("mob.calc2.fx")}</Text>
        {date ? <Text style={s.date}>{date}</Text> : null}
      </View>

      <View style={s.chips}>
        {list.map((c) => (
          <Pressable key={c} onPress={() => setCur(c)} style={[s.chip, cur === c && s.chipOn]}>
            <Text style={[s.chipText, cur === c && { color: "#fff" }]}>{c}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ marginTop: space.md }}>
        <Field
          label={back ? "UZS" : cur}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="0"
        />
      </View>

      <Pressable onPress={() => setBack((b) => !b)} style={s.swap} hitSlop={8}>
        <Icon name="arrow-right" size={15} stroke={color.brand} />
        <Text style={s.swapText}>{t("mob.calc2.swap")}</Text>
      </Pressable>

      <Text style={s.out}>
        {v > 0 ? `${fmt(out, back ? 2 : 0)} ${back ? cur : "UZS"}` : "—"}
      </Text>
      <Text style={s.hint}>{t("mob.calc2.rateOne", { cur, n: fmt(rate, 2) })}</Text>
    </View>
  );
}

/** 1 km narxi — reys narxi taqqoslashning eng oddiy o'lchovi */
function PerKm() {
  const [price, setPrice] = useState("");
  const [km, setKm] = useState("");
  const p = num(price);
  const d = num(km);
  const out = d > 0 ? p / d : null;

  return (
    <View style={s.card}>
      <Text style={s.title}>{t("mob.calc2.perKm")}</Text>
      <Text style={s.hint}>{t("mob.calc2.perKmHint")}</Text>
      <View style={{ gap: space.md, marginTop: space.md }}>
        <Field
          label={t("mob.calc2.tripPrice")}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          placeholder="0"
        />
        <Field
          label={t("mob.calc2.km")}
          value={km}
          onChangeText={setKm}
          keyboardType="numeric"
          placeholder="0"
        />
      </View>
      <Text style={s.out}>{out != null && out > 0 ? `${fmt(out, 1)} / km` : "—"}</Text>
    </View>
  );
}

/** Yoqilg'i xarajati — masofa × norma × litr narxi */
function Fuel() {
  const [km, setKm] = useState("");
  const [per100, setPer100] = useState("35");
  const [price, setPrice] = useState("");
  const d = num(km);
  const n = num(per100);
  const p = num(price);
  const out = d > 0 && n > 0 && p > 0 ? (d / 100) * n * p : null;

  return (
    <View style={s.card}>
      <Text style={s.title}>{t("mob.calc2.fuel")}</Text>
      <View style={{ gap: space.md, marginTop: space.md }}>
        <Field
          label={t("mob.calc2.km")}
          value={km}
          onChangeText={setKm}
          keyboardType="numeric"
          placeholder="0"
        />
        <Field
          label={t("mob.calc2.per100")}
          value={per100}
          onChangeText={setPer100}
          keyboardType="numeric"
          placeholder="35"
        />
        <Field
          label={t("mob.calc2.litrePrice")}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          placeholder="0"
        />
      </View>
      <Text style={s.out}>{out != null ? fmt(out) : "—"}</Text>
      {out != null && d > 0 ? (
        <Text style={s.hint}>{t("mob.calc2.litres", { n: fmt((d / 100) * n, 1) })}</Text>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },
  lead: { fontSize: 13, color: color.mutedForeground, lineHeight: 19 },

  card: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.lg,
    ...shadow.card,
  },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, fontSize: 15.5, fontWeight: "800", color: color.foreground },
  date: { fontSize: 11.5, color: color.mutedForeground },
  hint: { fontSize: 11.5, color: color.mutedForeground, marginTop: 6, lineHeight: 17 },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 10 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: color.muted,
  },
  chipOn: { backgroundColor: color.brand },
  chipText: { fontSize: 13, fontWeight: "700", color: color.mutedForeground },

  swap: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  swapText: { fontSize: 12.5, fontWeight: "700", color: color.brand },

  out: {
    fontSize: 24,
    fontWeight: "800",
    color: color.foreground,
    marginTop: 12,
    fontVariant: ["tabular-nums"],
  },
});
