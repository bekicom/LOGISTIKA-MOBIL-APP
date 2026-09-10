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
 * ── FILTRSIZ SAQLASH TO'SILADI ──────────────────────────────────
 *
 * Bo'sh qidiruv HAR e'longa mos keladi: odam kuniga o'nlab xabar
 * olib, bildirishnomalarni umuman ochmay qo'yardi. Shart serverda
 * ham tekshiriladi (`BOSH_QIDIRUV`); bu yerdagisi faqat odamga
 * DARROV aytish uchun — tugma bosilgach xato ko'rsatgandan ko'ra,
 * oldindan o'chirilgan turgani yaxshi (5-qoida ruhida).
 *
 * ── XATO MATNI SERVERDAN OLINMAYDI ──────────────────────────────
 *
 * Chegara ham (20 ta), bo'sh filtr ham kod bilan keladi
 * (`apiErr.CHEGARA`, `apiErr.BOSH_QIDIRUV`) — 3-qoida.
 */
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { api, FuramError } from "@/lib/api";
import { guestBlocked } from "@/lib/guest-gate";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";
import type { Filtr } from "@/components/FiltrSheet";

/** Serverdagi `paramsSchema` kutgan ko'rinish */
export function filtrToParams(f: Filtr): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  if (f.fromId) p.fromId = [f.fromId];
  if (f.toId) p.toId = [f.toId];
  if (f.vehicleTypeIds.length) p.vehicleTypeId = f.vehicleTypeIds;
  return p;
}

export function SaveSearch({ kind, filtr }: { kind: "load" | "truck"; filtr: Filtr }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "ok">("idle");
  const [err, setErr] = useState<string | null>(null);

  const params = filtrToParams(filtr);
  const empty = Object.keys(params).length === 0;

  async function save() {
    if (guestBlocked()) return;
    setState("busy");
    setErr(null);
    try {
      await api("/api/saved-search", { method: "POST", body: { action: "save", kind, params } });
      setState("ok");
    } catch (e) {
      setState("idle");
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    }
  }

  return (
    <View style={{ gap: 6 }}>
      <View style={s.row}>
        <Pressable
          onPress={save}
          disabled={empty || state !== "idle"}
          style={({ pressed }) => [
            s.btn,
            (empty || state === "busy") && { opacity: 0.5 },
            pressed && { backgroundColor: color.muted },
          ]}
        >
          <Icon
            name={state === "ok" ? "check" : "heart"}
            size={16}
            stroke={state === "ok" ? color.success : color.brand}
          />
          <Text style={[s.btnText, state === "ok" && { color: color.success }]}>
            {state === "ok"
              ? t("mob.ssearch.saved")
              : state === "busy"
                ? t("mob.common.saving")
                : t("mob.ssearch.save")}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.push("/saqlangan-qidiruv")} hitSlop={8}>
          <Text style={s.link}>{t("mob.ssearch.mine")}</Text>
        </Pressable>
      </View>

      {/* Nega o'chirilgan — aytilmasa odam tugmani bosib ko'rardi */}
      {empty ? <Text style={s.hint}>{t("mob.ssearch.needFilter")}</Text> : null}
      {err ? <Text style={s.err}>{err}</Text> : null}
    </View>
  );
}

const s = themed(() => ({
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    height: 38,
    paddingHorizontal: 13,
    borderRadius: radius.control,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: color.brand + "66",
    backgroundColor: color.card,
  },
  btnText: { fontSize: 12.5, fontWeight: "700", color: color.brand },
  link: { fontSize: 12.5, fontWeight: "700", color: color.mutedForeground },
  hint: { fontSize: 11.5, color: color.mutedForeground },
  err: { fontSize: 11.5, color: color.danger },
}));
