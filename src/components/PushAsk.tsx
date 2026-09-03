/**
 * Push ruxsatini so'rashdan OLDINGI tushuntirish (TZ §7.2).
 *
 * NEGA TIZIM OYNASI TO'G'RIDAN-TO'G'RI CHIQARILMAYDI: iOS'da u bir
 * marta chiqadi. Rad etilsa, ikkinchi marta so'rab bo'lmaydi — odam
 * Sozlamalarga kirib qo'lda yoqishi kerak. Ya'ni bitta urinish bor,
 * va uni «nima uchun» degan javobsiz sarflash — yo'qotish.
 *
 * Shuning uchun avval o'zimizning oyna: nimalar keladi, nega kerak.
 * «Keyinroq» bosilsa tizim oynasi UMUMAN chiqmaydi — urinish saqlanib
 * qoladi va odam keyin Profil > Bildirishnoma bo'limidan yoqadi.
 *
 * Ildizda bitta joyda turadi, ekranlar `notePushMoment()` chaqiradi.
 */
import { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "./Icon";
import { Button } from "./ui";
import { markPushAsked, onPushMoment, registerPush, shouldAskPush } from "@/lib/push";
import { color, font, radius, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

/** Nima keladi — misollar. Quruq «ruxsat bering» dan ko'ra aniqroq. */
const LINES = ["msg", "trip", "deal", "doc"] as const;

export function PushAsk() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const insets = useSafeAreaInsets();

  const trigger = useCallback(() => {
    void (async () => {
      if (await shouldAskPush()) setOpen(true);
    })();
  }, []);

  useEffect(() => onPushMoment(trigger), [trigger]);

  async function allow() {
    setBusy(true);
    /* Belgi OLDIN qo'yiladi: tizim oynasi chiqqan payt — urinish
       sarflangan payt. Ruxsat berilgan-berilmagani muhim emas. */
    await markPushAsked();
    await registerPush();
    setBusy(false);
    setOpen(false);
  }

  async function later() {
    await markPushAsked();
    setOpen(false);
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={later}>
      <View style={s.back}>
        <View style={[s.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <View style={s.icon}>
            <Icon name="bell" size={26} stroke={color.brand} />
          </View>

          <Text style={s.title}>{t("mob.push.askTitle")}</Text>
          <Text style={s.sub}>{t("mob.push.askSub")}</Text>

          <View style={s.list}>
            {LINES.map((k) => (
              <View key={k} style={s.line}>
                <View style={s.dot} />
                <Text style={s.lineText}>{t(`mob.push.ask_${k}`)}</Text>
              </View>
            ))}
          </View>

          <Text style={s.note}>{t("mob.push.askNote")}</Text>

          <View style={s.actions}>
            <Button title={t("mob.push.allow")} onPress={allow} loading={busy} />
            <Pressable onPress={later} style={s.later} disabled={busy}>
              <Text style={s.laterText}>{t("mob.push.later")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  back: { flex: 1, backgroundColor: "#0f172acc", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: color.background,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: space.lg,
    gap: space.md,
  },

  icon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: color.brand + "1a",
    alignItems: "center", justifyContent: "center",
  },

  title: { fontSize: font.titleLg, fontWeight: "700", color: color.foreground },
  sub: { fontSize: font.body, color: color.mutedForeground, lineHeight: 21 },

  list: { gap: 10, marginTop: 2 },
  line: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.brand, marginTop: 7 },
  lineText: { flex: 1, fontSize: font.body, color: color.foreground, lineHeight: 21 },

  note: { fontSize: 12, color: color.mutedForeground, lineHeight: 18 },

  actions: { gap: space.xs, marginTop: space.xs },
  later: { alignItems: "center", paddingVertical: space.md },
  laterText: { fontSize: font.body, color: color.mutedForeground, fontWeight: "600" },
});
