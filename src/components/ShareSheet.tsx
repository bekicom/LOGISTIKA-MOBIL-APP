/**
 * Ulashish — ikki yo'l bitta varaqda.
 *
 * ── NEGA IKKALASI ───────────────────────────────────────────────
 *
 * FURAM ICHIDA: e'lon kartochka bo'lib suhbatga tushadi, hamkor uni
 * bosib ochadi va kontekst yo'qolmaydi. Bu asosiy yo'l.
 *
 * TASHQARIDA: hamkorlarning yarmi hali FURAM'da yo'q. Telegramga
 * havola yuborilmasa, odam ekranni SURATGA OLIB yuboradi — va o'sha
 * suratdan e'lonni ochib bo'lmaydi.
 *
 * ── HAVOLA QAYERDAN ─────────────────────────────────────────────
 *
 * `slug` bilan: `furam.uz/loads/<slug>`. `id` bilan ham ochiladi,
 * lekin havolada ma'noli manzil turgani yaxshi — odam nima
 * yuborilganini bosmasdan ko'radi.
 */
import { useCallback, useEffect, useState } from "react";
import { Pressable, Share, View } from "react-native";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { Notice } from "@/components/ui";
import { api, FuramError } from "@/lib/api";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

/** `furam/src/lib/share.ts:SHAREABLE` */
export type ShareKind = "load" | "truck" | "ride" | "sale" | "part" | "master" | "job" | "contract";

type Card = { title: string; subtitle: string | null; meta: string | null; href: string };
type Chat = { id: string; title: string };

/** Web manzili — ulashilgan havola brauzerda ochilishi kerak */
const SITE = "https://furam.uz";

export function ShareButton({
  kind,
  id,
  href,
}: {
  kind: ShareKind;
  id: string;
  /** `/loads/<slug>` — bo'lmasa server bergani ishlatiladi */
  href?: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        style={({ pressed }) => [s.btn, pressed && { backgroundColor: color.muted }]}
      >
        <Icon name="send" size={16} stroke={color.foreground} />
        <Text style={s.btnText}>{t("mob.share.btn")}</Text>
      </Pressable>

      <ShareSheet open={open} onClose={() => setOpen(false)} kind={kind} id={id} href={href} />
    </>
  );
}

export function ShareSheet({
  open,
  onClose,
  kind,
  id,
  href,
}: {
  open: boolean;
  onClose: () => void;
  kind: ShareKind;
  id: string;
  href?: string | null;
}) {
  const [card, setCard] = useState<Card | null>(null);
  const [chats, setChats] = useState<Chat[] | null>(null);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ card: Card; chats: Chat[] }>(
        `/api/share?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}`,
      );
      setCard(r.card);
      setChats(r.chats);
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }, [kind, id]);

  /* Varaq ochilganda bir marta so'raladi. Har e'lon ekranida
     oldindan so'rasak, lentada o'nlab keraksiz so'rov ketardi
     (web tugmasidagi bilan bir xil sabab). */
  useEffect(() => {
    if (open && !chats) void load();
  }, [open, chats, load]);

  async function send(chatId: string) {
    setBusy(true);
    setErr(null);
    try {
      await api("/api/share", { method: "POST", body: { chatId, kind, id } });
      setSent(true);
      setPicking(false);
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  function outside() {
    const path = href ?? card?.href ?? "";
    const url = path.startsWith("http") ? path : `${SITE}${path}`;
    const title = card ? [card.title, card.subtitle, card.meta].filter(Boolean).join(" · ") : "";
    void Share.share({ message: title ? `${title}\n${url}` : url });
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        setSent(false);
        setPicking(false);
        onClose();
      }}
      title={t("mob.share.title")}
    >
      {card ? (
        <View style={s.card}>
          <Text style={s.cardTitle} numberOfLines={2}>
            {card.title}
          </Text>
          {card.subtitle || card.meta ? (
            <Text style={s.cardMeta}>
              {[card.subtitle, card.meta].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
        </View>
      ) : null}

      {err ? <Notice tone="danger">{err}</Notice> : null}
      {sent ? <Notice tone="info">{t("mob.share.sent")}</Notice> : null}

      {picking ? (
        <View style={{ gap: 7, marginTop: space.md }}>
          <Text style={s.label}>{t("mob.share.pickChat")}</Text>
          {(chats ?? []).length === 0 ? (
            <Text style={s.hint}>{t("mob.share.noChats")}</Text>
          ) : (
            (chats ?? []).map((c) => (
              <Pressable
                key={c.id}
                disabled={busy}
                onPress={() => send(c.id)}
                style={({ pressed }) => [s.chat, pressed && { backgroundColor: color.muted }]}
              >
                <View style={s.chatIcon}>
                  <Icon name="chat" size={16} stroke={color.brand} />
                </View>
                <Text style={s.chatTitle} numberOfLines={1}>
                  {c.title}
                </Text>
                <Icon name="chevron" size={16} stroke={color.iconFaint} />
              </Pressable>
            ))
          )}
        </View>
      ) : (
        <View style={{ gap: 9, marginTop: space.md }}>
          <Pressable
            onPress={() => setPicking(true)}
            style={({ pressed }) => [s.way, pressed && { backgroundColor: color.muted }]}
          >
            <View style={[s.wayIcon, { backgroundColor: color.brandSoft }]}>
              <Icon name="chat" size={19} stroke={color.brand} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.wayTitle}>{t("mob.share.toChat")}</Text>
              <Text style={s.wayHint}>{t("mob.share.toChatHint")}</Text>
            </View>
            <Icon name="chevron" size={17} stroke={color.iconFaint} />
          </Pressable>

          <Pressable
            onPress={outside}
            style={({ pressed }) => [s.way, pressed && { backgroundColor: color.muted }]}
          >
            <View style={[s.wayIcon, { backgroundColor: color.blueSoft }]}>
              <Icon name="send" size={19} stroke={color.blue} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.wayTitle}>{t("mob.share.outside")}</Text>
              <Text style={s.wayHint}>{t("mob.share.outsideHint")}</Text>
            </View>
            <Icon name="chevron" size={17} stroke={color.iconFaint} />
          </Pressable>
        </View>
      )}
    </Sheet>
  );
}

const s = themed(() => ({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
  },
  btnText: { fontSize: 13, fontWeight: "700", color: color.foreground },

  card: {
    backgroundColor: color.muted,
    borderRadius: radius.control,
    padding: space.md,
  },
  cardTitle: { fontSize: 14.5, fontWeight: "700", color: color.foreground },
  cardMeta: { fontSize: 12.5, color: color.mutedForeground, marginTop: 3 },

  label: { fontSize: 12, fontWeight: "700", color: color.mutedForeground },
  hint: { fontSize: 13, color: color.mutedForeground },

  way: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: space.md,
    borderRadius: radius.card,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
  },
  wayIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  wayTitle: { fontSize: 14.5, fontWeight: "700", color: color.foreground },
  wayHint: { fontSize: 12, color: color.mutedForeground, marginTop: 2, lineHeight: 17 },

  chat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: radius.control,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
  },
  chatIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: color.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  chatTitle: { flex: 1, fontSize: 14, fontWeight: "600", color: color.foreground },
}));
