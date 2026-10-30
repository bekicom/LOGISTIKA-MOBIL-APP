/**
 * Reklama kartochkasi — ilovada (TZ 29-okt §12; qoida 6: webda nima bo'lsa
 * ilovada ham). Web: `furam/src/components/ad-slot.tsx`.
 *
 * ── REKLAMA REKLAMA EKANI OCHIQ YOZILADI (§12.6) ────────────────
 *
 * Har kartochkada «Reklama» belgisi va reklama beruvchining nomi BIRINCHI
 * qatorda, shartsiz. Ramka uzuq va fon sarg'ish — haqiqiy e'londan ajralib
 * tursin. Ostida «FURAM tavsiyasi emas» qatori.
 *
 * ── TANLOV SERVERDA ─────────────────────────────────────────────
 *
 * `/api/ads` joy, mo'ljal (rol, davlat, til), muddat, chastota cheklovi va
 * tarjimani o'zi hal qiladi — ilova faqat chizadi. Shaxsiy chatda bu
 * komponent ISHLATILMAYDI: `messenger` joyi faqat umumiy guruhda.
 *
 * Bosilganda `POST /api/ads/:id/go` — bosilish kim tomonidan ekani bilan
 * sanaladi va manzil qaytadi; ilova uni o'zi ochadi.
 */
import { Image, Linking, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { useApi } from "@/lib/use-api";
import { api, API_BASE } from "@/lib/api";
import { authImage } from "@/lib/img";
import { webToApp } from "@/lib/routes";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Reklama = {
  id: string;
  kind: string;
  advertiser: string;
  title: string;
  body: string | null;
  imageSrc: string | null;
  videoSrc: string | null;
  linkLabel: string | null;
  havola: boolean;
};

export function ReklamaJoyi({
  joy,
  section,
  chatId,
}: {
  joy: "home" | "feed" | "messenger";
  section?: string;
  /** Faqat `messenger` da: server chat umumiy guruh ekanini tekshiradi */
  chatId?: string;
}) {
  const q =
    `/api/ads?placement=${joy}` +
    (section ? `&section=${encodeURIComponent(section)}` : "") +
    (chatId ? `&chat=${encodeURIComponent(chatId)}` : "");
  const { data } = useApi<{ ads: Reklama[] }>(q);
  const ads = data?.ads ?? [];
  if (ads.length === 0) return null;
  return (
    <View style={{ gap: space.sm, marginTop: space.md }} accessibilityLabel={t("ads.bandTitle")}>
      {ads.map((a) => (
        <ReklamaKarta key={a.id} ad={a} />
      ))}
    </View>
  );
}

function ReklamaKarta({ ad }: { ad: Reklama }) {
  const router = useRouter();
  const och = async () => {
    const r = await api<{ url: string }>(`/api/ads/${ad.id}/go`, { method: "POST" }).catch(() => null);
    if (!r?.url) return;
    if (r.url.startsWith("/")) {
      const ichki = webToApp(r.url);
      if (ichki) router.push(ichki as Parameters<typeof router.push>[0]);
      else void Linking.openURL(`${API_BASE}${r.url}`);
      return;
    }
    void Linking.openURL(r.url);
  };
  return (
    <View style={s.card}>
      {/* ⚠️ BELGI BIRINCHI QATORDA VA HAR DOIM */}
      <View style={s.top}>
        <Text style={s.badge}>{t("ads.badge")}</Text>
        <Text style={s.adv} numberOfLines={1}>
          {t("ads.advertiser")}: <Text style={s.advName}>{ad.advertiser}</Text>
        </Text>
      </View>
      <Text style={s.title}>{ad.title}</Text>
      {ad.body ? <Text style={s.body}>{ad.body}</Text> : null}
      {ad.imageSrc ? (
        <Image
          source={authImage(ad.imageSrc)}
          style={ad.kind === "SERVICE_CARD" ? s.logo : s.banner}
          resizeMode={ad.kind === "SERVICE_CARD" ? "contain" : "cover"}
        />
      ) : null}
      {ad.havola ? (
        <Pressable onPress={och} style={({ pressed }) => [s.btn, pressed && { opacity: 0.7 }]} accessibilityRole="link">
          <Text style={s.btnText}>{ad.linkLabel?.trim() || t("ads.more")} ↗</Text>
        </Pressable>
      ) : null}
      <Text style={s.note}>{t("ads.badgeHint")}</Text>
    </View>
  );
}

const s = themed(() => ({
  card: {
    borderRadius: radius.card,
    borderWidth: 2,
    borderStyle: "dashed" as const,
    borderColor: color.warning,
    backgroundColor: color.card,
    padding: space.md,
  },
  top: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, flexWrap: "wrap" as const },
  badge: {
    backgroundColor: color.warning,
    color: "#fff",
    fontSize: 10,
    fontWeight: "800" as const,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden" as const,
    textTransform: "uppercase" as const,
  },
  adv: { flex: 1, fontSize: 11.5, color: color.mutedForeground },
  advName: { fontWeight: "700" as const, color: color.foreground },
  title: { marginTop: 8, fontSize: 14, fontWeight: "800" as const, color: color.foreground },
  body: { marginTop: 4, fontSize: 13, lineHeight: 18, color: color.mutedForeground },
  banner: { marginTop: 10, width: "100%" as const, aspectRatio: 2.4, borderRadius: radius.control },
  logo: { marginTop: 10, width: 64, height: 64, borderRadius: radius.control },
  btn: {
    marginTop: 10,
    alignSelf: "flex-start" as const,
    borderWidth: 1,
    borderColor: color.warning,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  btnText: { fontSize: 12.5, fontWeight: "700" as const, color: color.warning },
  note: { marginTop: 8, fontSize: 11, color: color.mutedForeground },
}));
