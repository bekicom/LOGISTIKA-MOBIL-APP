/**
 * Rol almashtirgich — «Dispetcher ▾» (TZ v2 §2.2, 2026-10-24).
 *
 * «Mening ishim» tepasida. Bosilganda odamning O'Z rollari chiqadi;
 * tanlangani serverga yoziladi (`/api/roles/faol`) va bosh sahifa
 * shu rol paneli bilan qayta yuklanadi. Tanlov serverda — webda ham
 * o'sha rol ko'rinadi (`furam/src/components/rol-almashtirgich.tsx`).
 *
 * Eski server maydonni yubormasa (`faol` yo'q) — chizilmaydi.
 */
import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { Tap } from "@/components/Tap";
import { Sheet } from "@/components/Sheet";
import { api } from "@/lib/api";
import { color, radius, themed } from "@/lib/theme";
import { roleLabel, t } from "@/lib/i18n";

export function RolAlmashtirgich({
  faol,
  rollar,
  onOzgardi,
}: {
  faol?: string;
  rollar?: string[];
  onOzgardi: () => void;
}) {
  const router = useRouter();
  const [ochiq, setOchiq] = useState(false);
  const [band, setBand] = useState(false);
  if (!faol || !rollar) return null;

  async function tanla(rol: string) {
    setOchiq(false);
    if (rol === faol) return;
    setBand(true);
    try {
      await api("/api/roles/faol", { method: "POST", body: { rol } });
      onOzgardi();
    } catch {
      /* Tarmoq yo'q — eski rol qoladi, keyingi ochilishda qayta urinadi */
    } finally {
      setBand(false);
    }
  }

  return (
    <>
      <Tap
        onPress={() => setOchiq(true)}
        disabled={band}
        feel="select"
        accessibilityRole="button"
        accessibilityLabel={`${t("nav5.myWork")}: ${roleLabel(faol)}`}
        style={s.chip}
      >
        <Text style={s.chipText}>{roleLabel(faol)}</Text>
        <View style={{ transform: [{ rotate: "90deg" }] }}>
          <Icon name="chevron" size={14} stroke={color.brand} />
        </View>
      </Tap>

      <Sheet open={ochiq} onClose={() => setOchiq(false)} title={t("nav5.myWork")}>
        <View style={s.list}>
          {rollar.map((r) => (
            <Tap key={r} onPress={() => void tanla(r)} feel="select" style={[s.row, r === faol && s.rowOn]}>
              <Text style={[s.rowText, r === faol && s.rowTextOn]}>{roleLabel(r)}</Text>
              {r === faol ? <Icon name="check" size={18} stroke={color.brand} /> : null}
            </Tap>
          ))}
          <Tap
            onPress={() => {
              setOchiq(false);
              router.push("/rollarim");
            }}
            feel="select"
            style={s.row}
          >
            <Text style={s.add}>+ {t("nav5.addRole")}</Text>
          </Tap>
        </View>
      </Sheet>
    </>
  );
}

const s = themed(() => ({
  chip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    alignSelf: "flex-start" as const,
    gap: 4,
    paddingHorizontal: 12,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: color.brandSoft,
  },
  chipText: { fontSize: 13, fontFamily: "Manrope_700Bold", color: color.brand },
  list: { gap: 6, paddingBottom: 8 },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: radius.control,
    backgroundColor: color.card,
  },
  rowOn: { backgroundColor: color.brandSoft },
  rowText: { fontSize: 15, fontFamily: "Manrope_600SemiBold", color: color.foreground },
  rowTextOn: { color: color.brand },
  add: { fontSize: 15, fontFamily: "Manrope_700Bold", color: color.brand },
}));
