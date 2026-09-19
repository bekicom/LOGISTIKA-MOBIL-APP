/**
 * «O'zim haydayman» — mashina egasi o'z mashinasining haydovchisi
 * (TZ-07, 2026-09-19). Webdagi `furam/src/components/ozim-haydayman.tsx`
 * juftligi.
 *
 * Mijoz: «Qayerda haydovchi tanlash tugmasi bo'lsa, transport egasiga
 * "o'zim haydayman" tugmasi chiqadi — avtomatik o'zining haydovchilik
 * ma'lumotlarini kiritadi». Ism va telefon PROFILDAN olinadi, forma yo'q
 * (`furam/src/lib/ozim-haydovchi.ts`).
 *
 * NEGA KERAK: reys haydovchisiz ochilmaydi (`NO_DRIVER`), jonli bazada esa
 * 22 mashinadan 20 tasida haydovchi yo'q edi — egasi «Bu yukni olaman» ni
 * bosib, o'zini qo'lda «haydovchi» qilib kiritish kerakligini ko'rib
 * to'xtab qolardi.
 *
 * Telefon yo'q bo'lsa (Google bilan kirgan) server `PHONE_REQUIRED`
 * qaytaradi va `api.ts` telefon ekranini O'ZI ochadi.
 */
import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { api, FuramError } from "@/lib/api";
import { tariffBlocked } from "@/lib/features";
import { color, radius, themed } from "@/lib/theme";
import { t, tOr } from "@/lib/i18n";

export function OzimHaydayman({
  vehicleId,
  ajrat = false,
  onDone,
}: {
  /** Shu mashinaga ASOSIY haydovchi qilib qo'yiladi */
  vehicleId: string;
  /** «O'zim haydamayman» — biriktirish olinadi, yozuv tarix uchun qoladi */
  ajrat?: boolean;
  onDone: () => void;
}) {
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  async function bos() {
    /* 5-qoida: to'siq OLDINDAN — server `drivers` darvozasi bilan bir xil.
       Alohida haydovchi tarifi so'ralmaydi (transport tarifi uni o'z ichiga oladi) */
    if (tariffBlocked("drivers")) return;
    setBand(true);
    setXato(null);
    try {
      /* Usul ATAYLAB literal: `test-smoke-mobile.ts` ilova kodidagi yo'llarni
         yig'ib GET bilan tekshiradi va usulni shu ko'rinishda taniydi */
      if (ajrat) await api("/api/fleet/drivers/self", { method: "DELETE", body: { vehicleId } });
      else await api("/api/fleet/drivers/self", { method: "POST", body: { vehicleId } });
      onDone();
    } catch (e) {
      const fe = e as FuramError;
      /* Kod bo'yicha LUG'ATDAN — web bilan bir xil matn (`pgFleet.ozimXato`) */
      setXato(tOr(`pgFleet.ozimXato.${fe.code}`, fe.message || t("mob.common.failed")));
    } finally {
      setBand(false);
    }
  }

  return (
    <View style={s.wrap}>
      <Pressable
        onPress={() => void bos()}
        disabled={band}
        accessibilityRole="button"
        style={({ pressed }) => [ajrat ? s.ghost : s.btn, pressed && { opacity: 0.85 }, band && { opacity: 0.6 }]}
      >
        {band ? (
          <ActivityIndicator size="small" color={ajrat ? color.mutedForeground : "#ffffff"} />
        ) : (
          <Icon name="user" size={16} stroke={ajrat ? color.mutedForeground : "#ffffff"} />
        )}
        <Text style={ajrat ? s.ghostText : s.btnText}>
          {ajrat ? t("pgFleet.ozimHaydamayman") : t("pgFleet.ozimHaydayman")}
        </Text>
      </Pressable>
      {xato ? <Text style={s.err}>{xato}</Text> : null}
    </View>
  );
}

const s = themed(() => ({
  wrap: { gap: 6, alignItems: "flex-start" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    backgroundColor: color.brand,
  },
  btnText: { fontSize: 13.5, fontWeight: "700", color: "#ffffff" },
  ghost: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
  },
  ghostText: { fontSize: 12.5, fontWeight: "600", color: color.mutedForeground },
  err: { fontSize: 12, lineHeight: 17, color: color.danger },
}));
