/**
 * AI xizmatlari (OpenAI) — rozilikni ko'rish va QAYTARIB OLISH
 * (2026-09-19, B3; Apple 5.1.2(i) — rozilik bir tomonlama eshik
 * bo'lmasligi kerak).
 *
 * O'chirilgach: bu odamning ma'lumoti OpenAI ga ketmaydi (server har
 * AI chaqiruvida tekshiradi), uning xabari suhbatdoshlarga tarjima
 * qilinmaydi. Yoqilganda — oynadagi matnning o'zi shu yerda ham turadi:
 * odam nimaga rozi bo'layotganini ko'rib yoqadi.
 */
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header, Notice, Switch } from "@/components/ui";
import { AiRozilikBandlari, aiRozilikniYoz } from "@/components/AiRozilik";
import { FuramError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { t } from "@/lib/i18n";
import { color, radius, shadow, space, themed } from "@/lib/theme";

export default function AiXizmatlari() {
  const insets = useSafeAreaInsets();
  const { aiRozilik, setAiRozilik } = useAuth();
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  async function ozgartir(v: boolean) {
    setBand(true);
    setXato(null);
    try {
      await aiRozilikniYoz(v);
      setAiRozilik(v);
    } catch (e) {
      setXato((e as FuramError).message ?? t("mob.err.generic"));
    } finally {
      setBand(false);
    }
  }

  const holat =
    aiRozilik === true
      ? t("aiRozilik.yoqilgan")
      : aiRozilik === false
        ? t("aiRozilik.ochirilgan")
        : t("aiRozilik.soralmagan");

  return (
    <View style={s.root}>
      <Header title={t("aiRozilik.sozlama")} />
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}>
        <View style={s.card}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{t("aiRozilik.sozlama")}</Text>
            <Text style={[s.holat, { color: aiRozilik ? color.success : color.mutedForeground }]}>{holat}</Text>
          </View>
          <Switch value={aiRozilik === true} onValueChange={(v) => void ozgartir(v)} disabled={band} />
        </View>
        <Text style={s.izoh}>{t("aiRozilik.sozlamaIzoh")}</Text>
        {xato ? <Notice tone="danger">{xato}</Notice> : null}

        <View style={s.matn}>
          <Text style={s.lead}>{t("aiRozilik.lead")}</Text>
          <AiRozilikBandlari />
          <Text style={s.note}>{t("aiRozilik.note")}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.lg,
    ...shadow.card,
  },
  title: { fontSize: 15, fontWeight: "700", color: color.foreground },
  holat: { fontSize: 12.5, fontWeight: "600", marginTop: 3 },
  izoh: { fontSize: 12.5, lineHeight: 19, color: color.mutedForeground, marginHorizontal: 4 },
  matn: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
  },
  lead: { fontSize: 14, lineHeight: 21, color: color.foreground },
  note: { fontSize: 12.5, lineHeight: 19, color: color.mutedForeground },
}));
