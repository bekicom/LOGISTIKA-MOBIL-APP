/**
 * Bozor narxi tahlili — e'lon berishdan OLDIN.
 *
 * ── NEGA E'LON BERISHDA ─────────────────────────────────────────
 *
 * Narx qo'yilgandan keyin «bozordan 40% qimmat» deb aytish
 * kechikkan gap: e'lon allaqachon lentada turadi va hech kim
 * qo'ng'iroq qilmaydi. Shuning uchun javob shu yerda, narx
 * kiritilayotgan paytda beriladi.
 *
 * ── RAQAM BAZADAN, GAP MODELDAN ─────────────────────────────────
 *
 * Mediana, chorak va namuna soni SQL bilan hisoblanadi. Model faqat
 * bir-ikki jumla yozadi. Shuning uchun «bozor narxi qancha» degan
 * savolga javob har safar bir xil chiqadi.
 *
 * ⚠️ Namuna kam bo'lsa xulosa CHIQARILMAYDI: uchta e'londan
 * «bozor narxi» yasash — o'ylab topilgan raqam.
 */
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { api, FuramError } from "@/lib/api";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Stat = {
  currency: string;
  count: number;
  sold: number;
  min: number;
  max: number;
  p25: number;
  median: number;
  p75: number;
  enough: boolean;
};
type Answer = {
  sample: number;
  enough: boolean;
  minSample: number;
  days: number;
  stat: Stat | null;
  position: { diffPct: number; band: "low" | "fair" | "high" } | null;
  ai: string | null;
};

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(Math.round(n));

const BAND: Record<string, { key: string; tone: string }> = {
  low: { key: "mob.price.low", tone: color.success },
  fair: { key: "mob.price.fair", tone: color.brand },
  high: { key: "mob.price.high", tone: color.warning },
};

export function PriceAnalysis({
  category,
  year,
  odometer,
  price,
  currency,
}: {
  category: string | null;
  year: number | null;
  odometer: number | null;
  price: number | null;
  currency: string;
}) {
  const [res, setRes] = useState<Answer | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const ready = !!category;

  async function run() {
    if (!category) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await api<Answer>("/api/market/price-analysis", {
        method: "POST",
        body: { category, year, odometer, price, currency },
      });
      setRes(r);
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
          <Icon name="chart" size={17} stroke={color.brand} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.title}>{t("mob.price.title")}</Text>
          <Text style={s.hint}>{t("mob.price.lead")}</Text>
        </View>
      </View>

      {res ? (
        res.enough && res.stat ? (
          <View style={{ marginTop: space.md }}>
            <Text style={s.median}>
              {fmt(res.stat.median)} {res.stat.currency}
            </Text>
            <Text style={s.hint}>
              {t("mob.price.range", {
                a: fmt(res.stat.p25),
                b: fmt(res.stat.p75),
                cur: res.stat.currency,
              })}
            </Text>
            <Text style={s.hint}>
              {t("mob.price.sample", { n: res.stat.count, d: res.days })}
            </Text>

            {res.position ? (
              <View
                style={[
                  s.band,
                  { backgroundColor: (BAND[res.position.band]?.tone ?? color.brand) + "1a" },
                ]}
              >
                <Text style={[s.bandText, { color: BAND[res.position.band]?.tone }]}>
                  {t(BAND[res.position.band]?.key ?? "mob.price.fair")} ·{" "}
                  {res.position.diffPct > 0 ? "+" : ""}
                  {res.position.diffPct}%
                </Text>
              </View>
            ) : null}

            {res.ai ? <Text style={s.ai}>{res.ai}</Text> : null}
          </View>
        ) : (
          <Text style={s.hint}>
            {t("mob.price.tooFew", { n: res.sample, min: res.minSample })}
          </Text>
        )
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
          {busy ? t("mob.diag.thinking") : res ? t("mob.aiSum.again") : t("mob.price.run")}
        </Text>
      </Pressable>
      {!ready ? <Text style={s.hint}>{t("mob.price.needCategory")}</Text> : null}
    </View>
  );
}

const s = themed(() => ({
  box: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.brand + "33",
    backgroundColor: color.brandSoft,
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
  median: {
    fontSize: 24,
    fontWeight: "800",
    color: color.foreground,
    fontVariant: ["tabular-nums"],
  },
  band: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  bandText: { fontSize: 12, fontWeight: "800" },
  ai: { fontSize: 13, color: color.foreground, marginTop: 10, lineHeight: 19 },

  btn: {
    height: 44,
    borderRadius: radius.control,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: space.md,
  },
  btnText: { fontSize: 13.5, fontWeight: "800", color: "#fff" },
}));
