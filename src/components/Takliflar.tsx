/**
 * Taklif oqimi (TZ v3 §5, §15-3/4) — webdagi `components/taklif/*` bilan bir xil.
 *
 * `KartaTakliflar` — yuk yoki transport kartasining ish bo'limlari: bosqich
 * zanjiri, Mos variantlar (AI) → «Taklif qilish», Takliflar (Qabul / Rad /
 * Narx taklif qilish / Yozish), Kelishilgan → «Reysga bog'lash», «Shartnoma
 * tuzish», Reys. `TaklifChatTugmalari` — chatdagi taklif kartasi ostida
 * Qabul / Rad. Ro'yxatlar chegaralangan (server ≤ 50 taklif, ≤ 5 variant).
 */
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { Button } from "@/components/ui";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { webToApp } from "@/lib/routes";
import { xabarcha } from "@/components/Xabarcha";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

const BOSQICHLAR = ["YANGI", "TAKLIF", "KELISHILGAN", "REYSDA", "YETKAZILDI", "ARXIV"] as const;
const VALYUTA = ["USD", "UZS", "KZT", "RUB", "EUR", "CNY"];
const TOLOV = ["t_yuklashda", "t_tushirishda", "t_yarim", "t_avans"] as const;

type Taklif = {
  id: string;
  loadId: string;
  yuk: string;
  yukHref: string;
  men: "yuborgan" | "kelgan";
  status: string;
  narx: string | null;
  price: number | null;
  currency: string | null;
  note: string | null;
  qarshiTomon: { id: string; ism: string };
  transport: string | null;
  transportEgaId: string | null;
  vehicleId: string | null;
  chatId: string | null;
  tripId: string | null;
  rejectReason: string | null;
};
type Variant = { key: string; label: string; sub?: string; href?: string; body: { loadId: string; truckId?: string; vehicleId?: string } };
type Karta = {
  egami: boolean;
  bosqich: (typeof BOSQICHLAR)[number];
  takliflar: Taklif[];
  kelishilgan: Taklif | null;
  reys: { id: string; furamNo: number; status: string } | null;
  mos: Variant[];
  yuborish: Variant[];
  dispetcherYoqiq: boolean;
};

const HOLAT_RANG: Record<string, string> = {
  PENDING: color.warning,
  ACCEPTED: color.success,
  REJECTED: color.danger,
  CANCELLED: color.mutedForeground,
};

export function KartaTakliflar({ loadId, truckId, narx }: { loadId?: string; truckId?: string; narx?: { price: number | null; currency: string } }) {
  const router = useRouter();
  const yol = loadId ? `/api/takliflar?loadId=${loadId}` : `/api/takliflar?truckId=${truckId}`;
  const { data, reload } = useApi<Karta>(yol, [yol]);
  const [band, setBand] = useState<string | null>(null);
  const [xabar, setXabar] = useState<{ matn: string; ok?: boolean; chat?: string | null } | null>(null);
  const [ochiq, setOchiq] = useState<string | null>(null);
  const [summa, setSumma] = useState(narx?.price != null ? String(narx.price) : "");
  const [valyuta, setValyuta] = useState(narx?.currency || "USD");
  const [tanlov, setTanlov] = useState<string | null>(null);
  const [tolov, setTolov] = useState<(typeof TOLOV)[number]>("t_tushirishda");
  const [shartnoma, setShartnoma] = useState(false);
  const [disp, setDisp] = useState<boolean | null>(null);

  if (!data) return null;
  const k = data;
  const reys = k.reys;
  const ochiqHolat = !reys && !k.kelishilgan && k.bosqich !== "ARXIV";
  const sonli = () => Number(summa.replace(/\s/g, ""));

  async function yubor(v: Variant) {
    setBand(v.key);
    setXabar(null);
    try {
      const n = sonli();
      const r = await api<{ chatId: string; mavjud: boolean }>("/api/takliflar", {
        method: "POST",
        body: { ...v.body, ...(n > 0 ? { price: n, currency: valyuta } : {}) },
      });
      setXabar({ matn: t(r.mavjud ? "taklif.allaqachon" : "taklif.yuborildi"), ok: true, chat: r.chatId });
      setOchiq(null);
      reload();
    } catch (e) {
      setXabar({ matn: (e as FuramError).message ?? t("taklif.xato") });
    } finally {
      setBand(null);
    }
  }

  async function amal(id: string, a: "qabul" | "rad" | "bekor" | "qarshi" | "reys") {
    setBand(`${id}:${a}`);
    setXabar(null);
    try {
      const r = await api<{ tripId?: string }>(`/api/takliflar/${id}`, {
        method: "PATCH",
        body: { amal: a, ...(a === "qarshi" ? { price: sonli(), currency: valyuta } : {}) },
      });
      if (a === "reys" && r.tripId) {
        router.push({ pathname: "/reys/[id]", params: { id: r.tripId } } as never);
        return;
      }
      setOchiq(null);
      reload();
    } catch (e) {
      setXabar({ matn: (e as FuramError).message ?? t("taklif.xato") });
    } finally {
      setBand(null);
    }
  }

  /* «Shartnoma tuzish» (§15-4): kelishilgan narx va tomonlar bilan */
  async function shartnomaTuz(x: Taklif) {
    setBand("shartnoma");
    try {
      const r = await api<{ id: string }>("/api/contracts", {
        method: "POST",
        body: {
          loadId: x.loadId,
          ...(x.transportEgaId ? { carrierId: x.transportEgaId } : {}),
          version: {
            price: x.price ?? (sonli() || 0),
            currency: x.currency ?? valyuta,
            paymentTerm: t(`taklif.${tolov}`),
            ...(x.vehicleId ? { vehicleId: x.vehicleId } : {}),
          },
        },
      });
      router.push({ pathname: "/shartnoma/[id]", params: { id: r.id } } as never);
    } catch (e) {
      setXabar({ matn: (e as FuramError).message ?? t("taklif.xato") });
    } finally {
      setBand(null);
    }
  }

  async function dispetcherlik() {
    const yoq = !(disp ?? k.dispetcherYoqiq);
    setBand("disp");
    try {
      await api("/api/dispetcherlik", { method: "POST", body: { ...(loadId ? { loadId } : { truckId }), yoq } });
      setDisp(yoq);
    } catch {
      /* tarmoq — qayta bosadi */
    } finally {
      setBand(null);
    }
  }

  const narxQator = (
    <View style={s.row}>
      <TextInput value={summa} onChangeText={(v) => setSumma(v.replace(/[^\d.\s]/g, ""))} keyboardType="numeric" placeholder={t("taklif.narx")} placeholderTextColor={color.mutedForeground} style={[s.input, { flex: 1 }]} />
      {VALYUTA.slice(0, 4).map((c) => (
        <Pressable key={c} onPress={() => setValyuta(c)} style={[s.chip, valyuta === c && s.chipOn]}>
          <Text style={[s.chipText, valyuta === c && s.chipTextOn]}>{c}</Text>
        </Pressable>
      ))}
    </View>
  );

  const chatga = (id: string) => router.push({ pathname: "/suhbat/[id]", params: { id } } as never);
  const qator = (x: Taklif) => (
    <View key={x.id} style={s.item}>
      <View style={s.row}>
        <Text style={s.bold} numberOfLines={1}>{x.qarshiTomon.ism}</Text>
        <Text style={[s.pill, { color: HOLAT_RANG[x.status] ?? color.mutedForeground }]}>{t(`taklif.h_${x.status}`)}</Text>
        {x.narx ? <Text style={[s.bold, { marginLeft: "auto" }]}>{x.narx}</Text> : null}
      </View>
      <Text style={s.muted}>{truckId ? x.yuk : x.transport}{x.rejectReason === "QARSHI_NARX" ? ` · ${t("taklif.qarshiBerildi")}` : ""}</Text>
      <View style={[s.row, { flexWrap: "wrap" }]}>
        {x.men === "kelgan" && x.status === "PENDING" ? (
          <>
            <Pressable disabled={!!band} onPress={() => void amal(x.id, "qabul")} style={[s.btn, { backgroundColor: color.success }]}>
              <Text style={s.btnText}>{t("taklif.qabul")}</Text>
            </Pressable>
            <Pressable disabled={!!band} onPress={() => void amal(x.id, "rad")} style={s.btnLine}>
              <Text style={[s.btnLineText, { color: color.danger }]}>{t("taklif.rad")}</Text>
            </Pressable>
            <Pressable onPress={() => setOchiq(ochiq === `q:${x.id}` ? null : `q:${x.id}`)} style={s.btnLine}>
              <Text style={s.btnLineText}>{t("taklif.qarshi")}</Text>
            </Pressable>
          </>
        ) : null}
        {x.men === "yuborgan" && x.status === "PENDING" ? (
          <Pressable disabled={!!band} onPress={() => void amal(x.id, "bekor")} style={s.btnLine}>
            <Text style={s.btnLineText}>{t("taklif.bekor")}</Text>
          </Pressable>
        ) : null}
        {x.chatId ? (
          <Pressable onPress={() => chatga(x.chatId!)} style={s.btnLine}>
            <Text style={s.btnLineText}>💬 {t("taklif.yozish")}</Text>
          </Pressable>
        ) : null}
      </View>
      {ochiq === `q:${x.id}` ? (
        <View style={{ gap: 8 }}>
          {narxQator}
          <Button title={t("taklif.qarshiYubor")} loading={band === `${x.id}:qarshi`} onPress={() => void amal(x.id, "qarshi")} />
        </View>
      ) : null}
    </View>
  );

  const tanlangan = k.yuborish.find((v) => v.key === (tanlov ?? k.yuborish[0]?.key));
  const kelgan = k.takliflar.filter((x) => x.men === "kelgan");
  const yuborgan = k.takliflar.filter((x) => x.men === "yuborgan");

  return (
    <View style={s.card}>
      <View style={[s.row, { flexWrap: "wrap" }]}>
        {BOSQICHLAR.map((b, i) => {
          const j = BOSQICHLAR.indexOf(k.bosqich);
          return (
            <Text key={b} style={[s.step, b === k.bosqich ? s.stepOn : i < j ? s.stepDone : null]}>
              {t(`taklif.b_${b}`)}
            </Text>
          );
        })}
      </View>

      {reys ? <Button title={`🛣️ ${t("taklif.reysniOchish")} — #${reys.furamNo}`} onPress={() => router.push({ pathname: "/reys/[id]", params: { id: reys.id } } as never)} /> : null}

      {k.kelishilgan && !reys ? (
        <View style={s.agreed}>
          <Text style={[s.h, { color: color.success }]}>{t("taklif.kelishilgan")}</Text>
          <Text style={s.body}>{[k.kelishilgan.qarshiTomon.ism, k.kelishilgan.transport, k.kelishilgan.narx].filter(Boolean).join(" · ")}</Text>
          <Button title={`🛣️ ${t("taklif.reysgaBogla")}`} loading={band === `${k.kelishilgan.id}:reys`} onPress={() => void amal(k.kelishilgan!.id, "reys")} />
          <Button title={`📋 ${t("taklif.shartnomaTuz")}`} variant="secondary" onPress={() => setShartnoma((v) => !v)} />
          {shartnoma ? (
            <View style={{ gap: 8 }}>
              <Text style={s.muted}>{t("taklif.tolovSharti")}</Text>
              <View style={[s.row, { flexWrap: "wrap" }]}>
                {TOLOV.map((x) => (
                  <Pressable key={x} onPress={() => setTolov(x)} style={[s.chip, tolov === x && s.chipOn]}>
                    <Text style={[s.chipText, tolov === x && s.chipTextOn]}>{t(`taklif.${x}`)}</Text>
                  </Pressable>
                ))}
              </View>
              <Button title={t("taklif.shartnomaYubor")} loading={band === "shartnoma"} onPress={() => void shartnomaTuz(k.kelishilgan!)} />
            </View>
          ) : null}
          <Pressable onPress={() => void amal(k.kelishilgan!.id, "bekor")}>
            <Text style={s.muted}>{t("taklif.kelishuvniBekor")}</Text>
          </Pressable>
        </View>
      ) : null}

      {k.egami && ochiqHolat ? (
        <View style={{ gap: 8 }}>
          <Text style={s.h}>🤖 {t(loadId ? "taklif.mosMashina" : "taklif.mosYuk")}</Text>
          {k.mos.length === 0 ? <Text style={s.muted}>{t("taklif.mosYoq")}</Text> : null}
          {k.mos.map((m) => (
            <View key={m.key} style={s.item}>
              <Pressable onPress={() => {
                const to = m.href ? webToApp(m.href) : null;
                if (to) router.push(to as never);
              }}>
                <Text style={s.bold}>{m.label}</Text>
                {m.sub ? <Text style={s.muted}>{m.sub}</Text> : null}
              </Pressable>
              {ochiq === `m:${m.key}` ? (
                <View style={{ gap: 8 }}>
                  {narxQator}
                  <Button title={t("taklif.yuborishTasdiq")} loading={band === m.key} onPress={() => void yubor(m)} />
                </View>
              ) : (
                <Button title={t("taklif.yuborish")} onPress={() => setOchiq(`m:${m.key}`)} />
              )}
            </View>
          ))}
        </View>
      ) : null}

      {!k.egami && ochiqHolat && k.yuborish.length > 0 ? (
        <View style={s.offer}>
          <Text style={s.bold}>{t(loadId ? "taklif.transportTaklif" : "taklif.yukTaklif")}</Text>
          <View style={[s.row, { flexWrap: "wrap" }]}>
            {k.yuborish.map((v) => (
              <Pressable key={v.key} onPress={() => setTanlov(v.key)} style={[s.chip, tanlangan?.key === v.key && s.chipOn]}>
                <Text style={[s.chipText, tanlangan?.key === v.key && s.chipTextOn]} numberOfLines={1}>{v.label}</Text>
              </Pressable>
            ))}
          </View>
          {narxQator}
          <Button title={t("taklif.yuborish")} loading={!!band && band === tanlangan?.key} disabled={!tanlangan} onPress={() => tanlangan && void yubor(tanlangan)} />
        </View>
      ) : null}

      {!k.egami && ochiqHolat ? (
        <Pressable onPress={() => void dispetcherlik()} style={[s.btnLine, { alignSelf: "flex-start" }]}>
          {band === "disp" ? (
            <ActivityIndicator size="small" color={color.brand} />
          ) : (
            <Text style={s.btnLineText}>{(disp ?? k.dispetcherYoqiq) ? `✓ ${t("taklif.dispetcherlikQilyapman")}` : `🎧 ${t("taklif.dispetcherlikQilaman")}`}</Text>
          )}
        </Pressable>
      ) : null}

      {xabar ? (
        <Pressable disabled={!xabar.chat} onPress={() => xabar.chat && chatga(xabar.chat)}>
          <Text style={[s.body, { color: xabar.ok ? color.success : color.danger }]}>
            {xabar.matn}
            {xabar.chat ? ` ${t("taklif.chatgaOtish")} →` : ""}
          </Text>
        </Pressable>
      ) : null}

      <Text style={s.h}>{t("taklif.title")}</Text>
      {k.takliflar.length === 0 ? <Text style={s.muted}>{t("taklif.bosh")}</Text> : null}
      {kelgan.length > 0 ? <Text style={s.sub}>{t("taklif.kelgan")}</Text> : null}
      {kelgan.map(qator)}
      {yuborgan.length > 0 ? <Text style={s.sub}>{t("taklif.yuborgan")}</Text> : null}
      {yuborgan.map(qator)}
    </View>
  );
}

/** Chatdagi taklif kartasi ostida Qabul / Rad (TZ §5) */
export function TaklifChatTugmalari({ id }: { id: string }) {
  const router = useRouter();
  const [h, setH] = useState<{ status: string; menga: boolean; tripId: string | null; href: string } | null>(null);
  const [band, setBand] = useState(false);
  const [qayta, setQayta] = useState(0);

  useEffect(() => {
    let tirik = true;
    api<{ takliflar: { status: string; menga: boolean; tripId: string | null; href: string }[] }>(`/api/takliflar?ids=${encodeURIComponent(id)}`)
      .then((r) => tirik && setH(r.takliflar[0] ?? null))
      .catch(() => null);
    return () => {
      tirik = false;
    };
  }, [id, qayta]);

  async function amal(a: "qabul" | "rad") {
    setBand(true);
    try {
      await api(`/api/takliflar/${id}`, { method: "PATCH", body: { amal: a } });
    } catch {
      /* holat qayta o'qiladi — xato bo'lsa tugma joyida qoladi */
    } finally {
      setBand(false);
      setQayta((x) => x + 1);
    }
  }

  if (!h) return null;
  return (
    <View style={[s.row, { flexWrap: "wrap", marginTop: 6 }]}>
      <Text style={[s.pill, { color: HOLAT_RANG[h.status] ?? color.mutedForeground }]}>{t(`taklif.h_${h.status}`)}</Text>
      {h.menga && h.status === "PENDING" ? (
        <>
          <Pressable disabled={band} onPress={() => void amal("qabul")} style={[s.btn, { backgroundColor: color.success }]}>
            <Text style={s.btnText}>{t("taklif.qabul")}</Text>
          </Pressable>
          <Pressable disabled={band} onPress={() => void amal("rad")} style={s.btnLine}>
            <Text style={[s.btnLineText, { color: color.danger }]}>{t("taklif.rad")}</Text>
          </Pressable>
        </>
      ) : null}
      {h.status === "ACCEPTED" ? (
        <Pressable
          onPress={() => {
            const to = h.tripId ? `/reys/${h.tripId}` : webToApp(h.href);
            if (to) router.push(to as never);
          }}
          style={[s.btn, { backgroundColor: color.brand }]}
        >
          <Text style={s.btnText}>{t(h.tripId ? "taklif.reysniOchish" : "taklif.keyingiQadam")} →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const s = themed(() => ({
  card: { padding: space.md, borderRadius: radius.card, backgroundColor: color.card, gap: 10, marginTop: space.md },
  row: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6 },
  h: { fontSize: 12, fontFamily: "Manrope_700Bold", color: color.mutedForeground, textTransform: "uppercase" as const },
  sub: { fontSize: 12, fontFamily: "Manrope_700Bold", color: color.foreground },
  body: { fontSize: 14, color: color.foreground },
  bold: { fontSize: 14, fontFamily: "Manrope_700Bold", color: color.foreground, flexShrink: 1 },
  muted: { fontSize: 12, color: color.mutedForeground },
  pill: { fontSize: 11, fontFamily: "Manrope_700Bold" },
  item: { padding: 10, borderRadius: radius.control, borderWidth: 1, borderColor: color.border, gap: 6 },
  agreed: { padding: 10, borderRadius: radius.control, borderWidth: 1, borderColor: color.success, gap: 8 },
  offer: { padding: 10, borderRadius: radius.control, borderWidth: 1, borderColor: color.brand, gap: 8 },
  step: { fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, overflow: "hidden" as const, backgroundColor: color.muted, color: color.mutedForeground },
  stepOn: { backgroundColor: color.brand, color: color.brandForeground },
  stepDone: { color: color.success },
  input: { minHeight: 42, paddingHorizontal: 10, borderRadius: radius.control, borderWidth: 1, borderColor: color.border, color: color.foreground, fontSize: 15 },
  chip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.control, backgroundColor: color.muted, maxWidth: 220 },
  chipOn: { backgroundColor: color.brand },
  chipText: { fontSize: 12, color: color.foreground },
  chipTextOn: { color: color.brandForeground, fontFamily: "Manrope_700Bold" },
  btn: { paddingHorizontal: 12, minHeight: 36, borderRadius: radius.control, justifyContent: "center" as const },
  btnText: { color: "#fff", fontSize: 13, fontFamily: "Manrope_700Bold" },
  btnLine: { paddingHorizontal: 12, minHeight: 36, borderRadius: radius.control, borderWidth: 1, borderColor: color.border, justifyContent: "center" as const },
  btnLineText: { fontSize: 13, fontFamily: "Manrope_600SemiBold", color: color.foreground },
}));

/**
 * Aloqa tugmalari (TZ v3 §13): «Qo'ng'iroq · Yozish (FURAM messenjer) ·
 * Taklif qilish» — e'lon OSTIDA katta va rangli, pastki qotib turuvchi
 * panelda ham (`ixcham`). Odamlarning 90 foizi aloqani pastda topa olmasdi.
 */
export function AloqaTugmalari({
  egaId,
  elon,
  onQongiroq,
  onTaklif,
  ixcham = false,
}: {
  /** Platformadagi egasi — bo'lmasa (ochiq manba) «Yozish» chiqmaydi */
  egaId?: string | null;
  /** E'londan suhbat — kontakt limiti `/api/chats` da (e'lon bo'yicha) */
  elon: { kind: "load" | "truck"; id: string };
  onQongiroq: () => void;
  /** null — taklif mumkin emas (o'z e'loni, reys bor) */
  onTaklif?: (() => void) | null;
  ixcham?: boolean;
}) {
  const router = useRouter();
  const [band, setBand] = useState(false);
  async function yoz() {
    if (!egaId) return;
    setBand(true);
    try {
      const r = await api<{ chatId: string }>("/api/chats", { method: "POST", body: elon });
      router.push({ pathname: "/suhbat/[id]", params: { id: r.chatId } } as never);
    } catch (e) {
      xabarcha({ matn: (e as FuramError).message, ohang: "xato" });
    } finally {
      setBand(false);
    }
  }
  const tugma = (key: string, matn: string, bg: string, on: () => void) => (
    <Pressable key={key} onPress={on} disabled={band} style={({ pressed }) => [ixcham ? sa.aloqaIxcham : sa.aloqa, { backgroundColor: bg }, pressed && { opacity: 0.85 }]}>
      <Text style={sa.aloqaText} numberOfLines={1}>{matn}</Text>
    </Pressable>
  );
  return (
    <View style={[s.row, { gap: 8 }]}>
      {tugma("tel", `📞 ${t("taklif.qongiroq")}`, color.success, onQongiroq)}
      {egaId ? tugma("yoz", `💬 ${t("taklif.yozish")}`, color.info, () => void yoz()) : null}
      {onTaklif ? tugma("taklif", `🤝 ${t("taklif.yuborish")}`, color.brand, onTaklif) : null}
    </View>
  );
}

const sa = themed(() => ({
  aloqa: { flex: 1, minHeight: 52, borderRadius: radius.control, alignItems: "center" as const, justifyContent: "center" as const, paddingHorizontal: 6 },
  aloqaIxcham: { flex: 1, minHeight: 46, borderRadius: radius.control, alignItems: "center" as const, justifyContent: "center" as const, paddingHorizontal: 4 },
  aloqaText: { color: "#fff", fontSize: 14, fontFamily: "Manrope_700Bold" },
}));
