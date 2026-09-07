/**
 * A7 — parolni tiklash.
 *
 * Dizayni (`YangiParol.dc.html`) 2026-08-23 da chizilgan edi, kodi
 * yozilmay qolgan: ya'ni parolni unutgan odam ilovaga umuman kira
 * olmasdi va uni web'ga yuborishdan boshqa yo'l yo'q edi.
 *
 * Oqim serverdagidek: send-code (purpose=reset) → verify-code →
 * reset-password. Backendda hammasi bor edi.
 *
 * ── KANAL TANLOVI (2026-09-07) ─────────────────────────────────
 *
 * Ilgari bu ekran `channel` ni UMUMAN yubormasdi va server `.env`
 * tartibiga tushardi — kod SMS bilan ketardi. Ro'yxatdan o'tishda
 * tanlov bor edi, bu yerda yo'q: odam ro'yxatdan Telegram bilan
 * o'tib, parolni tiklashda nega SMS kelayotganini tushunmasdi.
 * Endi ikkalasi bitta komponentdan (`ChannelPick`).
 *
 * TIKLASHDAN KEYIN BARCHA SESSIYALAR YOPILADI (server shunday
 * qiladi). Parol unutilgan bo'lsa, uni kimdir o'g'irlagan bo'lishi
 * ham mumkin — o'sha odamning ochiq seansi qolib ketmasin. Shuning
 * uchun ekran oxirida odam qaytadan kiradi.
 */
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Text } from "@/components/Text";
import { useRouter } from "expo-router";
import { AuthShell } from "@/components/AuthShell";
import { Button, Field, Steps } from "@/components/ui";
import { ChannelPick, SentVia, useChannels, type Channel } from "@/components/ChannelPick";
import { api, FuramError } from "@/lib/api";
import { t } from "@/lib/i18n";
import { color, font, radius, space } from "@/lib/theme";

type Step = "phone" | "code" | "password";

export default function Parol() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { channels, channel, setChannel } = useChannels();
  const [sentVia, setSentVia] = useState<Channel | null>(null);

  const router = useRouter();
  const codeRef = useRef<TextInput>(null);

  const fullPhone = "+998" + phone.replace(/\D/g, "");

  // Qayta yuborish taymeri
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  async function send(via: Channel = channel) {
    setErr(null);
    setBusy(true);
    try {
      const r = await api<{ via?: Channel; devCode?: string }>("/api/auth/send-code", {
        method: "POST",
        auth: false,
        body: { phone: fullPhone, purpose: "reset", channel: via },
      });
      setDevCode(r.devCode ?? null);
      /* Server QAYERGA ketganini aytadi — tanlangan kanal emas.
         Telegram so'ralgan-u raqamda Telegram bo'lmasa, kod SMS
         bilan ketadi va odam buni bilishi kerak. */
      setSentVia(r.via ?? via);
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
      const r = await api<{ verificationToken: string }>("/api/auth/verify-code", {
        method: "POST",
        auth: false,
        body: { phone: fullPhone, code: value, purpose: "reset" },
      });
      setToken(r.verificationToken);
      setStep("password");
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.reset.badCode"));
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setErr(null);
    setBusy(true);
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        auth: false,
        body: { phone: fullPhone, newPassword: password, verificationToken: token },
      });
      setDone(true);
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.reset.failed"));
    } finally {
      setBusy(false);
    }
  }

  const stepNo = step === "phone" ? 1 : step === "code" ? 2 : 3;
  const ready =
    step === "phone"
      ? phone.replace(/\D/g, "").length >= 9
      : step === "code"
        ? code.length >= 4
        : password.length >= 8 && password === again;

  /* Tugadi — bu bosqichda «orqaga» yo'li yopiladi: eski parol
     endi ishlamaydi, avvalgi ekranga qaytishning ma'nosi yo'q. */
  if (done) {
    return (
      <AuthShell title={t("mob.reset.doneTitle")} compact>
        <View style={s.doneWrap}>
          <View style={s.doneIcon}>
            <Text style={s.doneTick}>✓</Text>
          </View>
          <Text style={s.doneText}>{t("mob.reset.doneText")}</Text>
          <View style={{ alignSelf: "stretch", marginTop: space.xxl }}>
            <Button title={t("mob.reset.toSignIn")} onPress={() => router.replace("/kirish")} />
          </View>
        </View>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t("mob.reset.title")}
      subtitle={t("mob.common.stepOf", { n: stepNo, k: 3 })}
      compact
      onBack={() =>
        step === "phone" ? router.back() : setStep(step === "code" ? "phone" : "code")
      }
    >
      <Steps total={3} current={stepNo} />
      <View style={{ height: space.lg }} />
        {step === "phone" ? (
          <>
            <Text style={s.title}>{t("mob.reset.phoneTitle")}</Text>
            <Text style={s.sub}>{t("mob.reset.phoneHint")}</Text>
            <View style={{ marginTop: 26 }}>
              <Text style={s.label}>{t("mob.signIn.byPhone")}</Text>
              <View style={s.phoneRow}>
                <View style={s.cc}>
                  <Text style={s.ccText}>+998</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    placeholder="90 123 45 67"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                    autoFocus
                  />
                </View>
              </View>
            </View>

            <ChannelPick channels={channels} channel={channel} onPick={setChannel} />
          </>
        ) : step === "code" ? (
          <>
            <Text style={s.title}>{t("mob.reset.codeTitle")}</Text>
            <Text style={s.sub}>
              {t("mob.reset.codeHint")} <Text style={s.strong}>{fullPhone}</Text>
            </Text>

            <SentVia via={sentVia} picked={channel} />

            {/* Ro'yxatdagidek: bitta ko'rinmas maydon, 6 ta katak
                uni aks ettiradi (`royxat.tsx`) */}
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

            {devCode ? <Text style={s.dev}>{t("mob.signUp.devCode", { code: devCode })}</Text> : null}

            <Pressable disabled={left > 0 || busy} onPress={() => void send()} hitSlop={8}>
              <Text style={[s.link, left > 0 && s.linkOff]}>
                {left > 0 ? t("mob.signUp.resendIn", { n: left }) : t("mob.signUp.resend")}
              </Text>
            </Pressable>

            {/* BOSHQA kanal bilan qayta yuborish — ro'yxatdagidek.
                Telegram kelmasa odam kutib o'tirmasin: bir bosishda
                SMS ga o'tadi (va aksincha). */}
            {channels.length > 1 ? (
              <View style={{ marginTop: space.lg }}>
                <Button
                  title={sentVia === "telegram" ? t("mob.signUp.sendSms") : t("mob.signUp.sendTelegram")}
                  variant="secondary"
                  disabled={busy}
                  onPress={() => void send(sentVia === "telegram" ? "sms" : "telegram")}
                />
              </View>
            ) : null}
          </>
        ) : (
          <>
            <Text style={s.title}>{t("mob.reset.newTitle")}</Text>
            <Text style={s.sub}>{t("mob.reset.newHint")}</Text>

            <View style={{ marginTop: 26, gap: 14 }}>
              <Field
                label={t("mob.reset.newLabel")}
                placeholder="••••••••"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                autoFocus
              />
              <Field
                label={t("mob.reset.againLabel")}
                placeholder="••••••••"
                secureTextEntry
                value={again}
                onChangeText={setAgain}
                error={again.length > 0 && again !== password ? t("mob.reset.mismatch") : undefined}
              />
            </View>

            {/* Sessiyalar yopilishi OLDINDAN aytiladi, keyin emas */}
            <View style={s.notice}>
              <Text style={s.noticeText}>{t("mob.reset.sessionsNote")}</Text>
            </View>
          </>
        )}

        {err ? <Text style={s.err}>{err}</Text> : null}

      <View style={{ marginTop: space.xl }}>
        <Button
          title={t(step === "password" ? "mob.reset.save" : "mob.common.next")}
          loading={busy}
          disabled={!ready}
          /* ⚠️ `send` TO'G'RIDAN-TO'G'RI berilmaydi: `onPress` unga
             bosish hodisasini uzatadi va u `via` parametriga
             tushib qolardi — serverga kanal o'rniga obyekt
             ketardi. */
          onPress={
            step === "phone"
              ? () => void send()
              : step === "code"
                ? () => void verify(code)
                : () => void save()
          }
        />
      </View>
    </AuthShell>
  );
}

const s = StyleSheet.create({

  title: { fontSize: 24, fontWeight: "700", color: color.foreground, letterSpacing: -0.5 },
  sub: { fontSize: font.body, color: "#475569", marginTop: 8, lineHeight: 22 },
  strong: { fontWeight: "700", color: color.foreground },
  label: { fontSize: 12, color: color.mutedForeground, marginBottom: 6 },

  phoneRow: { flexDirection: "row", gap: 9, alignItems: "flex-start" },
  cc: {
    height: 52,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
    justifyContent: "center",
  },
  ccText: { fontSize: font.bodyLg, fontWeight: "600", color: color.foreground },

  boxes: { flexDirection: "row", gap: 9, marginTop: 26, justifyContent: "center" },
  box: {
    width: 48,
    height: 58,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
    alignItems: "center",
    justifyContent: "center",
  },
  boxActive: { borderColor: color.brand, borderWidth: 2 },
  boxText: { fontSize: 24, fontWeight: "700", color: color.foreground },
  hidden: { position: "absolute", opacity: 0, width: 1, height: 1 },
  dev: { fontSize: font.caption, color: color.mutedForeground, marginTop: 12, textAlign: "center" },
  link: {
    fontSize: font.body,
    fontWeight: "600",
    color: color.brand,
    marginTop: 18,
    textAlign: "center",
  },
  linkOff: { color: color.mutedForeground },

  notice: {
    marginTop: 20,
    padding: 14,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
  },
  noticeText: { fontSize: 12, color: "#475569", lineHeight: 19 },

  err: { fontSize: font.caption, color: color.danger, marginTop: 16 },


  doneWrap: { alignItems: "center", paddingVertical: space.md },
  doneIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: color.success + "1f",
    alignItems: "center",
    justifyContent: "center",
  },
  doneTick: { fontSize: 34, color: color.success, fontWeight: "700" },
  doneText: {
    fontSize: font.body,
    color: "#475569",
    marginTop: 10,
    textAlign: "center",
    lineHeight: 22,
  },
});
