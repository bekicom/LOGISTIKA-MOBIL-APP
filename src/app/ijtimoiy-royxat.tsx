/**
 * Google yoki Apple bilan ro'yxatdan o'tishni tugatish (2026-09-15).
 *
 * Google/Apple faqat «kimligini» tasdiqlaydi. Hisob uchun esa rol va
 * ofertaga rozilik SHART — telefon bilan ro'yxatdagi kabi. Shuning
 * uchun yangi odam shu formadan o'tadi.
 *
 * ── TELEFON VA PAROL YO'Q ───────────────────────────────────────
 *
 * Telefon so'ralmaydi (Bekzodning qarori): e'lon berganda yoki kontakt
 * ochganda so'raladi (`PHONE_REQUIRED`). Parol ham yo'q — odam Google
 * yoki Apple bilan kiradi, keyin xohlasa telefon qo'shib parol qo'yadi.
 *
 * Forma webdagi `/register/google` bilan bir xil maydonlarda; ko'rinishi
 * esa ilovadagi `royxat.tsx` ning 3-qadami bilan bir xil — odam ikki
 * xil forma ko'rmasin.
 */
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Text } from "@/components/Text";
import { AuthShell } from "@/components/AuthShell";
import { RolePicker, RolTanlangan } from "@/components/RolePicker";
import { Button, Field } from "@/components/ui";
import { api, FuramError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { kutilayotganOl, kutilayotganTozala } from "@/lib/social-auth";
import { color, font, space, themed } from "@/lib/theme";
import { boshlangichRol, eskiRol, type RoyxatRol } from "@/lib/rollar";
import { t } from "@/lib/i18n";

export default function IjtimoiyRoyxat() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { role: roleParam } = useLocalSearchParams<{ role?: string }>();
  /* Rol — `royxat.tsx` bilan bir xil qoida (TZ-04): 11 tadan biri,
     oldindan tanlanmagan bo'lsa standart qiymat QO'YILMAYDI */
  const preset = boshlangichRol(roleParam);

  /* Ilova qayta ishga tushsa yo'qoladi — shunda «vaqt o'tdi» deyiladi */
  const [y] = useState(kutilayotganOl);
  const [firstName, setFirstName] = useState(y?.firstName ?? "");
  const [lastName, setLastName] = useState(y?.lastName ?? "");
  const [rol, setRol] = useState<RoyxatRol | null>(preset);
  const [tanlovOchiq, setTanlovOchiq] = useState(!preset);
  const [ownerId, setOwnerId] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [expired, setExpired] = useState(!y);

  async function submit() {
    if (!y || !rol) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await api<{ token?: string }>(
        y.provayder === "google" ? "/api/auth/google/register" : "/api/auth/apple/register",
        {
          method: "POST",
          auth: false,
          body: {
            kutilayotgan: y.kutilayotgan,
            firstName: ism || undefined,
            lastName: lastName.trim() || undefined,
            /* `roleKey` — sinov muddati shu zahoti ochiladi (TZ-04);
               `role` — eski majburiy ustun */
            role: eskiRol(rol),
            roleKey: rol,
            ownerFuramId: rol === "DRIVER" && Number(ownerId) > 0 ? Number(ownerId) : undefined,
            referralCode: y.referralCode || undefined,
            acceptOffer: true,
          },
        },
      );
      if (!res.token) throw new Error("token");
      kutilayotganTozala();
      await signIn(res.token);
      router.replace("/bosh");
    } catch (e) {
      const f = e as FuramError;
      /* Muddati o'tgan — formani qayta to'ldirish befoyda, qaytadan
         Google/Apple bilan boshlash kerak */
      if (f.code === "EXPIRED") setExpired(true);
      else setErr(f.message ?? t("googleAuth.errGeneric"));
    } finally {
      setBusy(false);
    }
  }

  /* Google'da ism shart (Google uni doim beradi), Apple'da ixtiyoriy —
     lekin yozilsa kamida 2 harf (server bilan bir xil qoida) */
  const ism = firstName.trim();
  const ismYaroqli = y?.provayder === "apple" ? ism.length === 0 || ism.length >= 2 : ism.length >= 2;

  const sub = !y
    ? undefined
    : y.provayder === "google"
      ? t("googleAuth.finishSub", { email: y.email })
      : y.email
        ? t("mob.social.finishApple", { email: y.email })
        : t("mob.social.finishAppleHidden");

  return (
    <AuthShell
      title={t("googleAuth.finishTitle")}
      subtitle={sub}
      compact
      onBack={() => (router.canGoBack() ? router.back() : router.replace("/kirish"))}
    >
      {expired ? (
        <View style={{ gap: space.lg }}>
          <Text style={s.sub}>{t("mob.social.expired")}</Text>
          <Button title={t("mob.intro.signIn")} onPress={() => router.replace("/kirish")} />
        </View>
      ) : (
        <>
          <View style={{ gap: space.lg }}>
            <Field
              label={t("googleAuth.firstName")}
              /* Apple'da ixtiyoriy: ism faqat birinchi ruxsatda keladi */
              hint={y?.provayder === "apple" ? t("mob.common.optional") : undefined}
              placeholder={t("mob.profile.firstName")}
              value={firstName}
              onChangeText={setFirstName}
              autoFocus={!firstName}
            />
            <Field
              label={t("googleAuth.lastName")}
              hint={t("mob.common.optional")}
              placeholder={t("mob.profile.lastName")}
              value={lastName}
              onChangeText={setLastName}
            />
          </View>

          <Text style={[s.label, { marginTop: space.xxl }]}>{t("googleAuth.roleLabel")}</Text>
          <View style={{ marginTop: space.sm }}>
            {rol && !tanlovOchiq ? (
              <RolTanlangan rol={rol} onChange={() => setTanlovOchiq(true)} />
            ) : (
              <RolePicker value={rol} onChange={setRol} />
            )}
          </View>

          {rol === "DRIVER" ? (
            /* Haydovchi — egasiga TAKLIF ketadi, telefon bilan ro'yxatdagi kabi */
            <View style={{ marginTop: space.lg }}>
              <Field
                label={t("googleAuth.ownerId")}
                placeholder="10005"
                keyboardType="number-pad"
                value={ownerId}
                onChangeText={(v) => setOwnerId(v.replace(/\D/g, "").slice(0, 9))}
              />
            </View>
          ) : null}

          <Pressable
            onPress={() => setAgreed((v) => !v)}
            style={s.offer}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
          >
            <View style={[s.check, agreed && s.checkOn]}>{agreed ? <Tick size={13} /> : null}</View>
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
              title={t("googleAuth.submit")}
              onPress={submit}
              loading={busy}
              disabled={!rol || !agreed || !ismYaroqli}
            />
            {!agreed ? <Text style={s.hintCenter}>{t("mob.signUp.offerRequired")}</Text> : null}
          </View>
        </>
      )}
    </AuthShell>
  );
}

function Tick({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M20 6 9 17l-5-5"
        stroke="#fff"
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/* Uslublar `royxat.tsx` ning 3-qadami bilan bir xil — odam ikki xil
   forma ko'rmasin */
const s = themed(() => ({
  sub: { fontSize: 14, color: color.mutedForeground, lineHeight: 21 },
  label: { fontSize: font.caption, fontWeight: "500", color: color.foreground, marginBottom: 6 },
  hintCenter: { fontSize: 12, color: color.mutedForeground, textAlign: "center", marginTop: 10 },
  offer: { flexDirection: "row", gap: 11, marginTop: 22, alignItems: "flex-start" },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: color.iconFaint,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkOn: { backgroundColor: color.brand, borderColor: color.brand },
  offerText: { flex: 1, fontSize: 13, color: color.foreground, lineHeight: 20 },
  err: { fontSize: 13, color: color.danger, marginTop: space.md },
  link: { fontSize: 13, fontWeight: "600", color: color.blue },
}));
