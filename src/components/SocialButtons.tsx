/**
 * «Apple bilan» va «Google bilan» tugmalari — kirish va ro'yxat
 * ekranlarida (2026-09-15).
 *
 * ── APPLE TUGMASI — APPLE'NING O'Z KOMPONENTI ───────────────────
 *
 * Apple dizayn qoidasi (HIG) «Sign in with Apple» tugmasini FAQAT
 * ular bergan ko'rinishda chizishni talab qiladi: belgi, matn va
 * shakl o'zgartirilmaydi, matn qurilma tilida o'zi chiqadi. Qo'lda
 * chizilgan tugma tekshiruvda rad etilishga sabab bo'ladi.
 *
 * ── TUGMALAR TENG ───────────────────────────────────────────────
 *
 * 4.8-qoida Apple varianti boshqa kirish usullaridan KICHIK yoki
 * ko'rinmas joyda bo'lmasligini ham talab qiladi. Shuning uchun
 * ikkala tugma bir xil balandlik va kenglikda, yonma-yon ustunda.
 *
 * ── GOOGLE TUGMASI FAQAT SOZLANGAN SERVERDA ─────────────────────
 *
 * `/api/auth/google/status` kalit qo'yilganini aytadi. Kalitsiz
 * serverda tugma ko'rinmaydi — bosilsa Google xato sahifasini
 * ko'rsatardi (webdagi qoidaning o'zi).
 */
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import Svg, { Path } from "react-native-svg";
import { Text } from "@/components/Text";
import { Tap } from "@/components/Tap";
import { useAuth } from "@/lib/auth-context";
import { useApi } from "@/lib/use-api";
import { appleBilan, appleBormi, googleBilan, type Natija, type Provayder } from "@/lib/social-auth";
import { color, radius, size, space, themed, themeName } from "@/lib/theme";
import { t } from "@/lib/i18n";

export function SocialButtons({ role }: { role?: string | null }) {
  const router = useRouter();
  const { signIn } = useAuth();
  const { data: gs } = useApi<{ ready: boolean }>("/api/auth/google/status");
  const [apple, setApple] = useState(false);
  const [busy, setBusy] = useState<Provayder | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void appleBormi().then((v) => {
      if (alive) setApple(v);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function run(p: Provayder) {
    if (busy) return;
    setErr(null);
    setBusy(p);
    let r: Natija;
    try {
      r = p === "google" ? await googleBilan() : await appleBilan();
    } finally {
      setBusy(null);
    }
    if (r.tur === "kirdi") {
      await signIn(r.token);
      router.replace("/bosh");
    } else if (r.tur === "yangi") {
      /* Rol `rol.tsx` da tanlangan bo'lsa formaga olib o'tiladi —
         odam uni ikkinchi marta tanlamasin */
      router.push({ pathname: "/ijtimoiy-royxat", params: role ? { role } : {} });
    } else if (r.tur === "xato") {
      setErr(r.matn);
    }
  }

  const google = gs?.ready === true;
  if (!google && !apple) return null;

  return (
    <View style={s.wrap}>
      <View style={s.orRow}>
        <View style={s.line} />
        <Text style={s.or}>{t("mob.social.or")}</Text>
        <View style={s.line} />
      </View>

      <View style={{ gap: 10 }}>
        {apple ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={
              themeName() === "dark"
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={radius.control}
            style={s.apple}
            onPress={() => void run("apple")}
          />
        ) : null}

        {google ? (
          <Tap
            onPress={() => void run("google")}
            disabled={busy !== null}
            style={s.google}
            accessibilityLabel={t("mob.social.google")}
          >
            <GoogleG />
            <Text style={s.googleText}>{t("mob.social.google")}</Text>
          </Tap>
        ) : null}
      </View>

      {busy ? (
        <View style={s.busy}>
          <ActivityIndicator color={color.mutedForeground} />
        </View>
      ) : null}
      {err ? <Text style={s.err}>{err}</Text> : null}
    </View>
  );
}

/** Google'ning rasmiy «G» belgisi — ranglari brend qoidasi bo'yicha o'zgartirilmaydi */
function GoogleG() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18">
      <Path
        fill="#EA4335"
        d="M9 3.48c1.69 0 2.83.73 3.48 1.34l2.54-2.48C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.91 2.26C4.6 5.05 6.62 3.48 9 3.48z"
      />
      <Path
        fill="#4285F4"
        d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <Path
        fill="#FBBC05"
        d="M3.88 10.78A5.54 5.54 0 0 1 3.58 9c0-.62.11-1.22.29-1.78L.96 4.96A9.008 9.008 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.92-2.26z"
      />
      <Path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.4-1.57-5.12-3.74L.97 13.04C2.45 15.98 5.48 18 9 18z"
      />
    </Svg>
  );
}

const s = themed(() => ({
  wrap: { marginTop: space.xl },
  orRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: space.lg },
  line: { flex: 1, height: 1, backgroundColor: color.border },
  or: { fontSize: 12.5, color: color.mutedForeground },
  /* Apple komponenti o'lchamni o'zi olmaydi — balandlik aniq beriladi,
     Google tugmasi bilan TENG bo'lishi uchun */
  apple: { width: "100%", height: size.controlLg },
  google: {
    height: size.controlLg,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleText: { fontSize: 15.5, fontWeight: "600", color: color.foreground },
  busy: { marginTop: space.md, alignItems: "center" },
  err: { marginTop: space.md, fontSize: 13, color: color.dangerText, textAlign: "center" },
}));
