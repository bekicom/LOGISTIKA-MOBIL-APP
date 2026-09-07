/**
 * Chekni AI bilan o'qish (TZ 16).
 *
 * ── NEGA TO'LDIRADI, YUBORMAYDI ─────────────────────────────────
 *
 * Model summani yoki sanani xato o'qishi mumkin. Shuning uchun u
 * maydonlarni TO'LDIRADI, xarajatni o'zi saqlamaydi: odam ko'radi,
 * kerak bo'lsa tuzatadi va o'zi saqlaydi. Aks holda skaner
 * foydadan ko'ra zarar bo'lardi.
 *
 * ── ROZILIK SO'RALADI ───────────────────────────────────────────
 *
 * Rasm tashqi xizmatga ketadi. Rozilik bir marta bosiladi va
 * so'rovga `consent=true` bo'lib boradi — server uni ikkinchi
 * marta tekshiradi.
 *
 * ── AI YOPIQ BO'LSA HAM XATO EMAS ───────────────────────────────
 *
 * Server 200 qaytaradi va holatni `state` da aytadi: forma joyida,
 * odam uni qo'lda to'ldiraveradi. Qizil xato chiqarsak, u
 * «xarajat kiritilmadi» deb tushunardi.
 */
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { apiUpload, FuramError } from "@/lib/api";
import { toUpload, type Photo } from "@/lib/photo";
import { color, radius, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

export type ReceiptFields = {
  amount: number | null;
  currency: string | null;
  date: string | null;
  category: string | null;
  merchant: string | null;
};
type Result = { state: string; fields: ReceiptFields; rejected: string[]; message: string | null };

export function ReceiptScan({
  photo,
  onRead,
}: {
  photo: Photo | null;
  onRead: (f: ReceiptFields) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!photo) return null;

  async function scan() {
    if (!photo) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await apiUpload<{ result: Result }>(
        "/api/ai/finance/receipt",
        { consent: "true" },
        [toUpload(photo, "photo")],
      );
      setDone(r.result);
      onRead(r.result.fields);
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const got = Object.entries(done.fields).filter(([, v]) => v != null).length;
    return (
      <View style={[s.box, { borderColor: color.purple + "44", backgroundColor: color.purpleSoft }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon name="sparkle" size={16} stroke={color.purple} />
          <Text style={[s.title, { color: color.purple }]}>
            {got > 0 ? t("mob.receipt.filled", { n: got }) : t("mob.receipt.nothing")}
          </Text>
        </View>
        {done.rejected.length > 0 ? (
          <Text style={s.hint}>
            {t("mob.receipt.checkThese", {
              f: done.rejected.map((k) => t(`mob.receipt.f_${k}`)).join(", "),
            })}
          </Text>
        ) : null}
        <Text style={s.hint}>{t("mob.receipt.fixHint")}</Text>
      </View>
    );
  }

  return (
    <View>
      <Pressable
        onPress={scan}
        disabled={busy}
        style={({ pressed }) => [s.btn, pressed && { backgroundColor: color.muted }]}
      >
        <Icon name="sparkle" size={17} stroke={color.purple} />
        <Text style={s.btnText}>{busy ? t("mob.receipt.reading") : t("mob.receipt.scan")}</Text>
      </Pressable>
      <Text style={s.hint}>{t("mob.receipt.consent")}</Text>
      {err ? <Text style={[s.hint, { color: color.danger }]}>{err}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 46,
    borderRadius: radius.control,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: color.purple + "66",
    backgroundColor: color.card,
  },
  btnText: { fontSize: 13.5, fontWeight: "700", color: color.purple },
  box: { borderRadius: radius.control, borderWidth: 1, padding: space.md },
  title: { fontSize: 13.5, fontWeight: "800" },
  hint: { fontSize: 11.5, color: color.mutedForeground, marginTop: 6, lineHeight: 17 },
});
