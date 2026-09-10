/**
 * Haydovchi taklif havolasi.
 *
 * ── NEGA FURAM ID EMAS ──────────────────────────────────────────
 *
 * Haydovchidan «FURAM ID ingni ayt» deb so'rash — u profilini ochib,
 * raqamni topib, to'g'ri o'qib berishini kutish degani. Havola esa
 * bitta xabar: ochadi, kirib, o'sha o'ringa qo'shiladi.
 *
 * Server tayyor XABAR MATNINI ham qaytaradi (`message`) — unda
 * mashina raqami va egasining ismi bor, ya'ni haydovchi havola
 * kimdan kelganini biladi.
 *
 * ── NEGA ALOHIDA FAYL ───────────────────────────────────────────
 *
 * Ilgari u `parkim/[id]` ekranining ichida edi. Reys ochishda ham
 * aynan shu kerak bo'lib qoldi: haydovchisiz mashina tanlansa,
 * o'sha yerda taklif havolasi taklif qilinadi. Ikkinchi nusxa
 * yozilsa, muddat yoki tarif to'sig'i bir joyda o'zgarib,
 * ikkinchisida eskiligicha qolardi.
 */
import { useState } from "react";
import { Pressable, Share, View } from "react-native";
import { Text } from "@/components/Text";
import * as Clipboard from "expo-clipboard";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui";
import { api, FuramError } from "@/lib/api";
import { tariffBlocked } from "@/lib/features";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

export function DriverInvite({
  vehicleId,
  seat = "MAIN",
}: {
  vehicleId: string;
  /** Qaysi o'ringa: asosiy haydovchi yoki sherik */
  seat?: "MAIN" | "CO";
}) {
  const [link, setLink] = useState<{ url: string; message: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function create() {
    /* Qoida 5: to'siq OLDINDAN. Taklif havolasi «Haydovchilarni
       boshqarish» tarifiga kiradi — havola yasalmasdan aytiladi. */
    if (tariffBlocked("drivers")) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ url: string; message: string; expiresAt: string }>(
        "/api/driver-invites",
        { method: "POST", body: { vehicleId, seat } },
      );
      setLink(r);
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  if (!link) {
    return (
      <View style={{ marginTop: space.sm }}>
        <Pressable
          onPress={create}
          disabled={busy}
          style={({ pressed }) => [s.invite, pressed && { backgroundColor: color.muted }]}
        >
          <Icon name="paperclip" size={17} stroke={color.brand} />
          <Text style={s.inviteText}>{busy ? t("mob.common.saving") : t("mob.dinv.create")}</Text>
        </Pressable>
        {err ? <Text style={s.inviteErr}>{err}</Text> : null}
      </View>
    );
  }

  return (
    <View style={s.inviteBox}>
      <Text style={s.inviteTitle}>{t("mob.dinv.title")}</Text>
      <Text style={s.inviteLead}>{t("mob.dinv.lead")}</Text>
      <Text style={s.inviteUrl} numberOfLines={2}>
        {link.url}
      </Text>
      <Text style={s.inviteMeta}>{t("mob.dinv.expires", { date: link.expiresAt.slice(0, 10) })}</Text>
      <View style={{ flexDirection: "row", gap: 9, marginTop: space.md }}>
        <View style={{ flex: 1 }}>
          <Button
            title={copied ? t("mob.dinv.copied") : t("mob.dinv.copy")}
            variant="secondary"
            onPress={async () => {
              await Clipboard.setStringAsync(link.url);
              setCopied(true);
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title={t("mob.dinv.share")}
            onPress={() => void Share.share({ message: link.message })}
          />
        </View>
      </View>
    </View>
  );
}

const s = themed(() => ({
  invite: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    height: 46, borderRadius: radius.control,
    borderWidth: 1, borderStyle: "dashed", borderColor: color.brand + "66",
    backgroundColor: color.card,
  },
  inviteText: { fontSize: 13.5, fontWeight: "700", color: color.brand },
  inviteErr: { fontSize: 12, color: color.danger, marginTop: 6, textAlign: "center" },
  inviteBox: {
    marginTop: space.sm, backgroundColor: color.card, borderRadius: radius.card,
    padding: space.lg, borderWidth: 1, borderColor: color.brand + "44",
  },
  inviteTitle: { fontSize: 13.5, fontWeight: "800", color: color.foreground },
  inviteLead: { fontSize: 12, color: color.mutedForeground, marginTop: 5, lineHeight: 18 },
  inviteUrl: { fontSize: 12.5, color: color.blue, marginTop: 10 },
  inviteMeta: { fontSize: 11.5, color: color.mutedForeground, marginTop: 5 },
}));
