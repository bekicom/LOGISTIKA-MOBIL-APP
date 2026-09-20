/**
 * «Qidiruvni saqlash» — yangi e'lon chiqqanda xabar keladi.
 *
 * ── NEGA KERAK ──────────────────────────────────────────────────
 *
 * 2026-09-10 da lenta bir necha barobar kattalashdi: raqamsiz
 * Telegram e'lonlari ham saqlanadigan bo'ldi (108 237 ta yuk shu
 * sababdan tashlangan edi). Katta lentani har kuni varaqlab
 * chiqish qiyin — odam bir marta «Toshkent → Moskva, tent»
 * deydi va yangisi chiqqanda xabar oladi.
 *
 * ── DOIM KO'RINADI, BO'SH FILTRDA O'CHIQ (TZ-03, 2026-09-19) ────
 *
 * Mijoz: «qidiruvni saqlash murakkab bo'lib qolibdi — ko'pchilik
 * tushunmayapti». Sabablaridan biri: tugma filtr tanlanmaguncha
 * UMUMAN yo'q edi — odam uning borligini bilmasdi. Endi filtr
 * qatorida doim turadi, bo'sh filtrda o'chiq va nega o'chiqligi
 * yozilgan. Bo'sh qidiruv HAR e'longa mos kelardi (server ham
 * `BOSH_QIDIRUV` bilan rad etadi).
 *
 * Saqlangach natija DARHOL ko'rinadi: yorliq tepadagi «Mening
 * qidiruvlarim» qatoriga tushadi (`onSaved`) va tugma o'rnida «✓
 * Saqlandi — tepada yorliq bo'lib turibdi». Takror saqlash (`EXISTS`)
 * xato emas — «allaqachon saqlangan». Lenta allaqachon saqlangan
 * qidiruvni ko'rsatib turgan bo'lsa (`saqlangan`) — tugma o'rnida shu
 * gap, bosib ko'rish shart emas.
 *
 * ── XATO MATNI SERVERDAN OLINMAYDI ──────────────────────────────
 *
 * Chegara ham (20 ta), bo'sh filtr ham kod bilan keladi
 * (`apiErr.CHEGARA`, `apiErr.BOSH_QIDIRUV`) — 3-qoida.
 */
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { api, FuramError } from "@/lib/api";
import { guestBlocked } from "@/lib/guest-gate";
import { filtrdanParams } from "@/lib/saqlangan-qidiruv";
import { color, radius, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";
import type { Filtr } from "@/components/FiltrSheet";

export function SaveSearch({
  kind,
  filtr,
  saqlangan = false,
  onSaved,
}: {
  kind: "load" | "truck";
  filtr: Filtr;
  /** Hozirgi lenta — saqlangan yorliqlardan biri (`faolId`) */
  saqlangan?: boolean;
  /** Saqlandi — yorliqlar qatori yangilansin */
  onSaved?: () => void;
}) {
  const [state, setState] = useState<"idle" | "busy" | "ok" | "exists">("idle");
  const [err, setErr] = useState<string | null>(null);

  const params = filtrdanParams(filtr);
  const empty = Object.keys(params).length === 0;

  async function save() {
    if (guestBlocked()) return;
    setState("busy");
    setErr(null);
    try {
      await api("/api/saved-search", { method: "POST", body: { action: "save", kind, params } });
      setState("ok");
      onSaved?.();
    } catch (e) {
      const fe = e as FuramError;
      if (fe.code === "EXISTS") {
        setState("exists");
        return;
      }
      setState("idle");
      setErr(fe.message ?? t("mob.common.failed"));
    }
  }

  if (state === "ok" || state === "exists" || saqlangan) {
    return (
      <Text style={s.done}>{state === "ok" ? t("saveSearch.savedTop") : t("saveSearch.exists")}</Text>
    );
  }

  return (
    <View style={s.row}>
      <Pressable
        onPress={save}
        disabled={empty || state !== "idle"}
        accessibilityRole="button"
        accessibilityState={{ disabled: empty || state !== "idle" }}
        style={({ pressed }) => [s.btn, (empty || state === "busy") && { opacity: 0.5 }, pressed && { backgroundColor: color.muted }]}
      >
        <Text style={s.btnText}>{state === "busy" ? t("saveSearch.saving") : t("saveSearch.save")}</Text>
      </Pressable>
      {/* Nega o'chirilgan — aytilmasa odam tugmani bosib ko'rardi. Qatorlar
          cheklanmaydi: kesilgan izoh («…yoki tur ...») hech narsani aytmaydi */}
      <Text style={[s.hint, err && { color: color.danger }]}>
        {err ?? (empty ? t("saveSearch.needFilter") : t("saveSearch.hint"))}
      </Text>
    </View>
  );
}

const s = themed(() => ({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  btn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radius.control,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: color.brand + "66",
    backgroundColor: color.card,
    justifyContent: "center",
  },
  btnText: { fontSize: 12.5, fontWeight: "700", color: color.brandText },
  hint: { flex: 1, fontSize: 11.5, lineHeight: 15, color: color.mutedForeground },
  done: { fontSize: 12.5, fontWeight: "700", color: color.successText },
}));
