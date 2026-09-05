/**
 * A3–A5 — ro'yxatdan o'tish, uch bosqich.
 *
 * Bosqichlar web'dagi `furam/src/app/(auth)/register/page.tsx` bilan bir xil:
 * telefon → kod → ma'lumot. Rollar va matnlar ham o'sha yerdan.
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
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { Button, Field, Notice, Steps } from "@/components/ui";
import { api, FuramError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { color, font, radius, space } from "@/lib/theme";
import { roleLabel, t } from "@/lib/i18n";

type Step = "phone" | "code" | "details";
type Channel = "telegram" | "sms";

/* Rol nomi va tavsifi lug'atda: `mob.role.*` va `mob.signUp.role*`.
   Bu yerda faqat ENUM qiymati va tavsif kaliti turadi. */
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

  const fullPhone = "+998" + phone.replace(/\D/g, "");

  // Telegram tayyor bo'lmasa faqat SMS ko'rsatiladi — serverdan so'raymiz
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
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
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

  const stepNo = step === "phone" ? 1 : step === "code" ? 2 : 3;

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + space.xs, paddingBottom: insets.bottom + space.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => (step === "phone" ? router.back() : setStep(step === "code" ? "phone" : "code"))}
          hitSlop={12}
          style={s.back}
        >
          <Svg width={22} height={22} viewBox="0 0 24 24">
            <Path d="m15 18-6-6 6-6" stroke={color.foreground} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </Pressable>

        <Steps total={3} current={stepNo} />

        <Text style={s.caption}>{t("mob.common.stepOf", { n: stepNo, k: 3 })}</Text>

        {step === "phone" ? (
          <>
            <Text style={s.title}>{t("mob.signUp.phone")}</Text>
            <Text style={s.sub}>{t("mob.signUp.phoneHint")}</Text>

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

            {channels.length > 1 ? (
              <View style={{ marginTop: space.xxl }}>
                <Text style={s.label}>{t("mob.signUp.whereCode")}</Text>
                <View style={s.cards}>
                  {(["telegram", "sms"] as const).map((c) => {
                    const on = channel === c;
                    return (
                      <Pressable key={c} onPress={() => setChannel(c)} style={[s.channel, on && s.channelOn]}>
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
                                <Path d="M20 6 9 17l-5-5" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                              </Svg>
                            ) : null}
                          </View>
                        </View>
                        <Text style={s.channelName}>{c === "telegram" ? "Telegram" : "SMS"}</Text>
                        <Text style={s.channelNote}>{c === "telegram" ? t("mob.signUp.subtitle") : "Telegramsiz"}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {err ? <Text style={s.err}>{err}</Text> : null}

            <View style={{ marginTop: space.xxl }}>
              <Button
                title={t("mob.common.continueBtn")}
                onPress={() => sendCode()}
                loading={busy}
                disabled={phone.replace(/\D/g, "").length < 9}
              />
            </View>
          </>
        ) : null}

        {step === "code" ? (
          <>
            <Text style={s.title}>{t("mob.signUp.enterCode")}</Text>
            {/* Matn LUG'ATDAN: ilgari «6 xonali kod yubordik» qismi
                kodda o'zbekcha yozilgan edi va rus tilidagi
                telefonda ham o'zbekcha chiqardi. */}
            <Text style={s.sub}>
              {t("mob.signUp.codeSentTo", {
                phone: fullPhone,
                via: sentVia === "telegram" ? "Telegram" : "SMS",
              })}
            </Text>

            {devCode ? (
              <View style={{ marginTop: space.lg }}>
                <Notice tone="info" title={t("mob.ui.devMode")}>
                  {t("mob.signUp.devCode", { c: devCode })}
                </Notice>
              </View>
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

            <View style={{ alignItems: "center", marginTop: space.xl }}>
              {left > 0 ? (
                <Text style={s.sub}>
                  {t("mob.signUp.resendIn", {
                    t: `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`,
                  })}
                </Text>
              ) : (
                <Pressable onPress={() => sendCode()} hitSlop={8}>
                  <Text style={s.link}>{t("mob.signUp.resend")}</Text>
                </Pressable>
              )}
            </View>

            {channels.length > 1 ? (
              <View style={{ marginTop: space.lg }}>
                <Button
                  title={sentVia === "telegram" ? t("mob.signUp.sendSms") : t("mob.signUp.sendTelegram")}
                  variant="secondary"
                  onPress={() => sendCode(sentVia === "telegram" ? "sms" : "telegram")}
                />
              </View>
            ) : null}
          </>
        ) : null}

        {step === "details" ? (
          <>
            <Text style={s.title}>{t("mob.signUp.aboutYou")}</Text>

            <View style={{ gap: space.lg, marginTop: space.xxl }}>
              <Field label={t("mob.profile.firstName")} placeholder={t("mob.profile.firstName")} value={firstName} onChangeText={setFirstName} autoFocus />
              <Field label={t("mob.profile.lastName")} hint={t("mob.common.optional")} placeholder={t("mob.profile.lastName")} value={lastName} onChangeText={setLastName} />
              <Field
                label={t("mob.signIn.password")}
                placeholder={t("mob.signUp.passwordMin")}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <Text style={[s.label, { marginTop: space.xxl }]}>{t("mob.signUp.whoAreYou")}</Text>
            <Text style={s.hint}>{t("mob.signUp.roleHint")}</Text>

            <View style={{ gap: 9, marginTop: space.md }}>
              {ROLES.map((r) => {
                const on = role === r.value;
                return (
                  <Pressable key={r.value} onPress={() => setRole(r.value)} style={[s.role, on && s.roleOn]}>
                    <View style={[s.roleIcon, on && { backgroundColor: color.brand }]}>
                      <RoleIcon value={r.value} on={on} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.roleName}>{roleLabel(r.value)}</Text>
                      <Text style={s.roleDesc}>{t(r.desc)}</Text>
                    </View>
                    <View style={[s.radio, on && s.radioOn]}>
                      {on ? (
                        <Svg width={13} height={13} viewBox="0 0 24 24">
                          <Path d="M20 6 9 17l-5-5" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </Svg>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Pressable onPress={() => setAgreed((v) => !v)} style={s.offer}>
              <View style={[s.check, agreed && s.checkOn]}>
                {agreed ? (
                  <Svg width={13} height={13} viewBox="0 0 24 24">
                    <Path d="M20 6 9 17l-5-5" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </Svg>
                ) : null}
              </View>
              {/* «va ... shartlariga roziman» o'zbekcha qotib qolgan
                  edi; endi butun jumla lug'atda. Havolalar ham
                  bosiladigan bo'ldi — ilgari shunchaki ko'k matn
                  edi va do'kon talabi bajarilmasdi. */}
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

            <View style={{ marginTop: space.xl }}>
              <Button
                title={t("mob.signUp.title")}
                onPress={register}
                loading={busy}
                disabled={!agreed || firstName.trim().length < 2 || password.length < 6}
              />
              {!agreed ? <Text style={s.hintCenter}>{t("mob.signUp.offerRequired")}</Text> : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RoleIcon({ value, on }: { value: string; on: boolean }) {
  const c = on ? "#ffffff" : color.mutedForeground;
  if (value === "DRIVER")
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path
          d="M10 17h4V5H2v12h3M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"
          stroke={c}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={7.5} cy={17.5} r={2.5} stroke={c} strokeWidth={2} fill="none" />
        <Circle cx={17.5} cy={17.5} r={2.5} stroke={c} strokeWidth={2} fill="none" />
      </Svg>
    );
  if (value === "SHIPPER")
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path
          d="m7.5 4.27 9 5.15M21 8l-9 5-9-5 9-5 9 5zM3 8v8l9 5 9-5V8"
          stroke={c}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  if (value === "VEHICLE_OWNER")
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path
          d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5"
          stroke={c}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
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
  root: { flex: 1, backgroundColor: color.card },
  scroll: { flexGrow: 1, paddingHorizontal: space.xl },

  back: { width: 44, height: 44, marginLeft: -12, alignItems: "center", justifyContent: "center" },

  caption: { fontSize: 12, fontWeight: "600", color: color.mutedForeground, letterSpacing: 0.5, marginTop: 22 },
  title: { fontSize: font.display, fontWeight: "700", color: color.foreground, marginTop: 6, letterSpacing: -0.4 },
  sub: { fontSize: 14, color: color.mutedForeground, marginTop: 7, lineHeight: 21 },
  strong: { fontWeight: "600", color: color.foreground },

  label: { fontSize: font.caption, fontWeight: "500", color: color.foreground, marginBottom: 6 },
  hint: { fontSize: 12, color: color.mutedForeground, marginTop: -2 },
  hintCenter: { fontSize: 12, color: color.mutedForeground, textAlign: "center", marginTop: 10 },

  phoneRow: { flexDirection: "row", gap: 8 },
  cc: {
    width: 92,
    height: 52,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  ccText: { fontSize: font.body, fontWeight: "600", color: color.foreground },

  cards: { flexDirection: "row", gap: 10 },
  channel: { flex: 1, padding: 14, borderRadius: radius.control, borderWidth: 1, borderColor: color.border },
  channelOn: { borderWidth: 2, borderColor: color.brand, backgroundColor: "#f45a180a" },
  channelTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  channelName: { fontSize: font.body, fontWeight: "600", color: color.foreground, marginTop: 10 },
  channelNote: { fontSize: 12, color: color.mutedForeground, marginTop: 2 },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { backgroundColor: color.brand, borderColor: color.brand },

  boxes: { flexDirection: "row", gap: 9, marginTop: 30 },
  box: {
    flex: 1,
    height: 62,
    borderRadius: radius.control,
    borderWidth: 1.5,
    borderColor: color.border,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  boxActive: { borderWidth: 2, borderColor: color.brand, backgroundColor: color.card },
  boxText: { fontSize: 26, fontWeight: "700", color: color.foreground },
  hidden: { position: "absolute", opacity: 0, height: 1, width: 1 },

  role: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    padding: 14,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
  },
  roleOn: { borderWidth: 2, borderColor: color.brand, backgroundColor: "#f45a180a" },
  roleIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.control,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  roleName: { fontSize: font.body, fontWeight: "600", color: color.foreground },
  roleDesc: { fontSize: 12, color: color.mutedForeground, marginTop: 2 },

  offer: { flexDirection: "row", gap: 11, marginTop: 22, alignItems: "flex-start" },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkOn: { backgroundColor: color.brand, borderColor: color.brand },
  offerText: { flex: 1, fontSize: 13, color: color.foreground, lineHeight: 20 },

  err: { fontSize: 13, color: color.danger, marginTop: space.md },
  link: { fontSize: 14, fontWeight: "600", color: color.brand },
});
