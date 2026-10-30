/**
 * Texnik yordam (TZ 29-okt §6.1.3) — webdagi `/texnik-yordam` bilan bir xil.
 * Joylashuv telefondan olinadi → egaga xabar (reys bo'lsa MAVJUD SOS, sabab
 * «Mashina buzildi») → yaqin ustalar, ko'chma usta/evakuator, zapchast,
 * «Yo'lda yordam» guruhi.
 */
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { Text } from "@/components/Text";
import { Tap } from "@/components/Tap";
import { Header } from "@/components/ui";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

export default function TexnikYordam() {
  const router = useRouter();
  const { data } = useApi<{ guruhChatId: string | null; reysId: string | null }>("/api/texnik-yordam");
  const [nuqta, setNuqta] = useState<{ lat: number; lng: number } | null>(null);
  const [xato, setXato] = useState(false);
  const [yuborildi, setYuborildi] = useState(false);

  useEffect(() => {
    let tirik = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") throw new Error("perm");
        const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (tirik) setNuqta({ lat: p.coords.latitude, lng: p.coords.longitude });
      } catch {
        if (tirik) setXato(true);
      }
    })();
    return () => {
      tirik = false;
    };
  }, []);

  async function egaga() {
    if (!nuqta) return;
    if (data?.reysId) {
      await api(`/api/trips/${data.reysId}/sos`, { method: "POST", body: { reason: "BREAKDOWN", ...nuqta } }).catch(() => null);
    }
    await api("/api/texnik-yordam", { method: "POST", body: nuqta }).catch(() => null);
    setYuborildi(true);
  }

  const near = nuqta ? `${nuqta.lat.toFixed(5)},${nuqta.lng.toFixed(5)}` : null;

  return (
    <View style={s.root}>
      <Header title={t("tz5e.texnikYordam")} subtitle={t("tz5e.texYordamSub")} />
      <ScrollView contentContainerStyle={s.list}>
        <Text style={s.sub}>
          📍 {nuqta ? `${nuqta.lat.toFixed(4)}, ${nuqta.lng.toFixed(4)}` : xato ? t("tz5e.joyYuborilmadi") : t("tz5e.joyAniqlanmoqda")}
        </Text>
        <Tap onPress={() => void egaga()} feel="action" disabled={!nuqta || yuborildi} style={[s.sos, (!nuqta || yuborildi) && { opacity: 0.6 }]}>
          <Text style={s.sosTxt}>{yuborildi ? `✓ ${t("tz5e.xabarYuborildi")}` : `🆘 ${t("tz5e.egagaXabarBer")}`}</Text>
        </Tap>
        <Tap onPress={() => router.push((near ? `/ustaxona?near=${near}` : "/ustaxona") as never)} style={s.btn}>
          <Text style={s.btnTxt}>🔧 {t("tz5e.yaqinUstalar")}</Text>
        </Tap>
        <Tap onPress={() => router.push("/usta-chaqirish" as never)} style={s.btn}>
          <Text style={s.btnTxt}>🚚 {t("tz5e.koChmaUsta")}</Text>
        </Tap>
        <Tap onPress={() => router.push("/zapchast" as never)} style={s.btn}>
          <Text style={s.btnTxt}>⚙️ {t("tz5e.zapchastDokon")}</Text>
        </Tap>
        {data?.guruhChatId ? (
          <Tap onPress={() => router.push(`/suhbat/${data.guruhChatId}` as never)} style={s.btn}>
            <Text style={s.btnTxt}>💬 {t("tz5e.yoldaYordamGuruh")}</Text>
          </Tap>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  list: { padding: space.lg, gap: 10 },
  sub: { fontSize: 13, color: color.mutedForeground },
  sos: { padding: 16, borderRadius: radius.card, backgroundColor: color.danger },
  sosTxt: { fontSize: 16, fontWeight: "800", color: "#ffffff" },
  btn: { padding: 16, borderRadius: radius.card, borderWidth: 1, borderColor: color.border, backgroundColor: color.card },
  btnTxt: { fontSize: 15, fontWeight: "700", color: color.foreground },
}));
