/**
 * Telefon raqamini tasdiqlash — TELEFONSIZ hisob uchun
 * (2026-09-17, do'kon auditi A10).
 *
 * ── NEGA KERAK ──────────────────────────────────────────────────
 *
 * Google yoki Apple bilan ochilgan hisobda telefon YO'Q. Platforma
 * esa raqam bilan ishlaydi: e'londa aloqa raqami turadi, yuk egasiga
 * qo'ng'iroq qilinadi. Shuning uchun server e'lon berish, kontakt
 * ochish va bozorda `PHONE_REQUIRED` qaytaradi (`phone-gate.ts`).
 *
 * Ilova bu kodni ushlamasdi va raqam qo'shish ekrani ham yo'q edi —
 * ya'ni Google bilan kirgan odam ilovada HECH NARSA qila olmasdi va
 * nima uchun ishlamayotganini ham bilmasdi. Apple 2.1 aynan shuni
 * («boshi berk oqim») rad sababi qiladi.
 *
 * ── OQIM ────────────────────────────────────────────────────────
 *
 * Ro'yxatdan o'tishdagi YO'LNING O'ZI ishlatiladi: `send-code` →
 * `verify-code` (maqsad `register`) → `POST /api/profile/phone`.
 * Ya'ni band raqamga kod ketmaydi va token faqat shu raqamga yaraydi.
 *
 * Matnlar ham ro'yxatdagi lug'atdan (`mob.signUp.*`) — ikkinchi nusxa
 * yasalsa, biri o'zgarganda ikkinchisi eskirib qolardi.
 */
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { Text } from "@/components/Text";
import { useRouter } from "expo-router";
import { Button, Field, Header, Notice } from "@/components/ui";
import { ChannelPick, useChannels, type Channel } from "@/components/ChannelPick";
import { PhoneCodePick } from "@/components/PhoneCodePick";
import { PHONE_CODES } from "@/lib/phone-codes";
import { api, FuramError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { color, font, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

export default function TelefonQoshish() {
  const router = useRouter();
  const { user, refresh } = useAuth();

  const [ccIdx, setCcIdx] = useState(0);
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const { channels, channel, setChannel } = useChannels();
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [sentVia, setSentVia] = useState<Channel | null>(null);
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const codeRef = useRef<TextInput>(null);
  const fullPhone = PHONE_CODES[ccIdx].code + phone.replace(/\D/g, "");

  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  /* Raqami BOR odam bu ekranga tushmasligi kerak: almashtirish alohida
     xavf (hisobni o'g'irlash) va server ham 409 qaytaradi.

     ⚠️ Faqat EKRAN OCHILGANDAGI holat (2026-09-19). Ilgari shart har
     `user.phone` o'zgarishida ishlardi: raqam saqlangach `verify` o'zi
     orqaga qaytardi, keyin bu effekt YANA qaytardi — ikkinchi qaytish
     keraksiz ekranni (masalan profilni) ham yopib yuborardi. */
  const boshdaBor = useRef(!!user?.phone);
  useEffect(() => {
    if (boshdaBor.current) router.back();
  }, [router]);

  async function sendCode(via: Channel = channel) {
    setErr(null);
    setBusy(true);
    try {
      const r = await api<{ via?: Channel; devCode?: string }>("/api/auth/send-code", {
        method: "POST",
        auth: false,
        body: { phone: fullPhone, purpose: "register", channel: via },
      });
      setSentVia(r.via ?? via);
      setDevCode(r.devCode ?? null);
      setLeft(60);
      setStep("code");
      setTimeout(() => codeRef.current?.focus(), 250);
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.signUp.codeFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function verify(value: string) {
    setErr(null);
    setBusy(true);
    try {
      const v = await api<{ verificationToken: string }>("/api/auth/verify-code", {
        method: "POST",
        auth: false,
        body: { phone: fullPhone, code: value, purpose: "register" },
      });
      await api("/api/profile/phone", {
        method: "POST",
        body: { phone: fullPhone, verificationToken: v.verificationToken },
      });
      /* Hisob ma'lumoti yangilanmasa, to'siq ochilganini ilova bilmaydi */
      await refresh();
      router.back();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.reset.badCode"));
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.root}>
      <Header title={t("mob.phone.title")} />

      <ScrollView
        contentContainerStyle={s.scroll}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
      >
        {step === "phone" ? (
          <>
            <Text style={s.why}>{t("mob.phone.why")}</Text>

            <View>
              <Text style={s.label}>{t("mob.signIn.byPhone")}</Text>
              <View style={s.phoneRow}>
                <PhoneCodePick index={ccIdx} onChange={setCcIdx} />
                <View style={{ flex: 1 }}>
                  <Field
                    placeholder="90 123 45 67"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={(v) => {
                      setPhone(v);
                      setErr(null);
                    }}
                    autoFocus
                  />
                </View>
              </View>
            </View>

            {/* Kod qanday kelishi — SMS yoki Telegram. Google/Apple
                tugmalari bu yerda KERAK EMAS: odam allaqachon kirgan */}
            <ChannelPick channels={channels} channel={channel} onPick={setChannel} />

            {err ? <Text style={s.err}>{err}</Text> : null}

            <Button
              title={t("mob.common.continueBtn")}
              onPress={() => sendCode()}
              loading={busy}
              disabled={phone.replace(/\D/g, "").length < 9}
            />
          </>
        ) : (
          <>
            <Text style={s.title}>{t("mob.signUp.enterCode")}</Text>
            <Text style={s.why}>
              {t("mob.signUp.codeSentTo", {
                phone: fullPhone,
                via: sentVia === "telegram" ? "Telegram" : "SMS",
              })}
            </Text>

            {devCode ? (
              <Notice tone="info" title={t("mob.ui.devMode")}>
                {t("mob.signUp.devCode", { code: devCode })}
              </Notice>
            ) : null}

            {/* Bitta ko'rinmas maydon — 6 ta katak uni aks ettiradi */}
            <Pressable onPress={() => codeRef.current?.focus()} style={s.boxes}>
              {Array.from({ length: 6 }, (_, i) => (
                <View key={i} style={[s.box, code.length === i && s.boxActive]}>
                  <Text style={s.boxText}>{code[i] ?? ""}</Text>
                </View>
              ))}
              <TextInput
                ref={codeRef}
                value={code}
                onChangeText={(v) => {
                  const digits = v.replace(/\D/g, "").slice(0, 6);
                  setCode(digits);
                  if (digits.length === 6) void verify(digits);
                }}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                maxLength={6}
                style={s.hidden}
              />
            </Pressable>

            {err ? <Text style={[s.err, { textAlign: "center" }]}>{err}</Text> : null}

            <Pressable
              onPress={() => {
                setStep("phone");
                setCode("");
                setErr(null);
              }}
              hitSlop={8}
              style={{ alignSelf: "center" }}
            >
              <Text style={s.link}>{t("mob.signUp.changePhone")}</Text>
            </Pressable>

            <View style={{ alignItems: "center" }}>
              {left > 0 ? (
                <Text style={s.why}>
                  {t("mob.signUp.resendIn", { n: left })}
                </Text>
              ) : (
                <Pressable onPress={() => sendCode()} hitSlop={8}>
                  <Text style={s.link}>{t("mob.signUp.resend")}</Text>
                </Pressable>
              )}
            </View>

            {channels.length > 1 ? (
              <Button
                title={sentVia === "telegram" ? t("mob.signUp.sendSms") : t("mob.signUp.sendTelegram")}
                variant="secondary"
                onPress={() => sendCode(sentVia === "telegram" ? "sms" : "telegram")}
              />
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl * 2 },

  title: { fontSize: font.titleLg, fontWeight: "700", color: color.foreground },
  why: { fontSize: font.caption, color: color.mutedForeground, lineHeight: 19 },
  label: { fontSize: font.caption, fontWeight: "600", color: color.foreground, marginBottom: 7 },
  phoneRow: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
  err: { fontSize: font.caption, color: color.danger },
  link: { fontSize: font.caption, fontWeight: "600", color: color.brandText },

  boxes: { flexDirection: "row", gap: space.sm, justifyContent: "center" },
  box: {
    width: 44,
    height: 54,
    borderRadius: radius.control,
    borderWidth: 1.5,
    borderColor: color.border,
    backgroundColor: color.card,
    alignItems: "center",
    justifyContent: "center",
  },
  boxActive: { borderColor: color.brand },
  boxText: { fontSize: 22, fontWeight: "700", color: color.foreground },
  hidden: { position: "absolute", opacity: 0, width: 1, height: 1 },
}));
