/**
 * Bozor filtri — marka, Evro standarti, joy, yil, narx (TZ v2 §7, 2026-10-27).
 *
 * Webdagi `/market` filtr qatorining o'zi. Tanlovlar serverdan (`facets`):
 * faqat faol e'lonlarda bor marka va joylar — bo'sh natija beradigan
 * tanlov yo'q. Ro'yxatlar CHEGARALANGAN (marka ≤ 40, joy ≤ 60, Evro 5).
 */
import { useEffect, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { Text } from "@/components/Text";
import { Tap } from "@/components/Tap";
import { Sheet } from "@/components/Sheet";
import { Button } from "@/components/ui";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

/** Server bilan bir xil (`furam/src/lib/sale.ts:EURO_STANDARTLAR`) */
const EURO = ["Euro 2", "Euro 3", "Euro 4", "Euro 5", "Euro 6"] as const;

export type BozorFiltrQiymat = { brand?: string; euro?: string; loc?: number; yearFrom?: string; priceTo?: string };

export function BozorFiltr({
  open,
  onClose,
  brands,
  joylar,
  qiymat,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  brands: string[];
  joylar: { id: number; nomi: string }[];
  qiymat: BozorFiltrQiymat;
  onChange: (v: BozorFiltrQiymat) => void;
}) {
  const [v, setV] = useState<BozorFiltrQiymat>(qiymat);
  useEffect(() => {
    if (open) setV(qiymat);
  }, [open, qiymat]);

  const chip = (on: boolean, label: string, onPress: () => void, key: string) => (
    <Tap key={key} onPress={onPress} feel="select" style={[s.chip, on && s.chipOn]}>
      <Text style={[s.chipText, on && { color: "#ffffff" }]}>{label}</Text>
    </Tap>
  );

  return (
    <Sheet open={open} onClose={onClose} title={t("saleCatalog.fApply")}>
      <ScrollView style={{ maxHeight: 460 }} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>{t("saleCatalog.fBrand")}</Text>
        <View style={s.chips}>
          {brands.map((b) => chip(v.brand === b, b, () => setV((x) => ({ ...x, brand: x.brand === b ? undefined : b })), b))}
        </View>
        <Text style={s.label}>{t("saleCatalog.fEuro")}</Text>
        <View style={s.chips}>
          {EURO.map((e) => chip(v.euro === e, e, () => setV((x) => ({ ...x, euro: x.euro === e ? undefined : e })), e))}
        </View>
        <Text style={s.label}>{t("saleCatalog.fLoc")}</Text>
        <View style={s.chips}>
          {joylar.map((j) => chip(v.loc === j.id, j.nomi, () => setV((x) => ({ ...x, loc: x.loc === j.id ? undefined : j.id })), String(j.id)))}
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: space.sm }}>
          <TextInput
            value={v.yearFrom ?? ""}
            onChangeText={(x) => setV((y) => ({ ...y, yearFrom: x.replace(/\D/g, "").slice(0, 4) || undefined }))}
            placeholder={t("saleCatalog.fYear")}
            placeholderTextColor={color.faintText}
            keyboardType="number-pad"
            style={s.input}
          />
          <TextInput
            value={v.priceTo ?? ""}
            onChangeText={(x) => setV((y) => ({ ...y, priceTo: x.replace(/\D/g, "") || undefined }))}
            placeholder={`${t("saleCatalog.fPriceTo")}, USD`}
            placeholderTextColor={color.faintText}
            keyboardType="number-pad"
            style={s.input}
          />
        </View>
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 8, marginTop: space.md }}>
        <View style={{ flex: 1 }}>
          <Button title="×" variant="secondary" onPress={() => onChange({})} />
        </View>
        <View style={{ flex: 2 }}>
          <Button title={t("saleCatalog.fApply")} onPress={() => onChange(v)} />
        </View>
      </View>
    </Sheet>
  );
}

const s = themed(() => ({
  label: { fontSize: 12, fontFamily: "Manrope_700Bold", color: color.mutedForeground, marginTop: space.sm, marginBottom: 6 },
  chips: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: color.border },
  chipOn: { backgroundColor: color.brand, borderColor: color.brand },
  chipText: { fontSize: 13, color: color.foreground },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: color.foreground,
  },
}));
