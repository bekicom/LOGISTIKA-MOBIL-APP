/**
 * A3-A5 — ro'yxatdan o'tish, uch bosqich.
 *
 * Telefon -> kod -> ma'lumot oqimi web bilan bir xil. Bu ekranlar A2
 * onboardingdagi qorong'i FURAM stilini davom ettiradi.
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
  type TextInputProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { Logo } from "@/components/Logo";
import { Notice } from "@/components/ui";
import { api, FuramError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { color, font, radius, space } from "@/lib/theme";
import { roleLabel, t } from "@/lib/i18n";

type Step = "phone" | "code" | "details";
type Channel = "telegram" | "sms";

const ROLES = [
  { value: "DRIVER", desc: "mob.signUp.roleDriver" },
  { value: "SHIPPER", desc: "mob.signUp.roleShipper" },
  { value: "VEHICLE_OWNER", desc: "mob.signUp.roleOwner" },
  { value: "DISPATCHER", desc: "mob.signUp.roleDispatcher" },
] as const;

export default function Royxat() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<Channel>("telegram");
  const [channels, setChannels] = useState<Channel[]>(["sms"]);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [sentVia, setSentVia] = useState<Channel | null>(null);
  const [token, setToken] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("DRIVER");
  const [agreed, setAgreed] = useState(false);
  const [left, setLeft] = useState(0);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { signIn } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const codeRef = useRef<TextInput>(null);

  const cleanPhone = phone.replace(/\D/g, "");
  const fullPhone = "+998" + cleanPhone;
  const stepNo = step === "phone" ? 1 : step === "code" ? 2 : 3;

  useEffect(() => {
    api<{ channels: Channel[] }>("/api/auth/send-code", { auth: false })
      .then((r) => {
        setChannels(r.channels);
        setChannel(r.channels.includes("telegram") ? "telegram" : "sms");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);

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
      const r = await api<{ verificationToken: string }>("/api/auth/verify-code", {
        method: "POST",
        auth: false,
        body: { phone: fullPhone, code: value, purpose: "register" },
      });
      setToken(r.verificationToken);
      setStep("details");
    } catch (e) {
      setErr((e as FuramError).message ?? "Kod noto'g'ri");
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  async function register() {
    setErr(null);
    setBusy(true);
    try {
      const res = await api<{ token?: string }>("/api/auth/register", {
        method: "POST",
        auth: false,
        body: {
          phone: fullPhone,
          password,
          firstName: firstName.trim(),
          ...(lastName.trim() ? { lastName: lastName.trim() } : {}),
          role,
          verificationToken: token,
          acceptOffer: true,
        },
      });
      if (!res.token) {
        setErr(t("mob.signUp.noSession"));
        return;
      }
      await signIn(res.token);
      router.replace("/bosh");
    } catch (e) {
      setErr((e as FuramError).message ?? "Ro'yxatdan o'tib bo'lmadi");
    } finally {
      setBusy(false);
    }
  }

  function goBack() {
    if (step === "phone") router.back();
    else setStep(step === "code" ? "phone" : "code");
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <RouteTexture />
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + space.xs, paddingBottom: insets.bottom + space.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <Pressable onPress={goBack} hitSlop={12} style={s.back}>
            <Svg width={23} height={23} viewBox="0 0 24 24">
              <Path d="m15 18-6-6 6-6" stroke="#ffffff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
          </Pressable>
          <Logo width={112} light />
          <Text style={s.headerStep}>{stepNo}/3</Text>
        </View>

        <Progress current={stepNo} />

        <Text style={s.caption}>{t("mob.common.stepOf", { n: stepNo, k: 3 })}</Text>

        {step === "phone" ? (
          <>
            <Text style={s.title}>{t("mob.signUp.phone")}</Text>
            <Text style={s.sub}>{t("mob.signUp.phoneHint")}</Text>

            <View style={s.panel}>
              <Text style={s.label}>{t("mob.signIn.byPhone")}</Text>
              <View style={s.phoneRow}>
                <View style={s.cc}>
                  <Text style={s.ccText}>+998</Text>
                </View>
                <FormInput
                  placeholder="90 123 45 67"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  autoFocus
                />
              </View>

              {channels.length > 1 ? (
                <View style={{ marginTop: space.xxl }}>
                  <Text style={s.label}>{t("mob.signUp.whereCode")}</Text>
                  <View style={s.cards}>
                    {(["telegram", "sms"] as const).map((c) => (
                      <ChannelCard
                        key={c}
                        channel={c}
                        selected={channel === c}
                        onPress={() => setChannel(c)}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
            </View>

            {err ? <Text style={s.err}>{err}</Text> : null}

            <PrimaryButton
              title={t("mob.common.continueBtn")}
              onPress={() => sendCode()}
              loading={busy}
              disabled={cleanPhone.length < 9}
            />
            <SignInLine onPress={() => router.push("/kirish")} />
          </>
        ) : null}

        {step === "code" ? (
          <>
            <Text style={s.title}>{t("mob.signUp.enterCode")}</Text>
            <Text style={s.sub}>
              {t("mob.signUp.codeSentTo", {
                phone: fullPhone,
                via: sentVia === "telegram" ? "Telegram" : "SMS",
              })}
            </Text>

            <Pressable onPress={() => setStep("phone")} hitSlop={8} style={s.editPhone}>
              <Svg width={16} height={16} viewBox="0 0 24 24">
                <Path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" stroke={color.brand} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </Svg>
              <Text style={s.link}>Raqamni o&apos;zgartirish</Text>
            </Pressable>

            {devCode ? (
              <View style={{ marginTop: space.lg }}>
                <Notice tone="info" title={t("mob.ui.devMode")}>
                  {t("mob.signUp.devCode", { code: devCode })}
                </Notice>
              </View>
            ) : null}

            <Pressable onPress={() => codeRef.current?.focus()} style={s.boxes}>
              {Array.from({ length: 6 }, (_, k) => (
                <View key={k} style={[s.box, code.length === k && s.boxActive]}>
                  <Text style={s.boxText}>{code[k] ?? ""}</Text>
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

            <View style={s.resendWrap}>
              {left > 0 ? (
                <Text style={s.subtleText}>{t("mob.signUp.resendIn", { n: left })}</Text>
              ) : (
                <Pressable onPress={() => sendCode()} hitSlop={8}>
                  <Text style={s.link}>{t("mob.signUp.resend")}</Text>
                </Pressable>
              )}
            </View>

            {channels.length > 1 ? (
              <SecondaryButton
                title={sentVia === "telegram" ? t("mob.signUp.sendSms") : t("mob.signUp.sendTelegram")}
                onPress={() => sendCode(sentVia === "telegram" ? "sms" : "telegram")}
              />
            ) : null}
          </>
        ) : null}

        {step === "details" ? (
          <>
            <Text style={s.title}>{t("mob.signUp.aboutYou")}</Text>
            <Text style={s.sub}>{t("mob.signUp.roleHint")}</Text>

            <View style={s.panel}>
              <LabeledInput label={t("mob.profile.firstName")} placeholder={t("mob.profile.firstName")} value={firstName} onChangeText={setFirstName} autoFocus />
              <LabeledInput label={t("mob.profile.lastName")} hint={t("mob.common.optional")} placeholder={t("mob.profile.lastName")} value={lastName} onChangeText={setLastName} />
              <LabeledInput
                label={t("mob.signIn.password")}
                placeholder={t("mob.signUp.passwordMin")}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <Text style={[s.label, { marginTop: space.sm }]}>{t("mob.signUp.whoAreYou")}</Text>
              <View style={s.roleList}>
                {ROLES.map((r) => (
                  <RoleCard
                    key={r.value}
                    value={r.value}
                    desc={t(r.desc)}
                    selected={role === r.value}
                    onPress={() => setRole(r.value)}
                  />
                ))}
              </View>
            </View>

            <Pressable onPress={() => setAgreed((v) => !v)} style={s.offer}>
              <View style={[s.check, agreed && s.checkOn]}>
                {agreed ? (
                  <Svg width={13} height={13} viewBox="0 0 24 24">
                    <Path d="M20 6 9 17l-5-5" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </Svg>
                ) : null}
              </View>
              <Text style={s.offerText}>
                {t("mob.signUp.agreePre")}{" "}
                <Text style={s.link} onPress={() => router.push("/huquqiy")}>
                  {t("mob.signUp.offer")}
                </Text>{" "}
                {t("mob.signUp.agreeAnd")}{" "}
                <Text style={s.link} onPress={() => router.push("/huquqiy")}>
                  {t("mob.signUp.privacy")}
                </Text>{" "}
                {t("mob.signUp.agreePost")}
              </Text>
            </Pressable>

            {err ? <Text style={s.err}>{err}</Text> : null}

            <PrimaryButton
              title={t("mob.signUp.title")}
              onPress={register}
              loading={busy}
              disabled={!agreed || firstName.trim().length < 2 || password.length < 6}
            />
            {!agreed ? <Text style={s.hintCenter}>{t("mob.signUp.offerRequired")}</Text> : null}
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RouteTexture() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 393 852" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#08162b" />
            <Stop offset="0.62" stopColor="#071326" />
            <Stop offset="1" stopColor="#0b1d35" />
          </LinearGradient>
        </Defs>
        <Rect width="393" height="852" fill="url(#bg)" />
        <Circle cx="336" cy="74" r="150" fill="#12345f" opacity="0.17" />
        <Circle cx="60" cy="690" r="210" fill="#12345f" opacity="0.12" />
        <Path d="M-24 405 C58 364 95 431 158 387 C215 347 253 272 417 301" fill="none" stroke="#f45a18" strokeOpacity="0.12" strokeWidth={1.4} />
        <Path d="M20 196 C76 168 108 224 160 196 C222 162 260 88 364 124" fill="none" stroke="#7aa3d8" strokeOpacity="0.12" strokeWidth={1} strokeDasharray="4 7" />
      </Svg>
    </View>
  );
}

function Progress({ current }: { current: number }) {
  return (
    <View style={s.progress}>
      {[1, 2, 3].map((n) => (
        <View key={n} style={[s.progressItem, n <= current && s.progressOn]} />
      ))}
    </View>
  );
}

function FormInput(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor="#7891b1"
      style={s.input}
      {...props}
    />
  );
}

function LabeledInput({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={s.fieldBlock}>
      <Text style={s.label}>
        {label}
        {hint ? <Text style={s.labelHint}> - {hint}</Text> : null}
      </Text>
      <FormInput {...props} />
    </View>
  );
}

function PrimaryButton({ title, onPress, loading, disabled }: { title: string; onPress: () => void; loading?: boolean; disabled?: boolean }) {
  const off = loading || disabled;
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      style={({ pressed }) => [s.primary, pressed && !off && s.primaryDown, off && s.buttonOff]}
    >
      <Text style={[s.primaryText, off && s.buttonOffText]}>{loading ? "..." : title}</Text>
      <Text style={[s.primaryArrow, off && s.buttonOffText]}>→</Text>
    </Pressable>
  );
}

function SecondaryButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [s.secondary, pressed && s.secondaryDown]}>
      <Text style={s.secondaryText}>{title}</Text>
    </Pressable>
  );
}

function SignInLine({ onPress }: { onPress: () => void }) {
  return (
    <View style={s.signLine}>
      <Text style={s.subtleText}>Hisobingiz bormi?</Text>
      <Pressable onPress={onPress} hitSlop={8}>
        <Text style={s.link}>{t("mob.intro.signIn")}</Text>
      </Pressable>
    </View>
  );
}

function ChannelCard({ channel, selected, onPress }: { channel: Channel; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.channel, selected && s.channelOn]}>
      <View style={s.channelTop}>
        {channel === "telegram" ? <TelegramIcon /> : <SmsIcon selected={selected} />}
        <Radio selected={selected} />
      </View>
      <Text style={s.channelName}>{channel === "telegram" ? "Telegram" : "SMS"}</Text>
      <Text style={s.channelNote}>{channel === "telegram" ? t("mob.signUp.subtitle") : "Telegramsiz"}</Text>
    </Pressable>
  );
}

function RoleCard({ value, desc, selected, onPress }: { value: string; desc: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.role, selected && s.roleOn]}>
      <View style={[s.roleIcon, selected && { backgroundColor: color.brand }]}>
        <RoleIcon value={value} on={selected} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.roleName}>{roleLabel(value)}</Text>
        <Text style={s.roleDesc}>{desc}</Text>
      </View>
      <Radio selected={selected} />
    </Pressable>
  );
}

function Radio({ selected }: { selected: boolean }) {
  return (
    <View style={[s.radio, selected && s.radioOn]}>
      {selected ? (
        <Svg width={12} height={12} viewBox="0 0 24 24">
          <Path d="M20 6 9 17l-5-5" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      ) : null}
    </View>
  );
}

function TelegramIcon() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      <Path
        d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm5.56 8.22-1.86 8.78c-.14.62-.51.77-1.03.48l-2.85-2.1-1.37 1.32c-.15.15-.28.28-.58.28l.2-2.9 5.29-4.78c.23-.2-.05-.32-.36-.12l-6.53 4.11-2.81-.88c-.61-.19-.62-.61.13-.9l10.99-4.24c.51-.18.96.12.78.95z"
        fill="#229ED9"
      />
    </Svg>
  );
}

function SmsIcon({ selected }: { selected: boolean }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      <Path
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        stroke={selected ? color.brand : "#8fa7c7"}
        strokeWidth={2}
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function RoleIcon({ value, on }: { value: string; on: boolean }) {
  const c = on ? "#ffffff" : "#8fa7c7";
  if (value === "DRIVER")
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path d="M10 17h4V5H2v12h3M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" stroke={c} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={7.5} cy={17.5} r={2.5} stroke={c} strokeWidth={2} fill="none" />
        <Circle cx={17.5} cy={17.5} r={2.5} stroke={c} strokeWidth={2} fill="none" />
      </Svg>
    );
  if (value === "SHIPPER")
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path d="m7.5 4.27 9 5.15M21 8l-9 5-9-5 9-5 9 5zM3 8v8l9 5 9-5V8" stroke={c} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  if (value === "VEHICLE_OWNER")
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5" stroke={c} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Rect x={3} y={4} width={18} height={16} rx={2} stroke={c} strokeWidth={2} fill="none" />
      <Path d="M7 9h4M7 13h10M7 17h7" stroke={c} strokeWidth={2} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.navy },
  scroll: { flexGrow: 1, paddingHorizontal: space.xl },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48 },
  back: { width: 44, height: 44, marginLeft: -12, alignItems: "center", justifyContent: "center" },
  headerStep: { minWidth: 44, textAlign: "right", fontSize: 14, fontWeight: "700", color: "#9eb5d5" },

  progress: { flexDirection: "row", gap: 7, marginTop: 12 },
  progressItem: { flex: 1, height: 5, borderRadius: 999, backgroundColor: "#294566" },
  progressOn: { backgroundColor: color.brand },

  caption: { fontSize: 12, fontWeight: "700", color: "#8fa7c7", letterSpacing: 0.6, marginTop: 24 },
  title: { fontSize: 34, lineHeight: 40, fontWeight: "800", color: "#ffffff", marginTop: 8 },
  sub: { fontSize: font.body, color: "#a9bddc", marginTop: 9, lineHeight: 23 },
  subtleText: { fontSize: 14.5, color: "#9eb5d5", lineHeight: 21 },

  panel: {
    marginTop: 28,
    padding: space.lg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#294566",
    backgroundColor: "rgba(15, 37, 68, 0.72)",
    gap: space.lg,
  },
  label: { fontSize: font.caption, fontWeight: "700", color: "#ffffff", marginBottom: 8 },
  labelHint: { fontWeight: "500", color: "#9eb5d5" },
  fieldBlock: { gap: 0 },

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
  input: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: "#33577f",
    backgroundColor: "#0c1f3a",
    color: "#ffffff",
    fontSize: font.bodyLg,
    fontWeight: "600",
    paddingHorizontal: 15,
  },

  cards: { flexDirection: "row", gap: 10 },
  channel: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: "#33577f",
    backgroundColor: "#0c1f3a",
  },
  channelOn: { borderWidth: 2, borderColor: color.brand, backgroundColor: "rgba(244, 90, 24, 0.1)" },
  channelTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  channelName: { fontSize: font.body, fontWeight: "800", color: "#ffffff", marginTop: 12 },
  channelNote: { fontSize: 12.5, color: "#9eb5d5", marginTop: 3 },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#45668c",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { backgroundColor: color.brand, borderColor: color.brand },

  boxes: { flexDirection: "row", gap: 8, marginTop: 34 },
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
  editPhone: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 12 },
  resendWrap: { alignItems: "center", marginTop: space.xl, marginBottom: space.lg },

  roleList: { gap: 10 },
  role: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    padding: 13,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: "#33577f",
    backgroundColor: "#0c1f3a",
  },
  roleOn: { borderWidth: 2, borderColor: color.brand, backgroundColor: "rgba(244, 90, 24, 0.1)" },
  roleIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.control,
    backgroundColor: "#142d4f",
    alignItems: "center",
    justifyContent: "center",
  },
  roleName: { fontSize: font.body, fontWeight: "800", color: "#ffffff" },
  roleDesc: { fontSize: 12.5, color: "#9eb5d5", marginTop: 3, lineHeight: 18 },

  offer: { flexDirection: "row", gap: 11, marginTop: 22, alignItems: "flex-start" },
  check: {
    width: 23,
    height: 23,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#45668c",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkOn: { backgroundColor: color.brand, borderColor: color.brand },
  offerText: { flex: 1, fontSize: 13, color: "#d8e6fb", lineHeight: 20 },

  primary: {
    minHeight: 62,
    borderRadius: 16,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: space.xl,
    marginTop: space.xxl,
  },
  primaryDown: { backgroundColor: color.brandHover },
  primaryText: { flex: 1, textAlign: "center", color: "#ffffff", fontSize: 18, fontWeight: "800" },
  primaryArrow: { color: "#ffffff", fontSize: 30, fontWeight: "600", marginLeft: -28 },
  buttonOff: { backgroundColor: "#294566" },
  buttonOffText: { color: "#7891b1" },
  secondary: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1.3,
    borderColor: "#33577f",
    backgroundColor: "rgba(15, 37, 68, 0.62)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryDown: { backgroundColor: "rgba(33, 71, 112, 0.72)" },
  secondaryText: { color: "#ffffff", fontSize: font.body, fontWeight: "800" },

  signLine: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 16 },
  hintCenter: { fontSize: 12.5, color: "#9eb5d5", textAlign: "center", marginTop: 10 },
  err: { fontSize: 13, color: "#ff9b73", marginTop: space.md, lineHeight: 19 },
  link: { fontSize: 14.5, fontWeight: "800", color: color.brand },
});
