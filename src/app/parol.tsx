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
 * TIKLASHDAN KEYIN BARCHA SESSIYALAR YOPILADI (server shunday
 * qiladi). Parol unutilgan bo'lsa, uni kimdir o'g'irlagan bo'lishi
 * ham mumkin — o'sha odamning ochiq seansi qolib ketmasin. Shuning
 * uchun ekran oxirida odam qaytadan kiradi.
 */
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Button, Field, Header, Steps } from "@/components/ui";
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

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const codeRef = useRef<TextInput>(null);

  const fullPhone = "+998" + phone.replace(/\D/g, "");

  // Qayta yuborish taymeri
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  async function send() {
    setErr(null);
    setBusy(true);
    try {
      const r = await api<{ devCode?: string }>("/api/auth/send-code", {
        method: "POST",
        auth: false,
        body: { phone: fullPhone, purpose: "reset" },
      });
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
      <View style={[s.root, { paddingTop: insets.top + space.xxl }]}>
        <View style={s.doneWrap}>
          <View style={s.doneIcon}>
            <Text style={s.doneTick}>✓</Text>
          </View>
          <Text style={s.doneTitle}>{t("mob.reset.doneTitle")}</Text>
          <Text style={s.doneText}>{t("mob.reset.doneText")}</Text>
          <View style={{ alignSelf: "stretch", marginTop: space.xxl }}>
            <Button title={t("mob.reset.toSignIn")} onPress={() => router.replace("/kirish")} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Header
        title={t("mob.reset.title")}
        onBack={() =>
          step === "phone" ? router.back() : setStep(step === "code" ? "phone" : "code")
        }
      />
      <View style={s.steps}>
        <Steps total={3} current={stepNo} />
      </View>

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}>
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
          </>
        ) : step === "code" ? (
          <>
            <Text style={s.title}>{t("mob.reset.codeTitle")}</Text>
            <Text style={s.sub}>
              {t("mob.reset.codeHint")} <Text style={s.strong}>{fullPhone}</Text>
            </Text>

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

            <Pressable disabled={left > 0 || busy} onPress={send} hitSlop={8}>
              <Text style={[s.link, left > 0 && s.linkOff]}>
                {left > 0 ? t("mob.signUp.resendIn", { n: left }) : t("mob.signUp.resend")}
              </Text>
            </Pressable>
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
      </ScrollView>

      <View style={[s.foot, { paddingBottom: insets.bottom + 14 }]}>
        <Button
          title={t(step === "password" ? "mob.reset.save" : "mob.common.next")}
          loading={busy}
          disabled={!ready}
          onPress={step === "phone" ? send : step === "code" ? () => verify(code) : save}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  steps: { backgroundColor: color.card, paddingHorizontal: space.lg, paddingBottom: space.md },
  scroll: { padding: space.lg },

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

  foot: {
    backgroundColor: color.card,
    borderTopWidth: 1,
    borderTopColor: color.border,
    paddingHorizontal: space.lg,
    paddingTop: 12,
  },

  doneWrap: { flex: 1, alignItems: "center", paddingHorizontal: space.xl, paddingTop: space.xxl },
  doneIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: color.success + "1f",
    alignItems: "center",
    justifyContent: "center",
  },
  doneTick: { fontSize: 34, color: color.success, fontWeight: "700" },
  doneTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: color.foreground,
    marginTop: 20,
    textAlign: "center",
  },
  doneText: {
    fontSize: font.body,
    color: "#475569",
    marginTop: 10,
    textAlign: "center",
    lineHeight: 22,
  },
});
