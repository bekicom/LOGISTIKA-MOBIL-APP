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

/**
 * Google/Apple kirishning umumiy mantiqi — tugma QAYERDA turishidan
 * qat'i nazar (ro'yxatdagi «Telegram | SMS | Google» qatori yoki
 * kirish ekranining tepasi).
 *
 * Natija bir xil ishlanadi: hisob bor — ichkariga, yangi odam —
 * ro'yxat formasiga, bekor qilingan — hech narsa, xato — matn.
 */
export function useSocialSignIn(role?: string | null) {
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

  return { google: gs?.ready === true, apple, busy, err, run };
}

/**
 * Kirish ekranining TEPASIDAGI tugmalar — webdagi `/login` bilan bir
 * xil tartib: avval Google (va iPhone'da Apple), keyin «yoki telefon
 * raqam bilan» chizig'i va forma.
 *
 * Ilgari formaning OSTIDA turardi va Bekzod telefonda uni ko'rmadi —
 * pastga aylantirish kerak edi.
 */
export function SocialButtons({ role }: { role?: string | null }) {
  const { google, apple, busy, err, run } = useSocialSignIn(role);
  if (!google && !apple) return null;

  return (
    <View style={s.wrap}>
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

      {/* «yoki telefon raqam bilan» — webdagi matnning o'zi */}
      <View style={s.orRow}>
        <View style={s.line} />
        <Text style={s.or}>{t("googleAuth.or")}</Text>
        <View style={s.line} />
      </View>
    </View>
  );
}

/**
 * Apple belgisi — «Sign in with Apple» tugmasi uchun.
 *
 * Apple dizayn qoidasi joy tor bo'lganda FAQAT BELGILI tugmaga ruxsat
 * beradi: qora (yoki oq) fon, belgi, yozuvsiz. «Telegram | SMS» qatoridagi
 * kartochka shu. Yozuvli tugma esa faqat Apple'ning o'z komponenti.
 */
export function AppleLogo({ size = 20, fill = "#ffffff" }: { size?: number; fill?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={fill}
        d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z"
      />
    </Svg>
  );
}

/** Google'ning rasmiy «G» belgisi — ranglari brend qoidasi bo'yicha o'zgartirilmaydi */
export function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
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
  wrap: { marginBottom: space.sm },
  orRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: space.lg, marginBottom: space.md },
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
