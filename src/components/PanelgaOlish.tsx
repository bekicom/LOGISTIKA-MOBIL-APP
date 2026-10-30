/**
 * «Panelimga olish» (TZ 29-okt §11.1) — yuklar lentasida va yuk sahifasida,
 * Telegram/WhatsApp'dan kelgan yukda ham. Faqat dispetcherga chiziladi
 * (qaror serverda: `/api/loads/[id]` → `panel`, lenta uchun `/api/panel/olish`).
 *
 * Webdagi `components/panelga-olish.tsx` bilan bir xil: bosilganda
 * «Panelingizga qo'shildi», qayta bosilsa paneldan olinadi.
 */
import { useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/Text";
import { Tap } from "@/components/Tap";
import { api, type FuramError } from "@/lib/api";
import { color, radius, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

export function PanelgaOlish({
  loadId,
  initial = false,
  onChange,
}: {
  loadId: string;
  initial?: boolean;
  onChange?: (bor: boolean) => void;
}) {
  const [bor, setBor] = useState(initial);
  const [band, setBand] = useState(false);
  const [xabar, setXabar] = useState<{ matn: string; ok: boolean } | null>(null);

  async function bos() {
    if (band) return;
    setBand(true);
    setXabar(null);
    try {
      await api("/api/panel/olish", { method: bor ? "DELETE" : "POST", body: { loadId } });
      const yangi = !bor;
      setBor(yangi);
      onChange?.(yangi);
      setXabar({ matn: t(yangi ? "tz5e.panelgaQoshildi" : "tz5e.paneldanOlindi"), ok: true });
    } catch (e) {
      setXabar({ matn: (e as FuramError).message ?? t("tz5e.panelXato"), ok: false });
    } finally {
      setBand(false);
      setTimeout(() => setXabar(null), 2500);
    }
  }

  return (
    <View style={s.wrap}>
      <Tap
        onPress={() => void bos()}
        disabled={band}
        accessibilityRole="button"
        selected={bor}
        feel="action"
        style={[s.btn, bor ? s.btnOn : s.btnOff, band && { opacity: 0.6 }]}
      >
        <Text style={[s.txt, { color: bor ? color.success : color.brand }]}>
          {bor ? `✓ ${t("tz5e.paneldaBor")}` : `+ ${t("tz5e.panelgaOlish")}`}
        </Text>
      </Tap>
      {xabar ? <Text style={[s.xabar, { color: xabar.ok ? color.success : color.danger }]}>{xabar.matn}</Text> : null}
    </View>
  );
}

const s = themed(() => ({
  wrap: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  btn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.control, borderWidth: 1 },
  btnOn: { borderColor: color.success, backgroundColor: color.successSoft },
  btnOff: { borderColor: color.brand, backgroundColor: color.card },
  txt: { fontSize: 13, fontWeight: "700" },
  xabar: { fontSize: 12, fontWeight: "600" },
}));
