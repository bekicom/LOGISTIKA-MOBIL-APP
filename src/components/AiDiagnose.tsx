/**
 * AI tashxis — «nima buzilgan bo'lishi mumkin» (TZ 15).
 *
 * ── NEGA TAXMIN, JAVOB EMAS ─────────────────────────────────────
 *
 * Model mashinani ko'rmaydi. Uning gapi USTAGA borishdan oldin
 * yo'nalish beradi: qaysi mutaxassis kerakligini aytadi va odam
 * «tormoz» deb yozganida elektrikni chaqirmaydi. Shuning uchun
 * javob «ehtimoliy sabablar» deb ataladi va narx aytilmaydi —
 * server modeldan narx aytgan javoblarni tashlab yuboradi.
 *
 * ── TARIF YOPIQ BO'LSA HAM XATO EMAS ────────────────────────────
 *
 * Server 200 qaytaradi va sababini `state` da aytadi: forma
 * joyida, odam muammosini o'zi yozib buyurtma beraveradi.
 */
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { api, FuramError } from "@/lib/api";
import { color, radius, space, themed } from "@/lib/theme";
import { serviceSpecLabel, t } from "@/lib/i18n";

type Cause = { text: string; speciality: string | null };
type Result = { state: string; causes: Cause[]; message: string | null };

export function AiDiagnose({
  problem,
  onPickSpec,
}: {
  problem: string;
  /** Model aytgan mutaxassislikni formaga qo'yish */
  onPickSpec?: (key: string) => void;
}) {
  const [res, setRes] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const ready = problem.trim().length >= 3;

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ result: Result }>("/api/ai/service/diagnose", {
        method: "POST",
        body: { problem: problem.trim() },
      });
      setRes(r.result);
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.box}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
        <View style={s.icon}>
          <Icon name="sparkle" size={17} stroke={color.purple} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.title}>{t("mob.diag.title")}</Text>
          <Text style={s.hint}>{t("mob.diag.lead")}</Text>
        </View>
      </View>

      {res && res.causes.length > 0 ? (
        <View style={{ gap: 7, marginTop: space.md }}>
          {res.causes.map((c, i) => (
            <Pressable
              key={i}
              disabled={!c.speciality || !onPickSpec}
              onPress={() => c.speciality && onPickSpec?.(c.speciality)}
              style={({ pressed }) => [s.cause, pressed && { opacity: 0.85 }]}
            >
              <Text style={s.causeText}>{c.text}</Text>
              {c.speciality ? (
                <View style={s.spec}>
                  <Text style={s.specText}>{serviceSpecLabel(c.speciality)}</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
          <Text style={s.hint}>{t("mob.diag.note")}</Text>
        </View>
      ) : null}

      {res && res.causes.length === 0 ? (
        <Text style={s.hint}>{res.message ?? t("mob.diag.nothing")}</Text>
      ) : null}

      {err ? <Text style={[s.hint, { color: color.danger }]}>{err}</Text> : null}

      <Pressable
        onPress={run}
        disabled={busy || !ready}
        style={({ pressed }) => [
          s.btn,
          (pressed || busy) && { opacity: 0.85 },
          !ready && { opacity: 0.45 },
        ]}
      >
        <Text style={s.btnText}>
          {busy ? t("mob.diag.thinking") : res ? t("mob.aiSum.again") : t("mob.diag.run")}
        </Text>
      </Pressable>
      {!ready ? <Text style={s.hint}>{t("mob.diag.needText")}</Text> : null}
    </View>
  );
}

const s = themed(() => ({
  box: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.purple + "33",
    backgroundColor: color.purpleSoft,
    padding: space.md,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: color.card,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 14, fontWeight: "800", color: color.foreground },
  hint: { fontSize: 11.5, color: color.mutedForeground, marginTop: 5, lineHeight: 17 },

  cause: {
    backgroundColor: color.card,
    borderRadius: radius.control,
    padding: space.md,
    gap: 7,
  },
  causeText: { fontSize: 13.5, color: color.foreground, lineHeight: 19 },
  spec: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: color.purpleSoft,
  },
  specText: { fontSize: 11.5, fontWeight: "700", color: color.purple },

  btn: {
    height: 44,
    borderRadius: radius.control,
    backgroundColor: color.purple,
    alignItems: "center",
    justifyContent: "center",
    marginTop: space.md,
  },
  btnText: { fontSize: 13.5, fontWeight: "800", color: "#fff" },
}));
