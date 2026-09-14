/**
 * Telefon davlat kodi tanlagichi — ro'yxatdan o'tish, kirish, parol
 * tiklash (2026-09-14, mijoz TZ).
 *
 * «Ro'yxatdan o'tishga ham MDH va Yevropa davlatlarini ochib qo'yish
 * kerak». Avval uchala ekranda «+998» QOTIB turardi — Belarus yoki
 * Polshadagi haydovchi ilovada umuman ro'yxatdan o'ta olmasdi, webda
 * esa yettita kod bor edi.
 *
 * Ro'yxat webdagi bilan bir xil (`lib/phone-codes.ts`, 6-qoida).
 *
 * Tanlov INDEKS bo'yicha: Rossiya va Qozog'iston ikkalasi ham «+7»,
 * kod bo'yicha saqlansa bayroq doim birinchisiga qaytardi.
 */
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { Sheet } from "@/components/Sheet";
import { PHONE_CODES, isoBayroq } from "@/lib/phone-codes";
import { color, font, radius, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

export function PhoneCodePick({
  index,
  onChange,
}: {
  /** `PHONE_CODES` dagi o'rin */
  index: number;
  onChange: (index: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const joriy = PHONE_CODES[index] ?? PHONE_CODES[0];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t("mob.phoneCode.pick")}
        style={({ pressed }) => [s.cc, pressed && { opacity: 0.8 }]}
      >
        <Text style={s.ccText}>
          {isoBayroq(joriy.iso)} {joriy.code}
        </Text>
      </Pressable>

      <Sheet open={open} onClose={() => setOpen(false)} title={t("mob.phoneCode.pick")}>
        {/* Ro'yxat CHEGARALANGAN — 40 ta qator, ortmaydi: FlatList
            shart emas (4-qoida, `test-lists-mobile.ts` → BOUNDED) */}
        <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 6 }}>
            {PHONE_CODES.map((c, i) => (
              <Pressable
                key={c.iso}
                onPress={() => {
                  onChange(i);
                  setOpen(false);
                }}
                style={[s.row, i === index && s.rowOn]}
              >
                <Text style={s.flag}>{isoBayroq(c.iso)}</Text>
                <Text style={s.code}>{c.code}</Text>
                <Text style={s.iso}>{c.iso}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </Sheet>
    </>
  );
}

const s = themed(() => ({
  cc: {
    minWidth: 92,
    height: 52,
    paddingHorizontal: 10,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  ccText: { fontSize: font.body, fontWeight: "600", color: color.foreground },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
  },
  rowOn: { borderColor: color.brand, backgroundColor: color.brand + "14" },
  flag: { fontSize: 20 },
  code: { fontSize: font.body, fontWeight: "700", color: color.foreground, minWidth: 56 },
  iso: { fontSize: 13, color: color.mutedForeground },
}));
