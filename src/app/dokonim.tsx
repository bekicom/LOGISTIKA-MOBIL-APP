/**
 * Z3 — do'konim: kelgan buyurtmalar va detallar.
 *
 * ── SOTUVCHINING KUNI IKKI ISHDAN IBORAT ────────────────────────
 *
 * Kelgan buyurtmani ko'rish va detal qo'shish. Buyurtmalar tepada:
 * sotuvchi ilovani aynan shuning uchun ochadi.
 *
 * ── HOLAT BIR BOSISHDA O'ZGARADI ────────────────────────────────
 *
 * Tasdiqlash → yo'lga chiqdi → yetkazildi. Keyingi qadamni SERVER
 * aytadi (`next`), ekran uni takrorlamaydi — zanjir bir joyda
 * tursin.
 *
 * ── PULLIK, LEKIN YASHIRILMAYDI ─────────────────────────────────
 *
 * `parts` tarifi kerak. Bozor va Ustaxonadagi bilan bir xil qoida:
 * bo'lim ochiq, tugma sababini darhol aytadi.
 */
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Field, Header, Switch } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { LocationPicker, type Loc } from "@/components/FiltrSheet";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, font, radius, space } from "@/lib/theme";
import { partConditionLabel, partOrderStatusLabel, partStockLabel, t } from "@/lib/i18n";

type Shop = {
  name: string;
  about: string | null;
  phone: string | null;
  address: string | null;
  workHours: string | null;
  delivery: boolean;
  location: string | null;
  isApproved: boolean;
};

type Order = {
  id: string;
  orderNo: number;
  name: string;
  oem: string | null;
  quantity: number;
  /* BUTUN buyurtmaning narxi (`orderPart` donaga ko'paytirgan) */
  total: number;
  currency: string;
  delivery: boolean;
  address: string | null;
  note: string | null;
  status: string;
  buyer: string;
  phone: string | null;
  serviceNo: number | null;
  next: string | null;
};

type Part = {
  id: string;
  name: string;
  oem: string | null;
  brand: string | null;
  model: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  condition: string;
  price: number;
  currency: string;
  stock: string;
  quantity: number | null;
  isActive: boolean;
};

const STOCK_TONE: Record<string, string> = {
  IN_STOCK: color.success,
  LOW: color.warning,
  OUT: color.danger,
};

export default function Dokonim() {
  const insets = useSafeAreaInsets();

  const { data, loading, error, refreshing, refresh, reload } = useApi<{
    shop: Shop | null;
    canSell: boolean;
    stats: { fresh: number; shipping: number; parts: number };
    orders: Order[];
    parts: Part[];
  }>("/api/parts/shop");

  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState("");
  const [shopForm, setShopForm] = useState(false);
  const [partForm, setPartForm] = useState<Part | true | null>(null);

  async function move(id: string, status: string) {
    setBusy(id);
    setFailed("");
    try {
      await api("/api/parts", { method: "POST", body: { action: "order-status", id, status } });
      reload();
    } catch (e) {
      setFailed((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(null);
    }
  }

  const shop = data?.shop ?? null;

  return (
    <View style={s.root}>
      <Header
        title={t("mob.part.myShop")}
        subtitle={
          shop
            ? shop.isApproved
              ? shop.name
              : t("mob.part.shopWait")
            : t("mob.part.noShop")
        }
      />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {loading && !data ? (
          <Skeleton rows={3} />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : !shop ? (
          /* ══ Do'kon hali ochilmagan ══ */
          <View style={s.card}>
            <Text style={s.sec}>{t("mob.part.openTitle")}</Text>
            <Text style={s.text}>{t("mob.part.openText")}</Text>

            {data?.canSell ? (
              <Pressable style={[s.btn, s.btnPri]} onPress={() => setShopForm(true)}>
                <Text style={s.btnPriText}>{t("mob.part.openBtn")}</Text>
              </Pressable>
            ) : (
              <View style={s.locked}>
                <Text style={s.lockedTitle}>{t("mob.part.lockedTitle")}</Text>
                <Text style={s.lockedText}>{t("mob.part.lockedText")}</Text>
              </View>
            )}
          </View>
        ) : (
          <>
            {failed ? (
              <View style={s.failed}>
                <Text style={s.failedText}>{failed}</Text>
              </View>
            ) : null}

            {/* TASDIQLANMAGAN DO'KON qidiruvda chiqmaydi */}
            {!shop.isApproved && (
              <View style={s.warn}>
                <Text style={s.warnTitle}>{t("mob.part.waitTitle")}</Text>
                <Text style={s.warnText}>{t("mob.part.waitText")}</Text>
              </View>
            )}

            <View style={s.stats}>
              <Stat label={t("mob.part.statFresh")} value={data?.stats.fresh ?? 0} accent />
              <Stat label={t("mob.part.statShipping")} value={data?.stats.shipping ?? 0} />
              <Stat label={t("mob.part.statParts")} value={data?.stats.parts ?? 0} />
            </View>

            {/* ══ Kelgan buyurtmalar ══ */}
            <View>
              <Text style={s.group}>{t("mob.part.incoming")}</Text>
              {(data?.orders ?? []).length === 0 ? (
                <View style={s.empty}>
                  <Text style={s.emptyText}>{t("mob.part.noIncoming")}</Text>
                </View>
              ) : (
                <View style={{ gap: space.sm }}>
                  {(data?.orders ?? []).map((o) => (
                    <View key={o.id} style={[s.card, o.status === "NEW" && s.cardNew]}>
                      <View style={s.cardHead}>
                        <View
                          style={[
                            s.tag,
                            o.status === "NEW" && { backgroundColor: color.brand + "1f" },
                          ]}
                        >
                          <Text
                            style={[s.tagText, o.status === "NEW" && { color: "#c2490f" }]}
                          >
                            {partOrderStatusLabel(o.status)}
                          </Text>
                        </View>
                        <Text style={s.no}>#{o.orderNo}</Text>
                      </View>

                      <Text style={s.name}>
                        {o.name} · {o.quantity} {t("mob.part.pcs")}
                      </Text>
                      {o.oem ? <Text style={s.oem}>{o.oem}</Text> : null}

                      <View style={s.buyerRow}>
                        <Text style={s.buyer} numberOfLines={1}>
                          {o.buyer} · {o.delivery ? t("mob.part.delivery") : t("mob.part.pickup")}
                        </Text>
                        <Text style={s.price}>
                          {fmtNum(o.total)} {o.currency}
                        </Text>
                      </View>

                      {o.address ? <Text style={s.addr}>{o.address}</Text> : null}
                      {o.note ? <Text style={s.addr}>{o.note}</Text> : null}
                      {o.serviceNo != null && (
                        <Text style={s.addr}>{t("mob.part.linkedTo", { n: o.serviceNo })}</Text>
                      )}

                      <View style={s.acts}>
                        {o.phone && (
                          <Pressable
                            style={[s.small, s.smallGhost]}
                            onPress={() => void Linking.openURL(`tel:${o.phone}`)}
                          >
                            <Text style={s.smallGhostText}>{t("mob.part.call")}</Text>
                          </Pressable>
                        )}
                        {o.status === "NEW" && (
                          <Pressable
                            style={[s.small, s.smallGhost]}
                            disabled={busy === o.id}
                            onPress={() => void move(o.id, "CANCELLED")}
                          >
                            <Text style={s.smallGhostText}>{t("mob.part.cancel")}</Text>
                          </Pressable>
                        )}
                        {o.next && (
                          <Pressable
                            style={[s.small, s.smallPri]}
                            disabled={busy === o.id}
                            onPress={() => void move(o.id, o.next!)}
                          >
                            <Text style={s.smallPriText}>
                              {t(`mob.part.to_${o.next}`)}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* ══ Detallarim ══ */}
            <View>
              <Text style={s.group}>{t("mob.part.myParts")}</Text>
              <View style={{ gap: space.sm }}>
                {(data?.parts ?? []).map((p) => {
                  const tone = STOCK_TONE[p.stock] ?? color.mutedForeground;
                  return (
                    <Pressable key={p.id} style={s.card} onPress={() => setPartForm(p)}>
                      <View style={s.partRow}>
                        <View style={s.thumb}>
                          <Icon name="package" size={20} stroke="#94a3b8" />
                        </View>
                        <View style={{ flexGrow: 1, minWidth: 0 }}>
                          <Text style={s.name} numberOfLines={1}>
                            {p.name}
                          </Text>
                          <Text style={s.oem} numberOfLines={1}>
                            {[p.oem, p.quantity != null ? `${p.quantity} ${t("mob.part.pcs")}` : null]
                              .filter(Boolean)
                              .join(" · ")}
                          </Text>
                          <Text style={s.price}>
                            {fmtNum(p.price)} {p.currency}
                          </Text>
                        </View>
                        <View style={[s.chip, { backgroundColor: tone + "1a" }]}>
                          <Text style={[s.chipText, { color: tone }]}>
                            {partStockLabel(p.stock)}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}

                <Pressable style={s.add} onPress={() => setPartForm(true)}>
                  <Icon name="plus" size={17} stroke="#94a3b8" />
                  <Text style={s.addText}>{t("mob.part.addPart")}</Text>
                </Pressable>
              </View>
            </View>

            <Pressable style={s.shopRow} onPress={() => setShopForm(true)}>
              <View style={s.shopIcon}>
                <Icon name="doc" size={19} stroke={color.mutedForeground} />
              </View>
              <View style={{ flexGrow: 1 }}>
                <Text style={s.shopTitle}>{t("mob.part.shopInfo")}</Text>
                <Text style={s.shopSub} numberOfLines={1}>
                  {[shop.location, shop.workHours].filter(Boolean).join(" · ") ||
                    t("mob.part.shopInfoSub")}
                </Text>
              </View>
              <Icon name="chevron" size={18} stroke="#cbd5e1" />
            </Pressable>
          </>
        )}
      </ScrollView>

      <ShopSheet
        open={shopForm}
        shop={shop}
        onClose={() => setShopForm(false)}
        onDone={() => {
          setShopForm(false);
          reload();
        }}
      />
      <PartSheet
        open={partForm !== null}
        part={partForm === true ? null : partForm}
        onClose={() => setPartForm(null)}
        onDone={() => {
          setPartForm(null);
          reload();
        }}
      />
    </View>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <View style={s.stat}>
      <Text style={s.statKey}>{label}</Text>
      <Text style={[s.statValue, accent && { color: color.brand }]}>{value}</Text>
    </View>
  );
}

/** Do'kon ma'lumoti */
function ShopSheet({
  open,
  shop,
  onClose,
  onDone,
}: {
  open: boolean;
  shop: Shop | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(shop?.name ?? "");
  const [phone, setPhone] = useState(shop?.phone ?? "");
  const [address, setAddress] = useState(shop?.address ?? "");
  const [workHours, setWorkHours] = useState(shop?.workHours ?? "");
  const [delivery, setDelivery] = useState(shop?.delivery ?? false);
  const [loc, setLoc] = useState<Loc | null>(null);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const insets = useSafeAreaInsets();

  async function save() {
    setBusy(true);
    setErr("");
    try {
      await api("/api/parts", {
        method: "POST",
        body: {
          action: "shop",
          name: name.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          workHours: workHours.trim() || null,
          delivery,
          locationId: loc?.id ?? null,
        },
      });
      onDone();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.sheetBack}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={s.sheetScroll}
          contentContainerStyle={[s.sheet, { paddingBottom: insets.bottom + space.lg }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.grab} />
          <Text style={s.sheetTitle}>{t("mob.part.shopInfo")}</Text>
          {err ? <ErrorBox message={err} /> : null}

          <Field label={t("mob.part.shopName")} value={name} onChangeText={setName} />
          <View>
            <Text style={s.label}>{t("mob.svc.city")}</Text>
            <Pressable style={s.locBtn} onPress={() => setPicking(true)}>
              <Text style={[s.locText, !loc && s.locPh]}>
                {loc?.name ?? shop?.location ?? t("mob.sale.wherePh")}
              </Text>
            </Pressable>
          </View>
          <Field label={t("mob.sale.address")} value={address} onChangeText={setAddress} />
          <Field
            label={t("mob.svc.workHours")}
            value={workHours}
            onChangeText={setWorkHours}
            placeholder={t("mob.svc.workHoursPh")}
          />
          <Field
            label={t("mob.svc.phone")}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <View style={s.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.switchTitle}>{t("mob.part.doDelivery")}</Text>
              <Text style={s.switchHint}>{t("mob.part.doDeliveryHint")}</Text>
            </View>
            <Switch value={delivery} onValueChange={setDelivery} />
          </View>

          <Button
            title={t("mob.common.save")}
            disabled={name.trim().length === 0}
            loading={busy}
            onPress={() => void save()}
          />
          <Pressable onPress={onClose} style={s.later}>
            <Text style={s.laterText}>{t("mob.common.cancel")}</Text>
          </Pressable>

          <LocationPicker
            open={picking}
            title={t("mob.svc.city")}
            onClose={() => setPicking(false)}
            onPick={(l) => {
              setLoc(l);
              setPicking(false);
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * Detal qo'shish yoki tahrirlash.
 *
 * ARTIKUL BIRINCHI KATAK: xaridor aynan shu raqam bilan qidiradi
 * (`partMatches` avval OEM ni tekshiradi). Majburiy emas — ba'zi
 * detalda raqam yo'q — lekin nima uchun kerakligi yozilgan.
 */
function PartSheet({
  open,
  part,
  onClose,
  onDone,
}: {
  open: boolean;
  part: Part | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [oem, setOem] = useState(part?.oem ?? "");
  const [name, setName] = useState(part?.name ?? "");
  const [brand, setBrand] = useState(part?.brand ?? "");
  const [model, setModel] = useState(part?.model ?? "");
  const [yearFrom, setYearFrom] = useState(part?.yearFrom != null ? String(part.yearFrom) : "");
  const [yearTo, setYearTo] = useState(part?.yearTo != null ? String(part.yearTo) : "");
  const [price, setPrice] = useState(part ? String(part.price) : "");
  const [condition, setCondition] = useState(part?.condition ?? "NEW");
  const [stock, setStock] = useState(part?.stock ?? "IN_STOCK");
  const [quantity, setQuantity] = useState(part?.quantity != null ? String(part.quantity) : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const insets = useSafeAreaInsets();

  const amount = Number(price.replace(/\s/g, ""));

  async function save() {
    setBusy(true);
    setErr("");
    try {
      await api("/api/parts", {
        method: "POST",
        body: {
          action: "part",
          id: part?.id ?? null,
          oem: oem.trim() || null,
          name: name.trim(),
          brand: brand.trim() || null,
          model: model.trim() || null,
          yearFrom: yearFrom ? Number(yearFrom) : null,
          yearTo: yearTo ? Number(yearTo) : null,
          price: amount,
          currency: part?.currency ?? "UZS",
          condition,
          stock,
          quantity: quantity ? Number(quantity) : null,
        },
      });
      onDone();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.sheetBack}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={s.sheetScroll}
          contentContainerStyle={[s.sheet, { paddingBottom: insets.bottom + space.lg }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.grab} />
          <Text style={s.sheetTitle}>
            {part ? t("mob.part.editPart") : t("mob.part.addPart")}
          </Text>
          {err ? <ErrorBox message={err} /> : null}

          <Field
            label={t("mob.part.oem")}
            value={oem}
            onChangeText={setOem}
            autoCapitalize="characters"
            style={s.mono}
          />
          <Text style={s.hint}>{t("mob.part.oemHint")}</Text>

          <Field label={t("mob.part.name")} value={name} onChangeText={setName} />

          <View style={s.two}>
            <View style={{ flex: 1 }}>
              <Field label={t("mob.sale.brand")} value={brand} onChangeText={setBrand} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t("mob.sale.model")} value={model} onChangeText={setModel} />
            </View>
          </View>

          {/* YIL ORALIG'I — xaridor «Volvo FH 2019» deb filtrlaydi.
              Yozilmasa detal filtrdan tushib qolmaydi, lekin mos
              kelishiga ham kafolat bo'lmaydi. */}
          <View>
            <Text style={s.label}>{t("mob.part.forYears")}</Text>
            <View style={s.yearRow}>
              <View style={{ flex: 1 }}>
                <Field
                  label=""
                  value={yearFrom}
                  onChangeText={setYearFrom}
                  keyboardType="number-pad"
                  placeholder="2013"
                />
              </View>
              <Text style={s.dash}>—</Text>
              <View style={{ flex: 1 }}>
                <Field
                  label=""
                  value={yearTo}
                  onChangeText={setYearTo}
                  keyboardType="number-pad"
                  placeholder="2021"
                />
              </View>
            </View>
          </View>

          <Field
            label={t("mob.sale.price")}
            value={price}
            onChangeText={setPrice}
            keyboardType="number-pad"
          />

          <View>
            <Text style={s.label}>{t("mob.part.condition")}</Text>
            <View style={s.picks}>
              {(["NEW", "USED"] as const).map((c) => (
                <Pressable
                  key={c}
                  style={[s.pick, condition === c && s.pickOn]}
                  onPress={() => setCondition(c)}
                >
                  <Text style={[s.pickText, condition === c && s.pickTextOn]}>
                    {partConditionLabel(c)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View>
            <Text style={s.label}>{t("mob.part.inShop")}</Text>
            <View style={s.picks}>
              {(["IN_STOCK", "LOW", "OUT"] as const).map((k) => (
                <Pressable
                  key={k}
                  style={[s.pick, stock === k && s.pickOn]}
                  onPress={() => setStock(k)}
                >
                  <Text style={[s.pickText, stock === k && s.pickTextOn]}>
                    {partStockLabel(k)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {stock !== "OUT" && (
            <Field
              label={t("mob.part.howMany")}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
            />
          )}

          <Button
            title={t("mob.common.save")}
            disabled={name.trim().length === 0 || !(amount > 0)}
            loading={busy}
            onPress={() => void save()}
          />
          <Pressable onPress={onClose} style={s.later}>
            <Text style={s.laterText}>{t("mob.common.cancel")}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.lg },
  group: {
    fontSize: 12,
    fontWeight: "600",
    color: color.mutedForeground,
    letterSpacing: 0.3,
    marginBottom: 7,
    marginLeft: 4,
  },

  failed: {
    borderWidth: 1,
    borderColor: color.danger + "59",
    backgroundColor: color.danger + "0d",
    borderRadius: radius.control,
    padding: space.md,
  },
  failedText: { fontSize: font.caption, color: color.danger },

  warn: {
    borderWidth: 1,
    borderColor: color.warning + "59",
    backgroundColor: color.warning + "0d",
    borderRadius: radius.control,
    padding: space.md,
  },
  warnTitle: { fontSize: font.caption, fontWeight: "600", color: "#92400e" },
  warnText: { fontSize: 12, color: "#92400e", marginTop: 4, lineHeight: 18 },

  stats: { flexDirection: "row", gap: 10 },
  stat: {
    flex: 1,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  statKey: { fontSize: 11, color: "#94a3b8" },
  statValue: { fontSize: 20, fontWeight: "700", color: color.foreground, marginTop: 1 },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.md,
  },
  cardNew: { borderWidth: 2, borderColor: color.brand },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 7 },
  tag: { height: 21, paddingHorizontal: 8, borderRadius: 6, backgroundColor: color.muted, justifyContent: "center" },
  tagText: { fontSize: 10, fontWeight: "700", color: color.mutedForeground },
  no: { marginLeft: "auto", fontSize: 11, color: "#94a3b8" },

  name: { fontSize: 15, fontWeight: "600", color: color.foreground, marginTop: 10 },
  oem: { fontSize: 12, color: color.mutedForeground, marginTop: 2, fontFamily: "monospace" },
  price: { fontSize: 15, fontWeight: "700", color: color.foreground, marginTop: 3 },

  buyerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginTop: 11,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: color.muted,
  },
  buyer: { flex: 1, fontSize: 12, color: color.mutedForeground },
  addr: { fontSize: 12, color: color.mutedForeground, marginTop: 6, lineHeight: 18 },

  acts: { flexDirection: "row", gap: 7, marginTop: 12, flexWrap: "wrap" },
  small: { height: 36, paddingHorizontal: 15, borderRadius: 9, justifyContent: "center" },
  smallPri: { marginLeft: "auto", backgroundColor: color.brand },
  smallPriText: { fontSize: 13, fontWeight: "600", color: color.brandForeground },
  smallGhost: { borderWidth: 1, borderColor: color.border },
  smallGhostText: { fontSize: 13, fontWeight: "600", color: color.mutedForeground },

  partRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  chip: { height: 26, paddingHorizontal: 10, borderRadius: 8, backgroundColor: color.muted, justifyContent: "center" },
  chipText: { fontSize: 12, fontWeight: "500", color: color.mutedForeground },

  add: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#cbd5e1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addText: { fontSize: 14, fontWeight: "600", color: "#94a3b8" },

  shopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.md,
  },
  shopIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  shopTitle: { fontSize: 14, fontWeight: "600", color: color.foreground },
  shopSub: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },

  sec: { fontSize: 15, fontWeight: "700", color: color.foreground },
  text: { fontSize: 13, color: color.mutedForeground, marginTop: 8, lineHeight: 20 },
  hint: { fontSize: 12, color: color.mutedForeground, lineHeight: 18 },

  locked: {
    marginTop: 13,
    padding: space.md,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.warning + "59",
    backgroundColor: color.warning + "0d",
  },
  lockedTitle: { fontSize: font.caption, fontWeight: "600", color: "#92400e" },
  lockedText: { fontSize: 12, color: "#92400e", marginTop: 4, lineHeight: 18 },

  empty: { padding: space.lg, alignItems: "center" },
  emptyText: { fontSize: 13, color: color.mutedForeground, textAlign: "center", lineHeight: 19 },

  btn: { height: 46, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 14 },
  btnPri: { backgroundColor: color.brand },
  btnPriText: { fontSize: 15, fontWeight: "600", color: color.brandForeground },

  sheetBack: { flex: 1, backgroundColor: "#0f172acc", justifyContent: "flex-end" },
  sheetScroll: { maxHeight: "90%", flexGrow: 0 },
  sheet: {
    backgroundColor: color.background,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: space.lg,
    gap: space.sm,
  },
  grab: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#cbd5e1", alignSelf: "center", marginBottom: space.xs },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: color.foreground, marginBottom: space.xs },

  label: { fontSize: 12, fontWeight: "600", color: color.mutedForeground, marginBottom: 5 },
  mono: { fontFamily: "monospace", fontWeight: "600" },

  two: { flexDirection: "row", gap: 10 },
  yearRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dash: { fontSize: 15, color: "#94a3b8" },
  picks: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pick: {
    height: 40,
    paddingHorizontal: 13,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
    justifyContent: "center",
  },
  pickOn: { backgroundColor: color.brand + "17", borderColor: color.brand },
  pickText: { fontSize: 13, fontWeight: "500", color: color.mutedForeground },
  pickTextOn: { color: "#c2490f", fontWeight: "600" },

  switchRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  switchTitle: { fontSize: 14, fontWeight: "600", color: color.foreground },
  switchHint: { fontSize: 12, color: color.mutedForeground, marginTop: 1, lineHeight: 17 },

  locBtn: {
    height: 46,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 10,
    backgroundColor: color.card,
    justifyContent: "center",
    paddingHorizontal: 13,
  },
  locText: { fontSize: 15, color: color.foreground },
  locPh: { color: "#94a3b8" },

  later: { alignItems: "center", paddingVertical: space.md },
  laterText: { fontSize: font.body, fontWeight: "600", color: color.mutedForeground },
});
