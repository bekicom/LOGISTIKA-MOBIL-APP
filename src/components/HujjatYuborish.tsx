/**
 * «Yuborish» (TZ 29-okt §5.4.2): ochiq reysga · Messenjerdagi istalgan
 * chatga · Telegram · WhatsApp. Web'dagi `components/skaner/yuborish.tsx`
 * egizagi.
 *
 * Telegram va WhatsApp'ga 7 kunlik imzolangan havola ketadi — u yerdagi
 * odamda FURAM hisobi yo'q. «Boshqa ilova» esa faylning o'zini telefon
 * ulashish oynasi orqali beradi.
 */
import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { Sheet } from "@/components/Sheet";
import { API_BASE, api } from "@/lib/api";
import { openRemoteFile } from "@/lib/files";
import { t } from "@/lib/i18n";
import { color, font, radius, space, themed } from "@/lib/theme";

type Variant = { id: string; nom: string };

export function HujjatYuborish({
  ochiq,
  onClose,
  hujjat,
}: {
  ochiq: boolean;
  onClose: () => void;
  hujjat: { id: string; nom: string; ulash: string } | null;
}) {
  const [qadam, setQadam] = useState<"asosiy" | "reys" | "chat">("asosiy");
  const [royxat, setRoyxat] = useState<Variant[] | null>(null);
  const [holat, setHolat] = useState<string | null>(null);

  useEffect(() => {
    if (!ochiq) return;
    setQadam("asosiy");
    setHolat(null);
    setRoyxat(null);
  }, [ochiq]);

  if (!hujjat) return null;
  const havola = `${API_BASE}${hujjat.ulash}`;
  const matn = t("skaner.shareText", { nom: hujjat.nom });

  const reysOch = async () => {
    setQadam("reys");
    const r = await api<{ reyslar: Variant[] }>("/api/skaner/hujjatlar?joy=yoq").catch(() => null);
    setRoyxat(r?.reyslar ?? []);
  };
  const chatOch = async () => {
    setQadam("chat");
    const r = await api<{ chats: { id: string; title: string }[] }>("/api/chats").catch(() => null);
    setRoyxat((r?.chats ?? []).map((c) => ({ id: c.id, nom: c.title })));
  };
  const tanla = async (id: string) => {
    const ok =
      qadam === "reys"
        ? await api("/api/skaner/reysga", { method: "POST", body: { documentId: hujjat.id, tripId: id } }).then(
            () => true,
            () => false,
          )
        : await api(`/api/chat/${id}/hujjat`, { method: "POST", body: { manba: "shaxsiy", documentId: hujjat.id } }).then(
            () => true,
            () => false,
          );
    setHolat(ok ? t("skaner.sent") : t("skaner.err.generic"));
  };

  return (
    <Sheet open={ochiq} onClose={onClose} title={t("skaner.send")}>
      <Text style={s.nom} numberOfLines={1}>
        {hujjat.nom}
      </Text>
      {!!holat && <Text style={s.holat}>{holat}</Text>}
      {qadam === "asosiy" ? (
        <View style={{ gap: space.sm }}>
          <Pressable style={s.qator} onPress={reysOch}>
            <Text style={s.matn}>🚚 {t("skaner.toTrip")}</Text>
          </Pressable>
          <Pressable style={s.qator} onPress={chatOch}>
            <Text style={s.matn}>💬 {t("skaner.toChat")}</Text>
          </Pressable>
          <Pressable
            style={s.qator}
            onPress={() =>
              void Linking.openURL(`https://t.me/share/url?url=${encodeURIComponent(havola)}&text=${encodeURIComponent(matn)}`)
            }
          >
            <Text style={s.matn}>✈️ {t("skaner.telegram")}</Text>
          </Pressable>
          <Pressable
            style={s.qator}
            onPress={() => void Linking.openURL(`https://wa.me/?text=${encodeURIComponent(`${matn} ${havola}`)}`)}
          >
            <Text style={s.matn}>🟢 {t("skaner.whatsapp")}</Text>
          </Pressable>
          <Pressable style={s.qator} onPress={() => void openRemoteFile(`/api/documents/${hujjat.id}`, "hujjat.pdf").catch(() => {})}>
            <Text style={s.matn}>📤 {t("skaner.open")}</Text>
          </Pressable>
          <Text style={s.izoh}>{t("skaner.linkNote")}</Text>
        </View>
      ) : (
        <View style={{ gap: space.sm }}>
          {royxat?.length === 0 && (
            <Text style={s.izoh}>{qadam === "reys" ? t("skaner.noTrips") : t("skaner.noChats")}</Text>
          )}
          {/* Tanlash oynasi: reys — ko'pi bilan 20 ta, chat — o'z chatlarim */}
          <ScrollView style={{ maxHeight: 360 }}>
            {royxat?.map((v) => (
              <Pressable key={v.id} style={[s.qator, { marginBottom: space.sm }]} onPress={() => void tanla(v.id)}>
                <Text style={s.matn} numberOfLines={1}>
                  {v.nom}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable onPress={() => setQadam("asosiy")} hitSlop={8}>
            <Text style={[s.matn, { color: color.brand }]}>← {t("skaner.send")}</Text>
          </Pressable>
        </View>
      )}
    </Sheet>
  );
}

const s = themed(() => ({
  nom: { fontSize: font.caption, color: color.mutedForeground, marginBottom: space.md },
  holat: {
    marginBottom: space.md,
    padding: space.sm,
    borderRadius: radius.control,
    backgroundColor: color.successSoft,
    color: color.successText,
    fontWeight: "700" as const,
  },
  qator: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
  },
  matn: { fontSize: font.body, fontWeight: "600" as const, color: color.foreground },
  izoh: { fontSize: font.micro, color: color.mutedForeground },
}));
