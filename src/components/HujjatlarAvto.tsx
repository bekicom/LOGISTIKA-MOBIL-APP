/**
 * Reys hujjatlari (avtomatik) va «Hujjatlarimdan yuborish» (TZ v2 §6.1, 2026-10-27).
 *
 * `ReysHujjatlariAvto` — reys ochilganda haydovchi va mashina hujjatlari
 * o'zi ko'rinadi (nusxa emas — joriy hujjatlar). Server:
 * `/api/trips/[id]/reys-hujjat`. `HujjatTanlashSheet` — chatda saqlangan
 * hujjatni bir tugmada yuborish (`/api/chat/[id]/hujjat`).
 * Ikkala ro'yxat ham chegaralangan (≤ 10 va ≤ 100).
 */
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { Text } from "@/components/Text";
import { Tap } from "@/components/Tap";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { openRemoteFile } from "@/lib/files";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type RH = { id: string; manba: "shaxsiy" | "mashina"; nomi: string; muddat: string | null; holat: "ok" | "tugagan" | "yaqin"; faylBor: boolean };

export function ReysHujjatlariAvto({ tripId }: { tripId: string }) {
  const { data } = useApi<{ hujjatlar: RH[] }>(`/api/trips/${tripId}/reys-hujjat`, [tripId]);
  const list = data?.hujjatlar ?? [];
  if (!list.length) return null;
  return (
    <View style={s.card}>
      <Text style={s.h}>{t("reysHujjat.title")}</Text>
      {list.map((d) => (
        <Tap
          key={`${d.manba}-${d.id}`}
          onPress={() => (d.faylBor ? void openRemoteFile(`/api/trips/${tripId}/reys-hujjat?m=${d.manba}&doc=${d.id}`, `${d.nomi}`).catch(() => null) : undefined)}
          feel="select"
          style={s.row}
        >
          <View style={[s.dot, { backgroundColor: d.holat === "ok" ? color.success : d.holat === "yaqin" ? color.warning : color.danger }]} />
          <Text style={s.name} numberOfLines={1}>{d.nomi}</Text>
          {d.muddat ? <Text style={s.muted}>{d.muddat.slice(0, 10).split("-").reverse().join(".")}</Text> : null}
        </Tap>
      ))}
      <Text style={s.muted}>{t("reysHujjat.izoh")}</Text>
    </View>
  );
}

type H = { id: string; manba: "shaxsiy" | "mashina"; nomi: string };

export function HujjatTanlashSheet({ chatId, open, onClose, onDone }: { chatId: string; open: boolean; onClose: () => void; onDone: () => void }) {
  const [list, setList] = useState<H[] | null>(null);
  const [band, setBand] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let tirik = true;
    void api<{ hujjatlar: H[] }>(`/api/chat/${chatId}/hujjat`)
      .then((d) => tirik && setList(d.hujjatlar ?? []))
      .catch(() => tirik && setList([]));
    return () => {
      tirik = false;
    };
  }, [open, chatId]);

  return (
    <Sheet open={open} onClose={onClose} title={t("reysHujjat.mendan")}>
      {list === null ? <ActivityIndicator color={color.brand} /> : null}
      {list?.length === 0 ? <Text style={s.muted}>{t("reysHujjat.bosh")}</Text> : null}
      <FlatList
        data={list ?? []}
        keyExtractor={(h) => `${h.manba}-${h.id}`}
        style={{ maxHeight: 380 }}
        renderItem={({ item }) => (
          <Tap
            onPress={async () => {
              setBand(item.id);
              try {
                await api(`/api/chat/${chatId}/hujjat`, { method: "POST", body: { manba: item.manba, documentId: item.id } });
                onDone();
              } catch {
                /* tarmoq — odam qayta bosadi */
              } finally {
                setBand(null);
              }
            }}
            feel="select"
            style={s.row}
            disabled={!!band}
          >
            <Icon name="doc" size={18} stroke={color.brand} />
            <Text style={s.name} numberOfLines={1}>{item.nomi}</Text>
            {band === item.id ? <ActivityIndicator size="small" color={color.brand} /> : null}
          </Tap>
        )}
      />
    </Sheet>
  );
}

const s = themed(() => ({
  card: { padding: space.md, borderRadius: radius.card, backgroundColor: color.card, gap: 6, marginBottom: space.md },
  h: { fontSize: 12, fontFamily: "Manrope_700Bold", color: color.mutedForeground, textTransform: "uppercase" as const },
  row: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, paddingVertical: 9 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  name: { flex: 1, fontSize: 14, color: color.foreground },
  muted: { fontSize: 12, color: color.mutedForeground },
}));
