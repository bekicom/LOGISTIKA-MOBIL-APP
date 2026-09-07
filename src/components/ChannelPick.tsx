/**
 * Kod qayerga kelsin — Telegram yoki SMS.
 *
 * ── NEGA UMUMIY KOMPONENT ───────────────────────────────────────
 *
 * Tanlagich ilgari faqat ro'yxatdan o'tishda edi. Parol tiklashda
 * yo'q edi va server `.env` tartibiga tushardi
 * (`SMS_PROVIDERS="eskiz,telegram"`) — ya'ni kod SMS bilan
 * ketardi. Bitta oqimda ikki xil xatti-harakat: odam ro'yxatdan
 * Telegram bilan o'tib, parolni tiklashda nega SMS kelayotganini
 * tushunmasdi.
 *
 * Ikki joyga ikki nusxa yozilsa, ertaga biri o'zgarib ikkinchisi
 * qolib ketardi — shuning uchun bitta joyda.
 *
 * ── RO'YXAT SERVERDAN ───────────────────────────────────────────
 *
 * Telegram sozlangan-sozlanmagani `.env` da va klient buni bilmaydi
 * (`GET /api/auth/send-code`). Sozlanmagan bo'lsa tanlagich
 * UMUMAN chizilmaydi — bitta variantni tanlatib o'tirish ma'nosiz.
 */
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import Svg, { Path } from "react-native-svg";
import { api } from "@/lib/api";
import { color, font, radius, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

export type Channel = "telegram" | "sms";

/**
 * Mavjud kanallar va standart tanlov.
 *
 * Telegram taklif qilinsa standart o'sha: u arzon va tez yetadi.
 * Ro'yxat kelmasa SMS qolaveradi — kirish ekrani serverning
 * sozlamasi tufayli ochilmay qolmasin.
 */
export function useChannels(): {
  channels: Channel[];
  channel: Channel;
  setChannel: (c: Channel) => void;
} {
  const [channels, setChannels] = useState<Channel[]>(["sms"]);
  const [channel, setChannel] = useState<Channel>("sms");

  useEffect(() => {
    let alive = true;
    api<{ channels: Channel[] }>("/api/auth/send-code", { auth: false })
      .then((r) => {
        if (!alive || !r.channels?.includes("telegram")) return;
        setChannels(r.channels);
        setChannel("telegram");
      })
      .catch(() => {
        /* Ro'yxat kelmasa SMS qolaveradi */
      });
    return () => {
      alive = false;
    };
  }, []);

  return { channels, channel, setChannel };
}

export function ChannelPick({
  channels,
  channel,
  onPick,
}: {
  channels: Channel[];
  channel: Channel;
  onPick: (c: Channel) => void;
}) {
  if (channels.length < 2) return null;

  return (
    <View style={{ marginTop: space.xxl }}>
      <Text style={s.label}>{t("mob.signUp.whereCode")}</Text>
      <View style={s.cards}>
        {(["telegram", "sms"] as const).map((c) => {
          const on = channel === c;
          return (
            <Pressable
              key={c}
              onPress={() => onPick(c)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={[s.channel, on && s.channelOn]}
            >
              <View style={s.channelTop}>
                {c === "telegram" ? (
                  <Svg width={24} height={24} viewBox="0 0 24 24">
                    <Path
                      d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm5.56 8.22-1.86 8.78c-.14.62-.51.77-1.03.48l-2.85-2.1-1.37 1.32c-.15.15-.28.28-.58.28l.2-2.9 5.29-4.78c.23-.2-.05-.32-.36-.12l-6.53 4.11-2.81-.88c-.61-.19-.62-.61.13-.9l10.99-4.24c.51-.18.96.12.78.95z"
                      fill="#229ED9"
                    />
                  </Svg>
                ) : (
                  <Svg width={24} height={24} viewBox="0 0 24 24">
                    <Path
                      d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                      stroke={color.mutedForeground}
                      strokeWidth={1.9}
                      fill="none"
                      strokeLinejoin="round"
                    />
                  </Svg>
                )}
                <View style={[s.radio, on && s.radioOn]}>
                  {on ? (
                    <Svg width={12} height={12} viewBox="0 0 24 24">
                      <Path
                        d="M20 6 9 17l-5-5"
                        stroke="#fff"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </Svg>
                  ) : null}
                </View>
              </View>
              <Text style={s.channelName}>{c === "telegram" ? "Telegram" : "SMS"}</Text>
              <Text style={s.channelNote}>
                {c === "telegram" ? t("mob.signUp.telegramNote") : t("mob.signUp.smsNote")}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Kod QAYERGA ketgani.
 *
 * Telegram tanlangan-u raqamda Telegram bo'lmasa, server kodni SMS
 * bilan yuboradi va javobdagi `via` shuni aytadi. Buni ko'rsatmasak
 * odam Telegramni ochib kutib o'tirardi.
 */
export function SentVia({ via, picked }: { via: Channel | null; picked: Channel }) {
  if (!via) return null;
  if (via === "telegram") {
    return (
      <View style={[s.note, { borderColor: "#229ED955", backgroundColor: "#229ED90d" }]}>
        <Text style={[s.noteText, { color: "#1c7fb0" }]}>{t("mob.signUp.sentTelegram")}</Text>
      </View>
    );
  }
  /* SMS ketgani — faqat Telegram SO'RALGAN bo'lsa aytiladi.
     SMS tanlangan odamga «SMS yubordik» deyish ortiqcha. */
  if (picked !== "telegram") return null;
  return (
    <View style={[s.note, { borderColor: color.warning + "4d", backgroundColor: color.warning + "12" }]}>
      <Text style={[s.noteText, { color: color.warning }]}>{t("mob.signUp.sentSmsFallback")}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "600", color: color.foreground, marginBottom: 10 },
  cards: { flexDirection: "row", gap: 10 },

  channel: {
    flex: 1,
    padding: 14,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
  },
  channelOn: { borderWidth: 2, borderColor: color.brand, backgroundColor: "#f45a180a" },
  channelTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  channelName: { fontSize: font.body, fontWeight: "600", color: color.foreground, marginTop: 10 },
  channelNote: { fontSize: 12, color: color.mutedForeground, marginTop: 2 },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { borderColor: color.brand, backgroundColor: color.brand },

  note: {
    marginTop: space.md,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  noteText: { fontSize: 12, lineHeight: 17 },
});
