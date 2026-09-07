/**
 * Eslatma oynasi — profil bo'shlig'i, o'rgatish va oferta.
 *
 * ── BITTA NAVBAT, BITTA OYNA ────────────────────────────────────
 *
 * Serverdagi qoida shu (`lib/nudge.ts`): mijoz «har soatda ko'pi
 * bilan bitta eslatma» so'ragan. Ikki navbat bo'lsa odam soatiga
 * ikki oyna ko'radi va ikkinchisini birinchisini yopgan barmog'i
 * bilan yopadi — ya'ni aynan ko'rsatilishi kerak bo'lgan gap
 * o'qilmay ketadi.
 *
 * Oferta ham SHU navbatga qo'shildi: u alohida chiqsa, yuqoridagi
 * hisob buzilardi. Tartib: oferta birinchi (huquqiy shart), keyin
 * serverning navbati.
 *
 * ── QAROR SERVERDA ──────────────────────────────────────────────
 *
 * Nimani ko'rsatish, qachon takrorlash, qaysi bo'limni eslatish —
 * hammasi `/api/profile-gap` da hal qilinadi. Ilova faqat chizadi
 * va javobni («keyinroq» / «ko'rdim») qaytaradi. Aks holda web va
 * ilova bir xil odamga ikki xil eslatma berardi.
 *
 * ── MEHMONGA CHIQMAYDI ──────────────────────────────────────────
 *
 * Uning profili yo'q — to'ldiradigan narsasi ham yo'q.
 */
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { Button } from "@/components/ui";
import { api } from "@/lib/api";
import { isGuest } from "@/lib/guest";
import { useAuth } from "@/lib/auth-context";
import { webToApp } from "@/lib/routes";
import { color, radius, space } from "@/lib/theme";
import { t, tOr } from "@/lib/i18n";

type Gap = {
  role: string;
  href: string;
  empty: boolean;
  missing: string[];
  pct?: number;
};
type Step = { section: string; href: string; state: "NEW" | "SHOWN" };
type Nudge = { kind: "PROFILE"; gap: Gap } | { kind: "ONBOARD"; step: Step };

export function NudgeGate() {
  const { user, offerAccepted } = useAuth();
  const router = useRouter();
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const [offer, setOffer] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user || isGuest()) return;
    /* Oferta birinchi: u huquqiy shart, qolgani maslahat */
    if (offerAccepted === false) {
      setOffer(true);
      return;
    }
    try {
      const r = await api<{ nudge: Nudge | null }>("/api/profile-gap");
      setNudge(r.nudge);
    } catch {
      /* Eslatma chiqmasa hech narsa buzilmaydi — jim o'tamiz.
         Bu ekran emas, qo'shimcha: xato oynasi chiqarsak, ilova
         ochilishida sababsiz qizil xabar ko'rinardi. */
    }
  }, [user, offerAccepted]);

  useEffect(() => {
    void load();
  }, [load]);

  async function acceptOffer() {
    setBusy(true);
    try {
      await api("/api/offer/accept", { method: "POST" });
      setOffer(false);
      void load();
    } finally {
      setBusy(false);
    }
  }

  /** «Keyinroq» — server muhlatni o'zi hisoblaydi */
  async function later() {
    setNudge(null);
    await api("/api/profile-gap/snooze", { method: "POST" }).catch(() => null);
  }

  /** O'rgatish eslatmasi ko'rsatilgani yoziladi — ikkinchi marta
      «yangi imkoniyat» deb chiqmasin */
  async function open(href: string) {
    const to = webToApp(href);
    setNudge(null);
    await api("/api/profile-gap/shown", { method: "POST" }).catch(() => null);
    if (to) router.push(to as Parameters<typeof router.push>[0]);
  }

  /* ── Oferta ── */
  if (offer) {
    return (
      <Sheet open onClose={() => setOffer(false)} title={t("mob.offer.title")}>
        <Text style={s.body}>{t("mob.offer.body")}</Text>
        <View style={{ marginTop: space.lg, gap: 9 }}>
          <Button title={t("mob.offer.accept")} loading={busy} onPress={acceptOffer} />
          <Button title={t("mob.common.cancel")} variant="ghost" onPress={() => setOffer(false)} />
        </View>
      </Sheet>
    );
  }

  if (!nudge) return null;

  /* ── Profil bo'shlig'i ── */
  if (nudge.kind === "PROFILE") {
    const g = nudge.gap;
    return (
      <Sheet
        open
        onClose={later}
        title={g.empty ? t("profileGap.titleStart") : t("profileGap.titleFinish")}
      >
        <Text style={s.body}>{t("profileGap.body")}</Text>

        {g.missing.length > 0 ? (
          <View style={s.list}>
            <Text style={s.listTitle}>{t("profileGap.missingTitle")}</Text>
            <ScrollView style={{ maxHeight: 190 }}>
              {g.missing.map((f) => (
                <View key={f} style={s.row}>
                  <Icon name="alert" size={14} stroke={color.warning} />
                  <Text style={s.rowText}>{tOr(`profileGapField.${f}`, f)}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={{ marginTop: space.lg, gap: 9 }}>
          <Button title={t("profileGap.cta")} onPress={() => open(g.href)} />
          <Pressable onPress={later} hitSlop={8}>
            <Text style={s.later}>{t("profileGap.later")}</Text>
          </Pressable>
        </View>
      </Sheet>
    );
  }

  /* ── O'rgatish ── */
  const st = nudge.step;
  return (
    <Sheet open onClose={later} title={tOr(`svc.${st.section}`, st.section)}>
      {st.state === "SHOWN" ? <Text style={s.again}>{t("onboard.again")}</Text> : null}
      <Text style={s.body}>{tOr(`onboardBody.${st.section}`, "")}</Text>
      <Text style={s.hint}>{t("onboard.openHint")}</Text>

      <View style={{ marginTop: space.lg, gap: 9 }}>
        <Button title={t("onboard.cta")} onPress={() => open(st.href)} />
        <Pressable onPress={later} hitSlop={8}>
          <Text style={s.later}>{t("onboard.later")}</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  body: { fontSize: 14, color: color.foreground, lineHeight: 21 },
  hint: { fontSize: 12, color: color.mutedForeground, marginTop: 8, lineHeight: 18 },
  again: { fontSize: 12.5, fontWeight: "700", color: color.warning, marginBottom: 8 },

  list: {
    marginTop: space.md,
    backgroundColor: color.muted,
    borderRadius: radius.control,
    padding: space.md,
  },
  listTitle: { fontSize: 12, fontWeight: "800", color: color.mutedForeground, marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  rowText: { flex: 1, fontSize: 13, color: color.foreground },

  later: { fontSize: 13, fontWeight: "700", color: color.mutedForeground, textAlign: "center" },
});
