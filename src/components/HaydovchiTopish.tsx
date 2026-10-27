/**
 * «Bu mashinaga haydovchi kerakmi?» → mos haydovchilar (TZ v2 §4.2, 2026-10-27).
 *
 * Webdagi `furam/src/app/fleet/[id]/haydovchi-topish.tsx` ning o'zi. «Ha»
 * bosilsa AI 3–5 nomzod ko'rsatadi va mos haydovchilarga o'zi yozadi (A2);
 * har nomzod bilan bir tugmada suhbat yoki «Biriktirish» (haydovchi qabul
 * qiladi — ikki tomon tasdig'i). Ro'yxat chegaralangan (5 ta).
 */
import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { Tap } from "@/components/Tap";
import { Button } from "@/components/ui";
import { api, FuramError } from "@/lib/api";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Nomzod = {
  userId: string;
  name: string;
  furamId: number;
  experienceY: number | null;
  licenseClasses: string[];
  countries: string[];
  truckBrands: string[];
  languages: string[];
  trust: number | null;
  tasdiqlangan: boolean;
};

export function HaydovchiTopish({ vehicleId, ochiq }: { vehicleId: string; ochiq?: boolean }) {
  const router = useRouter();
  const [nomzodlar, setNomzodlar] = useState<Nomzod[] | null>(null);
  const [band, setBand] = useState<string | null>(null);
  const [xabar, setXabar] = useState<string | null>(null);
  const [yuborildi, setYuborildi] = useState<Set<string>>(new Set());
  /* «Ro'yxatdan biriktirish» (TZ v3 §8): mashinasiz HAMMA haydovchi, filtr bilan */
  const [filtr, setFiltr] = useState<{ toifa: string; xalqaro: boolean; tajriba: string } | null>(null);

  async function royxat(f: { toifa: string; xalqaro: boolean; tajriba: string }) {
    setFiltr(f);
    setBand("royxat");
    setXabar(null);
    const q = new URLSearchParams({ royxat: "1" });
    if (f.toifa) q.set("toifa", f.toifa);
    if (f.xalqaro) q.set("xalqaro", "1");
    if (f.tajriba) q.set("tajriba", f.tajriba);
    try {
      const r = await api<{ nomzodlar: Nomzod[] }>(`/api/fleet/vehicles/${vehicleId}/haydovchi?${q}`);
      setNomzodlar(r.nomzodlar ?? []);
    } catch (e) {
      setXabar((e as Error).message);
    } finally {
      setBand(null);
    }
  }

  async function ha() {
    setBand("ha");
    setXabar(null);
    try {
      const [r] = await Promise.all([
        api<{ nomzodlar: Nomzod[] }>(`/api/fleet/vehicles/${vehicleId}/haydovchi`),
        api(`/api/fleet/vehicles/${vehicleId}/haydovchi`, { method: "POST", body: { action: "kerak" } }).catch(() => null),
      ]);
      setNomzodlar(r.nomzodlar ?? []);
    } catch (e) {
      setXabar((e as FuramError).message ?? t("mob.err.network"));
    } finally {
      setBand(null);
    }
  }

  async function amal(action: "chat" | "taklif", userId: string, name: string) {
    setBand(`${action}:${userId}`);
    setXabar(null);
    try {
      const r = await api<{ chatId?: string }>(`/api/fleet/vehicles/${vehicleId}/haydovchi`, {
        method: "POST",
        body: { action, userId },
      });
      if (action === "chat" && r.chatId) router.push({ pathname: "/suhbat/[id]", params: { id: r.chatId, title: name } });
      else {
        setYuborildi((s) => new Set(s).add(userId));
        setXabar(t("haydovchiTop.taklifKetdi"));
      }
    } catch (e) {
      setXabar((e as FuramError).message ?? t("mob.msg.actionFailed"));
    } finally {
      setBand(null);
    }
  }

  if (nomzodlar === null) {
    return (
      <View style={[s.card, ochiq && { borderColor: color.brand, backgroundColor: color.brandSoft }]}>
        <Text style={s.title}>🤖 {t("haydovchiTop.savol")}</Text>
        <Text style={s.muted}>{t("haydovchiTop.savolIzoh")}</Text>
        <View style={{ marginTop: 8 }}>
          <Button title={t("haydovchiTop.ha")} onPress={() => void ha()} loading={band === "ha"} />
        </View>
        <Button
          title={t("haydovchiTop.royxatdan")}
          variant="secondary"
          onPress={() => void royxat({ toifa: "", xalqaro: false, tajriba: "" })}
          loading={band === "royxat"}
        />
        {xabar ? <Text style={s.muted}>{xabar}</Text> : null}
      </View>
    );
  }

  return (
    <View style={s.card}>
      <Text style={s.title}>{filtr ? t("haydovchiTop.royxatdan") : t("haydovchiTop.nomzodlar")}</Text>
      {filtr ? (
        <View style={s.filtr}>
          {["B", "C", "CE", "D"].map((k) => (
            <Tap key={k} onPress={() => void royxat({ ...filtr, toifa: filtr.toifa === k ? "" : k })} feel="select" style={[s.chip, filtr.toifa === k && s.btnMain]}>
              <Text style={[s.btnText, filtr.toifa === k && { color: "#ffffff" }]}>{k}</Text>
            </Tap>
          ))}
          {["3", "5"].map((n) => (
            <Tap key={n} onPress={() => void royxat({ ...filtr, tajriba: filtr.tajriba === n ? "" : n })} feel="select" style={[s.chip, filtr.tajriba === n && s.btnMain]}>
              <Text style={[s.btnText, filtr.tajriba === n && { color: "#ffffff" }]}>{t("haydovchiTop.tajribaKamida", { n })}</Text>
            </Tap>
          ))}
          <Tap onPress={() => void royxat({ ...filtr, xalqaro: !filtr.xalqaro })} feel="select" style={[s.chip, filtr.xalqaro && s.btnMain]}>
            <Text style={[s.btnText, filtr.xalqaro && { color: "#ffffff" }]}>{t("haydovchiTop.fXalqaro")}</Text>
          </Tap>
        </View>
      ) : null}
      {nomzodlar.length === 0 ? <Text style={s.muted}>{t("haydovchiTop.yoq")}</Text> : null}
      {nomzodlar.map((n) => (
        <View key={n.userId} style={s.row}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
            <Text style={s.name}>{n.name}</Text>
            {n.tasdiqlangan ? <Text style={s.badge}>✓ {t("haydovchiTop.tasdiqlangan")}</Text> : null}
            {n.trust != null ? <Text style={s.muted}>Trust {n.trust}</Text> : null}
          </View>
          <Text style={s.muted}>
            {[
              n.licenseClasses.join(", "),
              n.experienceY != null ? t("haydovchiTop.tajriba", { n: n.experienceY }) : null,
              n.countries.join(", "),
              n.truckBrands.join(", "),
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
            <Tap onPress={() => void amal("chat", n.userId, n.name)} feel="select" style={s.btn} disabled={!!band}>
              <Text style={s.btnText}>{t("haydovchiTop.yozish")}</Text>
            </Tap>
            <Tap
              onPress={() => void amal("taklif", n.userId, n.name)}
              feel="select"
              style={[s.btn, s.btnMain]}
              disabled={!!band || yuborildi.has(n.userId)}
            >
              <Text style={[s.btnText, { color: "#ffffff" }]}>
                {yuborildi.has(n.userId) ? t("haydovchiTop.yuborildi") : t("haydovchiTop.biriktirish")}
              </Text>
            </Tap>
          </View>
        </View>
      ))}
      {xabar ? <Text style={s.muted}>{xabar}</Text> : null}
    </View>
  );
}

const s = themed(() => ({
  card: {
    marginTop: space.md,
    padding: space.md,
    borderRadius: radius.card,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    gap: 6,
    ...shadow.card,
  },
  title: { fontSize: 15, fontFamily: "Manrope_700Bold", color: color.foreground },
  muted: { fontSize: 13, color: color.mutedForeground },
  row: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: color.border, gap: 2 },
  name: { fontSize: 15, fontFamily: "Manrope_700Bold", color: color.foreground },
  badge: { fontSize: 11, fontFamily: "Manrope_700Bold", color: color.success },
  btn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.control, borderWidth: 1, borderColor: color.border },
  btnMain: { backgroundColor: color.brand, borderColor: color.brand },
  btnText: { fontSize: 13, fontFamily: "Manrope_700Bold", color: color.foreground },
  filtr: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: color.border },
}));
