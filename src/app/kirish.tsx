/** A6 — kirish. Telefon yoki FURAM ID + parol. */
import { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Circle, Path } from "react-native-svg";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { Button, Field } from "@/components/ui";
import { api, FuramError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { color, font, radius, shadow, space } from "@/lib/theme";
import { LOCALE_INFO, currentLocale, t } from "@/lib/i18n";

type Mode = "phone" | "furamId";

export default function Kirish() {
  const [mode, setMode] = useState<Mode>("phone");
  const [phone, setPhone] = useState("");
  const [furamId, setFuramId] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ code: string; message: string } | null>(null);

  const { signIn } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cleanPhone = phone.replace(/\D/g, "");
  const locked = err?.code === "TOO_MANY_ATTEMPTS" || err?.code === "BLOCKED";
  const ready = password.length > 0 && (mode === "phone" ? cleanPhone.length >= 9 : furamId.length > 0);

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      const body =
        mode === "phone"
          ? { phone: "+998" + cleanPhone, password }
          : { furamId: Number(furamId), password };

      const res = await api<{ token?: string }>("/api/auth/login", {
        method: "POST",
        auth: false,
        body,
      });

      if (!res.token) {
        setErr({ code: "NO_TOKEN", message: t("mob.ui.supportContact") });
        return;
      }
      await signIn(res.token);
      router.replace("/bosh");
    } catch (e) {
      const f = e as FuramError;
      setErr({ code: f.code ?? "ERROR", message: f.message ?? t("mob.signIn.failed") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={s.back}>
            <Icon name="back" size={22} stroke={color.foreground} />
          </Pressable>
          <Pressable onPress={() => router.push("/til")} style={s.lang} hitSlop={8}>
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Circle cx={12} cy={12} r={10} stroke={color.mutedForeground} strokeWidth={2} fill="none" />
              <Path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z" stroke={color.mutedForeground} strokeWidth={2} fill="none" />
            </Svg>
            <Text style={s.langText}>{LOCALE_INFO[currentLocale()].native}</Text>
          </Pressable>
        </View>

        <View style={s.logoWrap}>
          <Logo width={172} />
        </View>

        <View style={s.card}>
          <Text style={s.title}>{t("mob.signIn.title")}</Text>
          <Text style={s.sub}>FURAM hisobingizga kiring.</Text>

          <View style={s.segment}>
            <SegmentButton label={t("mob.signIn.byPhone")} active={mode === "phone"} onPress={() => setMode("phone")} />
            <SegmentButton label="FURAM ID" active={mode === "furamId"} onPress={() => setMode("furamId")} />
          </View>

          {locked ? <LockedCard message={err?.message ?? t("mob.signIn.blocked")} /> : null}

          <View style={s.form}>
            {mode === "phone" ? (
              <View>
                <Text style={s.label}>{t("mob.signIn.byPhone")}</Text>
                <View style={s.phoneRow}>
                  <View style={s.cc}>
                    <Text style={s.ccText}>+998</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      placeholder="90 123 45 67"
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      textContentType="telephoneNumber"
                      value={phone}
                      onChangeText={setPhone}
                      editable={!locked}
                    />
                  </View>
                </View>
              </View>
            ) : (
              <Field
                label="FURAM ID"
                placeholder="11186"
                keyboardType="number-pad"
                value={furamId}
                onChangeText={setFuramId}
                editable={!locked}
              />
            )}

            <Field
              label={t("mob.signIn.password")}
              placeholder={t("mob.signIn.passwordPh")}
              secureTextEntry={!show}
              autoComplete="current-password"
              textContentType="password"
              value={password}
              onChangeText={setPassword}
              editable={!locked}
              right={
                <Pressable onPress={() => setShow((v) => !v)} hitSlop={10}>
                  <Svg width={20} height={20} viewBox="0 0 24 24">
                    <Path
                      d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"
                      stroke={color.mutedForeground}
                      strokeWidth={2}
                      fill="none"
                      strokeLinejoin="round"
                    />
                    <Circle cx={12} cy={12} r={3} stroke={color.mutedForeground} strokeWidth={2} fill="none" />
                    {show ? <Path d="M3 3l18 18" stroke={color.mutedForeground} strokeWidth={2} strokeLinecap="round" /> : null}
                  </Svg>
                </Pressable>
              }
            />

            {err && !locked ? <Text style={s.err}>{err.message}</Text> : null}
            {busy ? <LoginLoading /> : null}

            <Pressable hitSlop={8} onPress={() => router.push("/parol")} accessibilityRole="button">
              <Text style={s.link}>{t("mob.signIn.forgot")}</Text>
            </Pressable>
          </View>
        </View>

        <View style={s.actions}>
          <Button title={t("mob.signIn.submit")} onPress={submit} loading={busy} disabled={!ready || locked} />
          <Button title={t("mob.intro.signUp")} variant="secondary" onPress={() => router.replace("/royxat")} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SegmentButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.segItem, active && s.segOn]}>
      <Text style={[s.segText, active && s.segTextOn]}>{label}</Text>
    </Pressable>
  );
}

function LoginLoading() {
  const [x] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(x, {
        toValue: 1,
        duration: 950,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [x]);

  const translateX = x.interpolate({ inputRange: [0, 1], outputRange: [-90, 230] });

  return (
    <View style={s.loadingTrack}>
      <Animated.View style={[s.loadingBar, { transform: [{ translateX }] }]} />
    </View>
  );
}

function LockedCard({ message }: { message: string }) {
  return (
    <View style={s.locked}>
      <View style={s.lockIcon}>
        <Icon name="alert" size={22} stroke={color.danger} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.lockTitle}>{t("mob.signIn.blocked")}</Text>
        <Text style={s.lockText}>{message}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { flexGrow: 1, paddingHorizontal: space.xl },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48 },
  back: { width: 44, height: 44, marginLeft: -12, alignItems: "center", justifyContent: "center" },
  lang: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 40 },
  langText: { fontSize: 14, fontWeight: "700", color: color.mutedForeground },
  logoWrap: { alignItems: "center", marginTop: 54, marginBottom: 36 },
  card: {
    backgroundColor: color.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.xl,
    ...shadow.card,
  },
  title: { fontSize: 26, lineHeight: 32, fontWeight: "800", color: color.foreground, textAlign: "center" },
  sub: { fontSize: font.body, color: color.mutedForeground, textAlign: "center", marginTop: 6 },
  segment: { flexDirection: "row", gap: 6, padding: 4, borderRadius: 15, backgroundColor: color.muted, marginTop: space.xl },
  segItem: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  segOn: { backgroundColor: color.foreground },
  segText: { fontSize: 14, fontWeight: "800", color: color.mutedForeground },
  segTextOn: { color: "#ffffff" },
  form: { gap: space.lg, marginTop: space.xl },
  label: { fontSize: font.caption, fontWeight: "600", color: color.foreground, marginBottom: 6 },
  phoneRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  cc: {
    width: 88,
    height: 52,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
    alignItems: "center",
    justifyContent: "center",
  },
  ccText: { fontSize: font.bodyLg, fontWeight: "700", color: color.foreground },
  link: { fontSize: 14, fontWeight: "800", color: color.brand, textAlign: "right" },
  err: { fontSize: 13, color: color.danger, lineHeight: 19 },
  loadingTrack: { height: 5, borderRadius: 999, backgroundColor: "#dbeafe", overflow: "hidden" },
  loadingBar: { width: 92, height: 5, borderRadius: 999, backgroundColor: "#3556d8" },
  locked: {
    flexDirection: "row",
    gap: 12,
    marginTop: space.lg,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fff7f7",
  },
  lockIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#fee2e2", alignItems: "center", justifyContent: "center" },
  lockTitle: { fontSize: font.body, fontWeight: "800", color: color.foreground },
  lockText: { fontSize: 12.5, color: "#7f1d1d", lineHeight: 18, marginTop: 3 },
  actions: { gap: 12, marginTop: space.xl },
});
