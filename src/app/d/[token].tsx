/**
 * Haydovchilikka taklifni qabul qilish (TZ v2 §4.2, 2026-10-27).
 *
 * Ega «Biriktirish» bosadi → haydovchiga bildirishnoma (`/d/<token>`) →
 * shu ekran. Webdagi `/d/[token]` sahifasining o'zi; qabul qilish mantiqi
 * serverda (`/api/driver-invites/[token]`): o'rin band, boshqa egada
 * ishlayotgan va h.k. — hammasi o'sha yerda tekshiriladi.
 */
import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { Button, Header } from "@/components/ui";
import { ErrorBox, Skeleton } from "@/components/state";
import { useApi } from "@/lib/use-api";
import { api, FuramError } from "@/lib/api";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Taklif = { state: string; ownerName: string; vehicle: string | null; plate: string | null };

export default function TaklifQabul() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { data, error, loading, reload } = useApi<Taklif>(token ? `/api/driver-invites/${encodeURIComponent(token)}` : null, [token]);
  const [band, setBand] = useState(false);
  const [ok, setOk] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  async function qabul() {
    setBand(true);
    setXato(null);
    try {
      await api(`/api/driver-invites/${encodeURIComponent(String(token))}`, { method: "POST" });
      setOk(true);
    } catch (e) {
      setXato((e as FuramError).message ?? t("mob.msg.actionFailed"));
    } finally {
      setBand(false);
    }
  }

  return (
    <View style={s.root}>
      <Header title={t("haydovchiTop.qabulTitle")} />
      <View style={s.body}>
        {loading && !data ? <Skeleton rows={2} /> : null}
        {error && !data ? <ErrorBox message={error} onRetry={reload} /> : null}
        {data ? (
          <View style={s.card}>
            <Text style={s.text}>
              {t("haydovchiTop.qabulMatn", { ega: data.ownerName, mashina: data.vehicle ?? "", raqam: data.plate ?? "" })}
            </Text>
            {ok ? (
              <>
                <Text style={[s.text, { color: color.success, fontFamily: "Manrope_700Bold" }]}>{t("haydovchiTop.qabulOk")}</Text>
                <Button title={t("mob.common.continueBtn")} onPress={() => router.replace("/panelim")} />
              </>
            ) : data.state !== "ok" ? (
              <Text style={[s.text, { color: color.danger }]}>{t("haydovchiTop.eskirgan")}</Text>
            ) : (
              <Button title={t("haydovchiTop.qabul")} onPress={() => void qabul()} loading={band} />
            )}
            {xato ? <Text style={[s.text, { color: color.danger }]}>{xato}</Text> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  body: { padding: space.lg },
  card: { padding: space.md, borderRadius: radius.card, backgroundColor: color.card, gap: space.md, ...shadow.card },
  text: { fontSize: 15, color: color.foreground, lineHeight: 21 },
}));
