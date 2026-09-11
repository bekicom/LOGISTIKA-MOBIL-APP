/**
 * Telegram e'loni egasini FURAM'ga chaqirish (2026-09-03, web'da bor).
 *
 * ── NIMA BO'LADI ────────────────────────────────────────────────
 *
 * Lentaning bir qismi Telegram guruhlaridan yig'iladi: e'lon bor,
 * egasi esa FURAM'da yo'q. Tugma bosilganda unga SMS taklif ketadi.
 *
 * ⚠️ RAQAM KO'RSATILMAYDI — na so'rovda, na javobda. Butun bo'limning
 * ma'nosi shunda: raqamni bermasdan bog'lanish. Server ham uni
 * qaytarmaydi.
 *
 * ⚠️ XATO MATNI SERVERDAN OLINMAYDI (qoida 3): server faqat KOD
 * yuboradi (`OPTED_OUT`, `ALREADY_USER`, `RECENT`...), matn esa
 * `apiErr.<KOD>` lug'atidan sakkiz tilda chiqadi. Server
 * foydalanuvchining tilini bilmaydi.
 */
import { useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { Button, Notice } from "@/components/ui";
import { api, FuramError } from "@/lib/api";
import { guestBlocked } from "@/lib/guest-gate";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

export function InviteOwner({ loadId }: { loadId: string }) {
  const [busy, setBusy] = useState(false);
  /* ⚠️ «Yuborildi» ALOHIDA belgi bilan (2026-09-11).
     Avval server javobidagi `remaining` («bugun yana N ta») shu
     belgi vazifasini ham bajarardi. Kunlik chegara olib tashlangach
     server u maydonni qaytarmay qo'ydi — o'shanda `remaining`
     `undefined` bo'lib, tugma bosilgandan keyin ekranda HECH NIMA
     o'zgarmas edi va odam «ishlamadi» deb qayta-qayta bosardi. */
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    if (guestBlocked()) return;
    setBusy(true);
    setErr(null);
    try {
      await api<{ ok: true }>(`/api/loads/${loadId}/invite-owner`, {
        method: "POST",
      });
      setSent(true);
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <View style={[s.box, { borderColor: color.success + "55", backgroundColor: color.successSoft }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
          <Icon name="check" size={18} stroke={color.success} />
          <Text style={[s.title, { color: color.success }]}>{t("mob.invOwner.sent")}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.box}>
      <Text style={s.title}>{t("mob.invOwner.btn")}</Text>
      <Text style={s.hint}>{t("mob.invOwner.hint")}</Text>
      <Text style={s.hint}>{t("mob.invOwner.noPhone")}</Text>

      {err ? <Notice tone="danger">{err}</Notice> : null}

      <View style={{ marginTop: space.md }}>
        <Button
          title={t("mob.invOwner.btn")}
          variant="secondary"
          onPress={send}
          loading={busy}
          icon={<Icon name="send" size={17} stroke={color.foreground} />}
        />
      </View>
    </View>
  );
}

const s = themed(() => ({
  box: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
    padding: space.lg,
  },
  title: { fontSize: 14.5, fontWeight: "800", color: color.foreground },
  hint: { fontSize: 12.5, color: color.mutedForeground, marginTop: 6, lineHeight: 18 },
}));
