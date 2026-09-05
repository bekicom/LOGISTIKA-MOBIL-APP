/** A7 — parolni tiklash. */
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
import Svg, { Path } from "react-native-svg";
import {
  AuthTexture,
  BackButton,
  DarkInput,
  EyeButton,
  GlassPanel,
  LabeledDarkInput,
  PrimaryAction,
  ProgressDots,
} from "@/components/AuthDesign";
import { Logo } from "@/components/Logo";
import { api, FuramError } from "@/lib/api";
import { color, font, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Step = "phone" | "code" | "password";

export default function Parol() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [show, setShow] = useState(false);
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const codeRef = useRef<TextInput>(null);
  const cleanPhone = phone.replace(/\D/g, "");
  const fullPhone = "+998" + cleanPhone;
  const stepNo = step === "phone" ? 1 : step === "code" ? 2 : 3;

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

  function goBack() {
    if (step === "phone") router.back();
    else setStep(step === "code" ? "phone" : "code");
  }

  const ready =
    step === "phone"
      ? cleanPhone.length >= 9
      : step === "code"
        ? code.length >= 4
        : password.length >= 8 && password === again;

  if (done) {
    return (
      <View style={[s.root, { paddingTop: insets.top + space.xs, paddingBottom: insets.bottom + space.xl }]}>
        <AuthTexture />
        <View style={s.doneWrap}>
          <Logo width={148} light />
          <View style={s.doneIcon}>
            <Svg width={34} height={34} viewBox="0 0 24 24">
              <Path d="M20 6 9 17l-5-5" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
          </View>
          <Text style={s.doneTitle}>{t("mob.reset.doneTitle")}</Text>
          <Text style={s.doneText}>{t("mob.reset.doneText")}</Text>
          <View style={s.doneButton}>
            <PrimaryAction title={t("mob.reset.toSignIn")} onPress={() => router.replace("/kirish")} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <AuthTexture />
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + space.xs, paddingBottom: insets.bottom + space.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <BackButton onPress={goBack} />
          <Logo width={112} light />
          <Text style={s.headerStep}>{stepNo}/3</Text>
        </View>

        <ProgressDots total={3} current={stepNo} />
        <Text style={s.caption}>{t("mob.common.stepOf", { n: stepNo, k: 3 })}</Text>

        <Text style={s.title}>{t(step === "phone" ? "mob.reset.phoneTitle" : step === "code" ? "mob.reset.codeTitle" : "mob.reset.newTitle")}</Text>
        <Text style={s.sub}>
          {step === "phone"
            ? t("mob.reset.phoneHint")
            : step === "code"
              ? `${t("mob.reset.codeHint")} ${fullPhone}`
              : t("mob.reset.newHint")}
        </Text>

        <GlassPanel style={s.panel}>
          {step === "phone" ? (
            <View>
              <Text style={s.label}>{t("mob.signIn.byPhone")}</Text>
              <View style={s.phoneRow}>
                <View style={s.cc}>
                  <Text style={s.ccText}>+998</Text>
                </View>
                <DarkInput
                  style={{ flex: 1 }}
                  placeholder="90 123 45 67"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  autoFocus
                />
              </View>
            </View>
          ) : null}

          {step === "code" ? (
            <>
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
          ) : null}

          {step === "password" ? (
            <>
              <LabeledDarkInput
                label={t("mob.reset.newLabel")}
                placeholder="••••••••"
                secureTextEntry={!show}
                value={password}
                onChangeText={setPassword}
                autoFocus
                right={<EyeButton shown={show} onPress={() => setShow((v) => !v)} />}
              />
              <LabeledDarkInput
                label={t("mob.reset.againLabel")}
                placeholder="••••••••"
                secureTextEntry={!show}
                value={again}
                onChangeText={setAgain}
              />
              {again.length > 0 && again !== password ? <Text style={s.err}>{t("mob.reset.mismatch")}</Text> : null}
              <View style={s.notice}>
                <Text style={s.noticeText}>{t("mob.reset.sessionsNote")}</Text>
              </View>
            </>
          ) : null}
        </GlassPanel>

        {err ? <Text style={s.err}>{err}</Text> : null}

        <View style={s.actions}>
          <PrimaryAction
            title={t(step === "password" ? "mob.common.save" : "mob.common.next")}
            loading={busy}
            disabled={!ready}
            onPress={step === "phone" ? send : step === "code" ? () => verify(code) : save}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.navy },
  scroll: { flexGrow: 1, paddingHorizontal: space.xl },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48 },
  headerStep: { minWidth: 44, textAlign: "right", fontSize: 14, fontWeight: "800", color: "#9eb5d5" },
  caption: { fontSize: 12, fontWeight: "800", color: "#8fa7c7", letterSpacing: 0.6, marginTop: 24 },
  title: { fontSize: 34, lineHeight: 40, fontWeight: "800", color: "#ffffff", marginTop: 8 },
  sub: { fontSize: font.body, color: "#a9bddc", marginTop: 9, lineHeight: 23 },
  panel: { gap: space.lg, marginTop: 28 },
  label: { fontSize: font.caption, fontWeight: "700", color: "#ffffff", marginBottom: 8 },
  phoneRow: { flexDirection: "row", gap: 9 },
  cc: {
    width: 94,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: "#33577f",
    backgroundColor: "#0c1f3a",
    alignItems: "center",
    justifyContent: "center",
  },
  ccText: { fontSize: font.bodyLg, fontWeight: "800", color: "#ffffff" },
  boxes: { flexDirection: "row", gap: 8 },
  box: {
    flex: 1,
    height: 62,
    borderRadius: 14,
    borderWidth: 1.4,
    borderColor: "#33577f",
    backgroundColor: "#0c1f3a",
    alignItems: "center",
    justifyContent: "center",
  },
  boxActive: { borderWidth: 2, borderColor: color.brand, backgroundColor: "#102947" },
  boxText: { fontSize: 26, fontWeight: "800", color: "#ffffff" },
  hidden: { position: "absolute", opacity: 0, height: 1, width: 1 },
  dev: { fontSize: font.caption, color: "#9eb5d5", textAlign: "center" },
  link: { fontSize: font.body, fontWeight: "800", color: color.brand, textAlign: "center" },
  linkOff: { color: "#7891b1" },
  notice: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: "#33577f",
    backgroundColor: "rgba(12, 31, 58, 0.78)",
  },
  noticeText: { fontSize: 12.5, color: "#a9bddc", lineHeight: 19 },
  err: { fontSize: 13, color: "#ff9b73", lineHeight: 19, marginTop: space.md },
  actions: { marginTop: space.xxl },
  doneWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: space.xl },
  doneIcon: {
    width: 78,
    height: 78,
    borderRadius: 24,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 44,
  },
  doneTitle: { fontSize: 30, lineHeight: 36, fontWeight: "800", color: "#ffffff", marginTop: 22, textAlign: "center" },
  doneText: { fontSize: font.body, color: "#a9bddc", marginTop: 10, textAlign: "center", lineHeight: 23 },
  doneButton: { alignSelf: "stretch", marginTop: 34 },
});
