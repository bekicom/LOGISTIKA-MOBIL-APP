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
 *
 * ── HAMMA DAVLAT VA QIDIRUV (TZ v2, Audit 2, 2026-10-24) ──────────
 *
 * 226 davlat — aylantirib topib bo'lmaydi: tepada qidiruv (ISO, kod
 * yoki nom). Ro'yxat endi `FlatList` (4-qoida). Boshlang'ich kod —
 * telefon vaqt mintaqasidan (`boshlangichKod`): Xitoydagi odamga +86.
 */
import { useMemo, useState } from "react";
import { FlatList, Pressable, TextInput, View } from "react-native";
import { getCalendars, getLocales } from "expo-localization";
import { Text } from "@/components/Text";
import { Sheet } from "@/components/Sheet";
import { PHONE_CODES, isoBayroq, kodQidir, taxminiyKod } from "@/lib/phone-codes";
import { color, font, radius, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

/**
 * Odam turgan davlatning kodi (indeks) — `useState(boshlangichKod)`.
 * Vaqt mintaqasi bo'lmasa til hududi, u ham bo'lmasa O'zbekiston.
 */
export function boshlangichKod(): number {
  try {
    const kod = taxminiyKod(getCalendars()[0]?.timeZone, getLocales()[0]?.languageTag);
    return Math.max(0, PHONE_CODES.indexOf(kod));
  } catch {
    return 0;
  }
}

export function PhoneCodePick({
  index,
  onChange,
}: {
  /** `PHONE_CODES` dagi o'rin */
  index: number;
  onChange: (index: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const joriy = PHONE_CODES[index] ?? PHONE_CODES[0];
  const royxat = useMemo(() => kodQidir(q), [q]);

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

      <Sheet
        open={open}
        onClose={() => {
          setOpen(false);
          setQ("");
        }}
        title={t("mob.phoneCode.pick")}
      >
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t("mob.phoneCode.search")}
          placeholderTextColor={color.mutedForeground}
          autoCorrect={false}
          autoCapitalize="none"
          style={s.search}
        />
        <FlatList
          data={royxat}
          keyExtractor={(c) => c.iso}
          style={{ maxHeight: 380 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
          renderItem={({ item: c }) => {
            const i = PHONE_CODES.indexOf(c);
            return (
              <Pressable
                onPress={() => {
                  onChange(i);
                  setOpen(false);
                  setQ("");
                }}
                style={[s.row, i === index && s.rowOn]}
              >
                <Text style={s.flag}>{isoBayroq(c.iso)}</Text>
                <Text style={s.code}>{c.code}</Text>
                <Text style={s.iso}>{c.iso}</Text>
              </Pressable>
            );
          }}
        />
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
  search: {
    height: 44,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    fontSize: font.body,
    color: color.foreground,
  },
}));
