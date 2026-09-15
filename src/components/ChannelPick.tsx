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
import { ActivityIndicator, Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import Svg, { Path } from "react-native-svg";
import { api } from "@/lib/api";
import { color, font, radius, space, themed, themeName } from "@/lib/theme";
import { AppleLogo, GoogleG, type useSocialSignIn } from "@/components/SocialButtons";
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
  social,
}: {
  channels: Channel[];
  channel: Channel;
  onPick: (c: Channel) => void;
  /**
   * Google/Apple bilan ro'yxat — SHU QATORDA, webdagi kabi
   * («Telegram | SMS | Google», 2026-09-15). Faqat ro'yxat ekrani
   * beradi: parolni tiklash telefon hisobi uchun va u yerda bu ma'nosiz.
   */
  social?: ReturnType<typeof useSocialSignIn>;
}) {
  const google = !!social?.google;
  const apple = !!social?.apple;
  /* Webdagi shart: Telegram yo'q, lekin Google bor bo'lsa ham qator
     chiziladi — aks holda Google variantini ko'rsatadigan joy qolmasdi */
  if (channels.length < 2 && !google && !apple) return null;
  /* Uch-to'rt kartochkada izoh sig'maydi — ixcham ko'rinish */
  const ixcham = google || apple;

  return (
    <View style={{ marginTop: space.xxl }}>
      <Text style={s.label}>{ixcham ? t("googleAuth.methodTitle") : t("mob.signUp.whereCode")}</Text>
      <View style={s.cards}>
        {/* Tartib qat'iy — Telegram, keyin SMS (webdagi kabi); serverdan
            kelgan ro'yxat tartibiga bog'lanmaydi */}
        {(["telegram", "sms"] as const).filter((c) => channels.includes(c)).map((c) => {
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
              <Text style={s.channelName} numberOfLines={1}>
                {c === "telegram" ? "Telegram" : "SMS"}
              </Text>
              {ixcham ? null : (
                <Text style={s.channelNote}>
                  {c === "telegram" ? t("mob.signUp.telegramNote") : t("mob.signUp.smsNote")}
                </Text>
              )}
            </Pressable>
          );
        })}

        {google ? (
          /* Google — tanlov EMAS, darrov oqimni boshlaydi (webda ham
             bu bo'lak havola) */
          <Pressable
            onPress={() => void social!.run("google")}
            disabled={!!social!.busy}
            accessibilityRole="button"
            accessibilityLabel={t("mob.social.google")}
            style={({ pressed }) => [s.channel, pressed && s.pressed]}
          >
            <View style={s.channelTop}>
              {social!.busy === "google" ? <ActivityIndicator size="small" /> : <GoogleG size={22} />}
            </View>
            <Text style={s.channelName} numberOfLines={1}>
              {t("googleAuth.optGoogle")}
            </Text>
          </Pressable>
        ) : null}

        {apple ? (
          /* Apple — FAQAT BELGILI tugma, qora fonda: tor joyda Apple
             dizayn qoidasi shunga ruxsat beradi. 4.8-qoida uni Google'dan
             kichik qilishni taqiqlaydi — kartochka o'lchami bir xil. */
          <Pressable
            onPress={() => void social!.run("apple")}
            disabled={!!social!.busy}
            accessibilityRole="button"
            accessibilityLabel={t("mob.social.apple")}
            style={({ pressed }) => [s.channel, s.appleCard, pressed && { opacity: 0.85 }]}
          >
            {social!.busy === "apple" ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <AppleLogo size={28} fill={themeName() === "dark" ? "#000000" : "#ffffff"} />
            )}
          </Pressable>
        ) : null}
      </View>

      {social?.err ? <Text style={s.err}>{social.err}</Text> : null}
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

const s = themed(() => ({
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
  pressed: { backgroundColor: color.muted },
  /* Apple qoidasi: qora fon (qorong'i rejimda oq), chegara yo'q */
  appleCard: {
    borderWidth: 0,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  err: { marginTop: space.md, fontSize: 13, color: color.dangerText },

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
}));
