/**
 * Guruhdagi odam kartasi — «Xabar yozish» (TZ v2 §5.1, 2026-10-24).
 *
 * Mijoz: «guruhda foydalanuvchini bosib, u bilan alohida yozishib
 * bo'lmaydi». Ism bosiladi → shu karta → «Xabar yozish» → shaxsiy
 * chat. Server faqat umumiy chati bor va bloklanmagan odamga ochadi
 * (`/api/chats/direct`). Web bilan bir xil: `furam/src/components/chat/sender-karta.tsx`.
 */
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { Sheet } from "@/components/Sheet";
import { Button } from "@/components/ui";
import { api, FuramError } from "@/lib/api";
import { color, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Karta = {
  name: string | null;
  furamId: number;
  verified: boolean;
  ratingAvg: number | null;
  ratingCount: number;
};

export function SenderKarta({
  odam,
  onClose,
}: {
  /** `null` — yopiq */
  odam: { id: string; name: string } | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [karta, setKarta] = useState<Karta | null>(null);
  const [xato, setXato] = useState<string | null>(null);
  const [band, setBand] = useState(false);

  useEffect(() => {
    setKarta(null);
    setXato(null);
    if (!odam) return;
    let tirik = true;
    api<{ karta: Karta }>(`/api/chats/direct?userId=${encodeURIComponent(odam.id)}`)
      .then((r) => tirik && setKarta(r.karta))
      .catch((e) => tirik && setXato(e instanceof FuramError ? e.message : String(e)));
    return () => {
      tirik = false;
    };
  }, [odam]);

  async function yoz() {
    if (!odam) return;
    setBand(true);
    try {
      const r = await api<{ chatId: string }>("/api/chats/direct", { method: "POST", body: { userId: odam.id } });
      onClose();
      router.push(`/suhbat/${r.chatId}`);
    } catch (e) {
      setXato(e instanceof FuramError ? e.message : String(e));
    } finally {
      setBand(false);
    }
  }

  return (
    <Sheet open={!!odam} onClose={onClose} title={karta?.name ?? odam?.name}>
      <View style={s.body}>
        {xato ? (
          <Text style={s.err}>{xato}</Text>
        ) : !karta ? (
          <ActivityIndicator color={color.brand} />
        ) : (
          <>
            <View style={s.row}>
              <Text style={s.meta}>FURAM ID {karta.furamId}</Text>
              {karta.verified ? <Text style={s.badge}>{t("chatKarta.verified")}</Text> : null}
            </View>
            {karta.ratingAvg != null ? (
              <Text style={s.meta}>
                {t("chatKarta.rating")} {karta.ratingAvg.toFixed(1)} · {t("chatKarta.reviews", { n: karta.ratingCount })}
              </Text>
            ) : null}
            <Button title={t("chatKarta.write")} onPress={() => void yoz()} loading={band} />
          </>
        )}
      </View>
    </Sheet>
  );
}

const s = themed(() => ({
  body: { gap: 12, paddingBottom: 8 },
  row: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
  meta: { fontSize: 13, color: color.mutedForeground },
  badge: {
    fontSize: 11,
    fontFamily: "Manrope_700Bold",
    color: color.success,
    backgroundColor: color.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden" as const,
  },
  err: { fontSize: 14, color: color.danger },
}));
