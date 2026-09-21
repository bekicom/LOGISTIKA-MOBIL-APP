/** E'lon va reys kartochkalari — bosh sahifa, yuklar va reyslarda ishlatiladi. */
import { useState } from "react";
import { Animated, Image, Pressable, StyleSheet, View } from "react-native";
import { Tap } from "@/components/Tap";
import { stagger, useFadeUp, useReduceMotion } from "@/lib/motion";
import { Text } from "@/components/Text";
import { Icon } from "./Icon";
import { TruckImage } from "./TruckImage";
import { vehiclePhoto } from "@/lib/img";
import { color, font, radius, shadow, space, themed } from "@/lib/theme";
import { t, tOr } from "@/lib/i18n";
import { saqlashniAlmashtir, useSaqlangan, type SaqlashTuri } from "@/lib/saqlangan";
import { guestBlocked } from "@/lib/guest-gate";

/* ─────────────────────────────────────────────── umumiy bo'laklar */

export function Route({ from, fromC, to, toC, size = 18 }: {
  from: string; fromC?: string | null; to: string; toC?: string | null; size?: number;
}) {
  return (
    <View style={s.route}>
      <View style={{ flex: 1 }}>
        {/* IKKI QATORGACHA (2026-09-20 tekshiruvi): tafsilot ekranida
            nom to'liq keladi («Toshkent (poytaxt)» — 195 px) va bitta
            qatorga sig'masdi. Lentada nom qisqartirilgan, shuning
            uchun u yerda baribir bitta qator bo'lib qoladi. */}
        <Text style={[s.city, { fontSize: size }]} numberOfLines={2}>{from}</Text>
        {fromC ? <Text style={s.country}>{country(fromC)}</Text> : null}
      </View>
      {/* Dizayn-2: strelka brend rangida, aylanada — yo'nalish
          kartaning bosh belgisi (diip: «TOSHKENT → BUXORO») */}
      <View style={s.arrow}>
        <Icon name="arrow-right" size={16} stroke={color.brand} />
      </View>
      <View style={{ flex: 1, alignItems: "flex-end" }}>
        <Text style={[s.city, { fontSize: size, textAlign: "right" }]} numberOfLines={2}>{to}</Text>
        {toC ? <Text style={s.country}>{country(toC)}</Text> : null}
      </View>
    </View>
  );
}

/* Davlat nomi lug'atdan olinadi — ilgari shu yerda o'zbekcha
   ro'yxat turardi va rus tilidagi ekranda ham o'zbekcha chiqardi.
   Bo'lim — `countryName` (bazadagi 46 davlat): ilgari `jobCatalog.countries`
   edi, u esa ish katalogi — 17 ta, va Niderlandiyaga ketadigan yukda
   `[missing "ru.jobCatalog.countries.NL" translation]` chiqardi
   (2026-09-19). Bazaga yangi davlat qo'shilsa-yu nomi hali yo'q bo'lsa —
   ISO kod */
export const davlatNomi = (code: string) => tOr(`countryName.${code}`, code);
const country = davlatNomi;

export function Chip({ text, tone = "muted" }: { text: string; tone?: "muted" | "success" | "brand" | "warning" | "danger" | "info" }) {
  /* ⚠️ FON ham TOKEN (2026-09-10). Ilgari u aksent rangning
     alfali variantidan yasalardi (`#16a34a1f` — 12% yashil).
     Yorug' fonda bu och yashil beradi, QORONG'IDA esa deyarli
     ko'rinmas dog': shaffof rang ostidagi to'q karta yutib
     yuboradi. `*Soft` token'lari har rejim uchun alohida
     tanlangan va kartadan ajralishi hisob bilan tekshirilgan. */
  const bg = {
    muted: color.muted, success: color.successSoft, brand: color.brandSoft,
    warning: color.warningSoft, danger: color.dangerSoft, info: color.blueSoft,
  }[tone];
  const fg = {
    muted: color.icon, success: color.successText, brand: color.brandText,
    warning: color.warningText, danger: color.dangerText, info: color.blue,
  }[tone];
  return (
    <View style={[s.chip, { backgroundColor: bg }]}>
      <Text style={[s.chipText, { color: fg }]}>{text}</Text>
    </View>
  );
}

export function StatusChip({ label, tone }: { label: string; tone: "brand" | "warning" | "success" | "info" | "muted" | "danger" }) {
  const dot = { brand: color.brand, warning: color.warning, success: color.success, info: color.info, muted: "#94a3b8", danger: color.danger }[tone];
  const bg = { brand: "#f45a181f", warning: "#b453091f", success: "#16a34a1f", info: "#1d4ed81a", muted: color.muted, danger: "#dc26261a" }[tone];
  const fg = { brand: color.brandText, warning: color.warningText, success: color.successText, info: "#1e40af", muted: color.icon, danger: color.dangerText }[tone];
  return (
    <View style={[s.chip, { backgroundColor: bg, flexDirection: "row", alignItems: "center", gap: 6 }]}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot }} />
      <Text style={[s.chipText, { color: fg, fontWeight: "600" }]}>{label}</Text>
    </View>
  );
}

/** Reys holatiga rang — TZ dagi jadval bilan bir xil */
export function toneFor(status: string) {
  if (status === "AT_BORDER" || status === "TO_LOADING" || status === "LOADED") return "warning" as const;
  if (status === "ON_ROAD" || status === "NEAR_DESTINATION") return "brand" as const;
  if (status === "UNLOADED" || status === "CLOSED") return "success" as const;
  if (status === "CANCELLED") return "danger" as const;
  if (status === "CLOSING") return "muted" as const;
  return "info" as const;
}

/* ─────────────────────────────────────────────── e'lon kartasi */

export type Listing = {
  id: string;
  title?: string | null;
  from: string; fromCountry?: string | null;
  to: string; toCountry?: string | null;
  weightT?: number | null;
  vehicleType?: string | null;
  price?: number | null;
  currency?: string;
  isNegotiable?: boolean;
  isReadyNow?: boolean;
  isTop?: boolean;
  createdAt?: string;
  owner?: { name: string } | null;
  /** Transport turi kaliti — kartada ikonka uchun (`/api/loads/list`) */
  vehicleTypeKey?: string | null;
  /**
   * E'lon manbasi va asl e'londa RAQAM bor-yo'qligi (2026-09-10).
   *
   * ⚠️ Bu ikkisi 09-10 dagi o'zgarishdan keyin kerak bo'ldi: ilgari
   * lentada FAQAT raqamli Telegram e'lonlari bo'lardi va ajratishning
   * ma'nosi yo'q edi. Endi raqamsizlari ham chiqadi — ular bilan asl
   * post orqali bog'laniladi.
   *
   * Farqni ko'rsatmasak, odam kartani raqam kutib bosardi va har
   * ikkinchisida kutgani chiqmasdi: yangi e'lonlar foyda o'rniga
   * g'ashlik keltirardi.
   */
  source?: string | null;
  hasPhone?: boolean;
  /** Necha marta ko'rilgan — kartada 👁 (2026-09-21, web kartochkasida ham bor) */
  views?: number | null;
  /** Shu odam saqlaganmi — 🔖 to'la chiziladi (`/api/loads/list`) */
  saved?: boolean;
};

/**
 * «Havola» belgisi — raqamsiz Telegram e'lonida.
 *
 * ⚠️ MAVJUD QATORDA chiziladi, yangi o'ramsiz: o'rovchi `View`
 * belgi chizilmaganda ham joy egallardi (shu loyihada ilgari
 * topilgan xato). Shuning uchun bu funksiya `null` qaytaradi.
 */
function LinkOnly({ item }: { item: Listing }) {
  if (item.source !== "TELEGRAM" || item.hasPhone !== false) return null;
  return <Chip text={t("mob.listing.linkOnly")} />;
}

/**
 * Valyutasiz son: 620 000 km, 24 oy, 214 ko'rish.
 *
 * `money()` bilan bir xil ajratgich ishlatiladi — bir ekranda ikki
 * xil yozilishi («620000» va «58 000») e'tiborni tortadi va
 * beparvolikdek ko'rinadi.
 */
/**
 * E'lon nomi — Telegram e'lonida havola bo'lib qolgan bo'lsa CHIQMAYDI.
 *
 * Nom Telegram xabaridan ajratiladi va ba'zan guruh reklamasining bir
 * bo'lagi tushib qoladi: «lar: https://t» (2026-09-21, lentada ketma-ket
 * kartalarda ko'rindi). Bunday nom yukni emas, reklamani bildiradi.
 * Odamlar o'zi yozgan nomga tegilmaydi.
 *
 * ⚠️ Ildizi serverda — Telegram xabaridan nom ajratish. Bu yerda faqat
 * ko'rsatish to'sig'i.
 */
export function elonNomi(title: string | null | undefined, telegram: boolean): string | null {
  if (!title) return null;
  if (telegram && /https?:|t\.me\//i.test(title)) return null;
  return title;
}

export function fmtNum(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(n);
}

export function money(price: number | null | undefined, currency = "UZS", negotiable?: boolean) {
  if (negotiable || price == null) return null;
  // Web'dagidek: ru-RU bo'shliq bilan ajratadi — 28 000 000
  return `${new Intl.NumberFormat("ru-RU").format(price)} ${currency}`;
}

/* Qisqartmalar o'zbekcha qotib qolgan edi («daq», «soat», «kun») va
   ruscha interfeysda ham shundayligicha chiqardi (2026-09-04). */
export function ago(iso?: string) {
  if (!iso) return "";
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  /* «0 daq» xatoga o'xshardi (2026-09-21, Bekzod emulyatorda) */
  if (m < 1) return t("mob.ago.now");
  if (m < 60) return t("mob.ago.min", { n: m });
  const h = Math.round(m / 60);
  if (h < 24) return t("mob.ago.hour", { n: h });
  return t("mob.ago.day", { n: Math.round(h / 24) });
}

/** E'lon YANGI hisoblanadi — shu vaqt ichida joylangan bo'lsa */
const YANGI_MS = 3 * 3_600_000;

/**
 * Yo'nalish — TIK chiziqda: yuqorida qayerdan, pastda qayerga.
 *
 * Kartada ilgari `Route` edi — ikki ustun, o'rtada strelka. Manzil
 * o'ngga tekislanib, uzun nom («Qashqadaryo · Shahrisabz») ikkiga
 * bo'linardi va ko'z har kartada ikki chekkaga sakrardi. Tik chiziq
 * — yuk ilovalaridagi odatiy ko'rinish: nom qancha uzun bo'lsa ham
 * chapdan o'qiladi, o'ng tomon esa narxga bo'shaydi.
 *
 * Chiziq ikki bo'lakdan: birinchi qatorda nuqta + pastga to'ldiruvchi
 * chiziq (qator balandligi nomning uzunligiga qarab o'zgaradi),
 * ikkinchisida qisqa chiziq + nuqta. Shunda nuqtalar har doim nomning
 * birinchi qatori ro'parasida turadi.
 */
function RouteStack({ from, fromC, to, toC }: { from: string; fromC?: string | null; to: string; toC?: string | null }) {
  return (
    <View style={s.rs}>
      <View style={s.rsRow}>
        <View style={s.rsRail}>
          <View style={s.rsDotFrom} />
          <View style={s.rsLine} />
        </View>
        <View style={s.rsText}>
          <Text style={s.rsCity} numberOfLines={2}>{from}</Text>
          {fromC ? <Text style={s.rsCountry}>{country(fromC)}</Text> : null}
        </View>
      </View>
      <View style={[s.rsRow, { paddingBottom: 0 }]}>
        <View style={s.rsRail}>
          <View style={s.rsLineTop} />
          <View style={s.rsDotTo} />
        </View>
        <View style={s.rsText}>
          <Text style={s.rsCity} numberOfLines={2}>{to}</Text>
          {toC ? <Text style={s.rsCountry}>{country(toC)}</Text> : null}
        </View>
      </View>
    </View>
  );
}

/**
 * Yuk e'loni kartasi — lenta, bosh sahifa, moslar.
 *
 * ── DIZAYN-3 (2026-09-21, Bekzod: «bu karta yoqmayapti») ─────────
 *
 * Ierarxiya: yo'nalish → narx → yuk → xususiyatlar. Ilgari
 * ko'zga birinchi tashlanadigani har kartadagi yashil «YANGI» va
 * pastdagi katta to'q sariq yozuv edi — narx YO'Q bo'lsa ham
 * («Kelishiladi» o'sha o'lchamda chizilardi).
 *
 *   · «Kelishiladi» — narx emas, holat: kulrang, kichik;
 *   · «YANGI» — faqat oxirgi 3 soatda joylangan e'londa (ilgari
 *     3 haftalik e'londa ham chiqardi, ya'ni hech narsa demasdi);
 *     alohida chip emas — vaqt yonida yashil nuqta;
 *   · mashina turi ikonkasi olib tashlandi: «Boshqa» turida u «?»
 *     bo'lib chiqar va tugmaga o'xshardi. Tur nomi pastdagi chipda.
 */
export function ListingCard({
  item,
  onPress,
  index,
}: {
  item: Listing;
  onPress?: () => void;
  /* Lentadagi o'rin — kartochka ketma-ket paydo bo'lishi uchun.
     Berilmasa animatsiya yo'q: kartochka boshqa joylarda ham
     ishlatiladi (qidiruv natijasi, saqlanganlar) va u yerda
     harakat ortiqcha. */
  index?: number;
}) {
  const reduce = useReduceMotion();
  const enter = useFadeUp(index != null ? stagger(index) : 0, reduce || index == null);
  const price = money(item.price, item.currency, item.isNegotiable);
  const yangi = !!item.createdAt && Date.now() - new Date(item.createdAt).getTime() < YANGI_MS;
  const nom = elonNomi(item.title, item.source === "TELEGRAM");

  return (
    /* Bosishda KICHRAYADI (`motion.ts`): kartochka katta, shuning
       uchun chuqurlik kichik — 0.985. Kuchli kichrayish katta
       yuzada «sakrash» bo'lib ko'rinadi. */
    <Animated.View style={enter}>
      <Tap
        onPress={onPress}
        scale={0.985}
        style={({ pressed }: { pressed: boolean }) => [
          s.card,
          item.isTop && s.cardTop,
          pressed && s.pressed,
        ]}
      >
        <View style={s.lTop}>
          <RouteStack from={item.from} fromC={item.fromCountry} to={item.to} toC={item.toCountry} />

          <View style={s.lSide}>
            {item.isTop ? <Chip text="TOP" tone="brand" /> : null}
            {price ? (
              <Text style={s.lPrice} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                {price}
              </Text>
            ) : (
              <Text style={s.lNego}>{t("mob.loads.negotiable")}</Text>
            )}
            {/* Kerakli mashina turi — web'dagi brendli rasm, KATTA
                (Bekzod: «mashinalar rasmini kattaroq qilib ko'rsat») */}
            {item.vehicleTypeKey ? <TruckImage typeKey={item.vehicleTypeKey} style={s.lTruck} /> : null}
            {item.createdAt ? (
              <View style={s.lWhen}>
                {yangi ? <View style={s.lFresh} /> : null}
                <Text style={[s.meta, yangi && { color: color.successText }]}>{ago(item.createdAt)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {nom ? (
          <View style={s.lCargo}>
            <Icon name="package" size={15} stroke={color.mutedForeground} />
            <Text style={s.lCargoText} numberOfLines={2}>
              {nom}
            </Text>
          </View>
        ) : null}

        <View style={s.lFoot}>
          <View style={s.lSpecs}>
            {item.weightT != null ? <Chip text={`${item.weightT} t`} /> : null}
            {item.vehicleType ? <Chip text={item.vehicleType} /> : null}
            {item.isReadyNow ? <Chip text={t("mob.loads.readyNow")} tone="success" /> : null}
            <LinkOnly item={item} />
          </View>
          <Korishlar n={item.views} />
          <SaqlashBelgi tur="load" id={item.id} boshida={item.saved} />
        </View>
      </Tap>
    </Animated.View>
  );
}

/* ─────────────────────────────────────────────── 🔖 va 👁 */

/**
 * 🔖 — e'lonni saqlash (2026-09-21). Ilgari o'rnida BEZAK yurak turardi:
 * bosilsa karta ochilardi, hech narsa saqlanmasdi. Endi o'zi alohida
 * tugma — karta ochilmaydi, belgi brend rangida to'ladi va tepada
 * «Saqlandi · Ko'rish» chiqadi (`lib/saqlangan.ts`).
 *
 * YURAK EMAS, SAQLASH BELGISI — Bekzod: «yurakcha emas, saqlashning
 * o'z ikonkasi bor, shuni qo'y — userlar adashmaydi». Yurak «yoqdi»
 * deb o'qiladi. Shakl va rang web'dagi `SaveButton` bilan bir xil.
 */
function SaqlashBelgi({ tur, id, boshida }: { tur: SaqlashTuri; id: string; boshida?: boolean }) {
  const on = useSaqlangan(tur, id, boshida);
  const reduce = useReduceMotion();
  const [k] = useState(() => new Animated.Value(1));

  const bos = () => {
    if (guestBlocked()) return;
    /* Saqlanganda bir «sakraydi» — bosilgani barmoq ostida ham sezilsin */
    if (!on && !reduce) {
      k.setValue(0.6);
      Animated.spring(k, { toValue: 1, useNativeDriver: true, damping: 7, stiffness: 300, mass: 0.6 }).start();
    }
    void saqlashniAlmashtir(tur, id, on);
  };

  return (
    <Pressable
      onPress={bos}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={on ? t("mob.saved.unsave") : t("mob.common.save")}
      accessibilityState={{ selected: on }}
      style={s.yurak}
    >
      <Animated.View style={{ transform: [{ scale: k }] }}>
        <Icon name="bookmark" size={21} stroke={on ? color.brand : color.iconFaint} fill={on ? color.brand : "none"} />
      </Animated.View>
    </Pressable>
  );
}

/** 👁 12 — e'lon necha marta ochilgan. Server bermasa (eski javob) — chizilmaydi */
function Korishlar({ n }: { n?: number | null }) {
  if (n == null) return null;
  return (
    <View style={s.korish} accessible accessibilityLabel={t("mob.trucks.viewed", { n })}>
      <Icon name="eye" size={15} stroke={color.faintText} />
      <Text style={s.korishSon}>{n}</Text>
    </View>
  );
}

/* ─────────────────────────────────────────────── mashina kartasi */

export type TruckItem = Listing & {
  /**
   * Tur nomi — mashina lentasida SHU nom bilan keladi (`vehicleType`
   * emas): `/api/trucks/list` lenta qatorini o'zgartirmasdan yoyadi.
   * Ilgari karta faqat `vehicleType` ni o'qirdi va tur nomi hech
   * qachon chiqmasdi — sig'imi yo'q e'londa sarlavha «—» edi
   * (2026-09-21, emulyatorda ko'rindi).
   */
  vehicleTypeName?: string | null;
  volumeM3?: number | null;
  isFreeNow?: boolean;
  statusKey?: string | null;
  statusLabel?: string | null;
  isExtra?: boolean;
  source?: "USER" | "TELEGRAM";
  /** Parkdagi mashinadan — bo'lishi shart emas */
  photo?: string | null;
  vehicleId?: string | null;
  brandModel?: string | null;
  isMine?: boolean;
};

/**
 * Mashina kartasi — yuk kartasidan ATAYLAB boshqacha.
 *
 * BOSH RAQAM NARX EMAS, SIG'IM. Yuk egasi «bu mashinaga yukim
 * sig'adimi?» deb qaraydi; narx keyin keladi va ko'pincha kelishiladi.
 *
 * SURAT KARTANING YARMINI EGALLAYDI. Mashina ko'rib tanlanadi:
 * tenti butunmi, refrijerator eskimi — suratdan bilinadi. Surat yo'q
 * bo'lsa (Telegram'dan yig'ilgan e'lonlar — ro'yxatning yarmi) bo'sh
 * joy qoldirilmaydi, transport turi belgisi qo'yiladi.
 */
export function TruckCard({
  item,
  onPress,
  index,
}: {
  item: TruckItem;
  onPress?: () => void;
  /** Lentadagi o'rin — izohi `ListingCard` da */
  index?: number;
}) {
  const reduce = useReduceMotion();
  const enter = useFadeUp(index != null ? stagger(index) : 0, reduce || index == null);
  const price = money(item.price, item.currency, item.isNegotiable);
  const tg = item.source === "TELEGRAM";
  const turi = item.vehicleType ?? item.vehicleTypeName ?? null;

  return (
    <Animated.View style={enter}>
      <Tap
        scale={0.985}
        onPress={onPress}
        style={({ pressed }: { pressed: boolean }) => [
        s.card,
        item.isTop && s.cardTop,
        item.isMine && s.cardMine,
        pressed && s.pressed,
      ]}
    >
      <View style={s.cardHead}>
        {item.isMine ? (
          <Chip text={t("mob.listing.mine")} tone="info" />
        ) : item.isTop ? (
          <Chip text="TOP" tone="brand" />
        ) : tg ? (
          <Chip text="TELEGRAM" />
        ) : (
          <Chip text={t("mob.listing.new")} tone="success" />
        )}
        <LinkOnly item={item} />
        <View style={{ flex: 1 }} />
        <Korishlar n={item.views} />
        <SaqlashBelgi tur="truck" id={item.id} boshida={item.saved} />
      </View>

      <View style={s.tRow}>
        {/* Haqiqiy surat (parkdagi mashinadan) — bo'lsa o'sha. Bo'lmasa
            (Telegram e'lonlari — ro'yxatning yarmi) ilgari bo'sh kulrang
            quti va chiziqli ikonka turardi; endi web'dagi brendli rasm */}
        {item.photo && item.vehicleId ? (
          <Image source={vehiclePhoto(item.vehicleId, item.photo)} style={s.tShot} resizeMode="cover" />
        ) : (
          <View style={[s.tShot, s.tShotType]}>
            <TruckImage typeKey={item.vehicleTypeKey} style={s.tTypeImg} />
          </View>
        )}

        <View style={s.tBody}>
          {/* SIG'IM BO'LMASA — TUR NOMI (2026-09-21). Telegram e'lonlarining
              ko'pida tonna yozilmaydi va sarlavha o'rnida yolg'iz katta «—»
              turardi: rasm yonida bo'sh, buzilgan kartadek ko'rinardi */}
          <View style={s.tCap}>
            <Text style={s.tCapNum} numberOfLines={1}>
              {item.weightT != null ? `${item.weightT} t` : turi ?? "—"}
            </Text>
            {item.volumeM3 != null ? (
              <Text style={s.tCapSub}>{` · ${item.volumeM3} m³`}</Text>
            ) : null}
          </View>
          {/* IKKI QATORGACHA (2026-09-20, 320 px): «Toshkent (poytaxt)
              → Samarqand» tor ekranda bitta qatorga sig'masdi */}
          <Text style={s.tRoute} numberOfLines={2}>
            {item.from} → {item.to}
          </Text>
          <Text style={s.tSub} numberOfLines={1}>
            {[item.brandModel, item.weightT != null ? turi : null].filter(Boolean).join(" · ")}
          </Text>
        </View>
      </View>

      <View style={s.chips}>
        {item.statusKey === "freeNow" ? (
          <Chip text={t("mob.trucks.freeNow")} tone="success" />
        ) : item.statusLabel ? (
          <Chip text={t("mob.trucks.freeFrom", { d: item.statusLabel })} />
        ) : null}
        {item.isExtra ? <Chip text={t("mob.trucks.takesExtra")} /> : null}
      </View>

      <View style={s.cardFoot}>
        {price ? <Text style={s.price}>{price}</Text> : <Text style={s.lNego}>{t("mob.trucks.noPrice")}</Text>}
        {item.createdAt ? <Text style={s.meta}>{ago(item.createdAt)}</Text> : null}
      </View>
          </Tap>
    </Animated.View>
  );
}

/* ─────────────────────────────────────────────── reys kartasi */

export type TripItem = {
  id: string; no: number; status: string;
  /* ⚠️ `statusLabel` ATAYLAB YO'Q. Server uni o'zbekcha yasaydi va
     `Accept-Language: ru` bilan ham «Yo'lda» qaytaradi — ya'ni rus
     tilidagi telefonda o'zbekcha chiqardi (2026-09-05 da topildi).
     Holat `status` kalitidan `tripStatus.*` lug'ati bilan
     chiziladi. */
  stepIndex: number; stepTotal: number;
  from: string; fromCountry?: string | null;
  to: string; toCountry?: string | null;
  cargo?: string | null;
  plate?: string | null; driver?: string | null;
  remainingKm?: number | null; etaAt?: string | null; placeName?: string | null;
  /** Yo'lda (boshlangan) — SOS faqat shunda (`/api/home`) */
  isLive?: boolean;
};

export function TripCard({
  item,
  onPress,
  index,
}: {
  item: TripItem;
  onPress?: () => void;
  /** Lentadagi o'rin — izohi `ListingCard` da */
  index?: number;
}) {
  const reduce = useReduceMotion();
  const enter = useFadeUp(index != null ? stagger(index) : 0, reduce || index == null);
  const tone = toneFor(item.status);
  const eta = item.etaAt ? new Date(item.etaAt) : null;

  return (
    <Animated.View style={enter}>
      <Tap
        onPress={onPress}
        scale={0.985}
        style={({ pressed }: { pressed: boolean }) => [s.card, pressed && s.pressed]}
      >
      <View style={s.cardHead}>
        <StatusChip label={tOr(`tripStatus.${item.status}`, item.status)} tone={tone} />
        <Text style={s.no}>#TR-{item.no}</Text>
      </View>

      <View style={{ marginTop: 12 }}>
        <Route from={item.from} fromC={item.fromCountry} to={item.to} toC={item.toCountry} />
      </View>

      {/* Bosqich chizig'i — kartochkaning belgisi */}
      <View style={s.track}>
        {Array.from({ length: item.stepTotal }, (_, i) => (
          <View
            key={i}
            style={[
              s.trackStep,
              { backgroundColor: i <= item.stepIndex ? (tone === "warning" ? color.warning : color.brand) : color.border },
            ]}
          />
        ))}
      </View>

      {item.remainingKm != null || eta ? (
        <View style={s.figures}>
          {item.remainingKm != null ? (
            <View style={s.figure}>
              <Text style={s.figureNum}>{item.remainingKm}</Text>
              <Text style={s.figureLabel}>{t("mob.trip.kmLeft")}</Text>
            </View>
          ) : null}
          {eta ? (
            <View style={s.figure}>
              <Text style={s.figureNum}>
                {String(eta.getHours()).padStart(2, "0")}:{String(eta.getMinutes()).padStart(2, "0")}
              </Text>
              <Text style={s.figureLabel}>{t("mob.trip.arrives")}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {item.plate || item.driver ? (
        <View style={s.owner}>
          <View style={s.ownerIcon}>
            <Icon name="truck" size={16} />
          </View>
          <View style={{ flex: 1 }}>
            {item.plate ? <Text style={s.ownerName}>{item.plate}</Text> : null}
            {item.driver ? <Text style={s.meta}>{item.driver}</Text> : null}
          </View>
        </View>
      ) : null}
      </Tap>
    </Animated.View>
  );
}

const s = themed(() => ({
  card: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.lg,
    ...shadow.card,
  },
  cardTop: { borderLeftWidth: 3, borderLeftColor: color.brand },
  cardMine: { borderColor: color.info + "59", backgroundColor: color.info + "08" },

  tRow: { flexDirection: "row", gap: 12, marginTop: 11 },
  /* Keng quti: mashina rasmlari 2:1 — 4.5:1 nisbatda, kvadrat ichida
     (72×72) fura 16 px balandlikda chiqardi */
  tShot: { width: 118, height: 76, borderRadius: 14, backgroundColor: color.iconFaint },
  tShotType: { backgroundColor: color.muted, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  tTypeImg: { width: "100%", height: 58 },
  tShotEmpty: {
    backgroundColor: color.muted,
    borderWidth: 1,
    borderColor: color.iconFaint,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  tBody: { flex: 1, minWidth: 0 },
  tCap: { flexDirection: "row", alignItems: "baseline" },
  tCapNum: { fontSize: 24, fontWeight: "700", color: color.foreground, letterSpacing: -0.5 },
  tCapSub: { fontSize: 13, color: color.mutedForeground },
  tRoute: { fontSize: 14, fontWeight: "600", color: color.foreground, marginTop: 4 },
  tSub: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },
  noPrice: { fontSize: font.body, fontWeight: "600", color: color.mutedForeground },
  /* ⚠️ Token (2026-09-21): ilgari `#fafbfc` edi — qorong'i rejimda
     bosilgan karta deyarli OQ bo'lib yonib ketardi */
  pressed: { backgroundColor: color.muted },

  /* ── Yuk kartasi (dizayn-3) ── */
  lTop: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  lSide: { alignItems: "flex-end", gap: 6, maxWidth: "46%", paddingTop: 1 },
  lPrice: { fontSize: 19, fontWeight: "800", color: color.brand, letterSpacing: -0.4 },
  lNego: {
    fontSize: 12.5, fontWeight: "600", color: color.mutedForeground,
    backgroundColor: color.muted, paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: radius.control, overflow: "hidden",
  },
  lWhen: { flexDirection: "row", alignItems: "center", gap: 5 },
  lTruck: { width: 108, height: 36 },
  lFresh: { width: 7, height: 7, borderRadius: 4, backgroundColor: color.success },
  lCargo: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    marginTop: space.md, paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border,
  },
  lCargoText: { flex: 1, fontSize: 14, lineHeight: 19, color: color.foreground, marginTop: -1 },
  lFoot: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.md },
  /* 32 px quti + 12 px `hitSlop` = 56 px bosish joyi; o'ng chekka
     karta matni bilan bir chiziqda qolsin deb −6 */
  yurak: { width: 32, height: 32, alignItems: "center", justifyContent: "center", marginRight: -6 },
  korish: { flexDirection: "row", alignItems: "center", gap: 4 },
  korishSon: { fontSize: 12.5, fontWeight: "600", color: color.faintText, fontVariant: ["tabular-nums"] },
  lSpecs: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6 },

  /* Tik yo'nalish: nuqta markazi nom birinchi qatorining o'rtasida */
  rs: { flex: 1, minWidth: 0 },
  rsRow: { flexDirection: "row", gap: 10, paddingBottom: 10 },
  rsRail: { width: 12, alignItems: "center" },
  rsDotFrom: {
    width: 11, height: 11, borderRadius: 6, marginTop: 5,
    borderWidth: 2.5, borderColor: color.brand, backgroundColor: color.card,
  },
  rsDotTo: { width: 11, height: 11, borderRadius: 6, backgroundColor: color.brand },
  rsLine: { flex: 1, width: 2, marginTop: 3, marginBottom: -10, borderRadius: 1, backgroundColor: color.border },
  rsLineTop: { height: 5, width: 2, backgroundColor: color.border },
  rsText: { flex: 1, minWidth: 0 },
  rsCity: { fontSize: 16.5, lineHeight: 21, fontWeight: "800", color: color.foreground, letterSpacing: -0.3 },
  rsCountry: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },
  /* `gap` — «havola» belgisi chip bilan yopishib qolmasin; belgi
     chizilmasa gap ham joy egallamaydi */
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },

  route: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  arrow: { width: 26, height: 26, borderRadius: 13, backgroundColor: color.brandSoft, alignItems: "center", justifyContent: "center", marginTop: 1 },
  typeIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: color.muted, alignItems: "center", justifyContent: "center", marginRight: 10 },
  city: { fontWeight: "800", color: color.foreground, letterSpacing: -0.3 },
  country: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },

  cargo: { fontSize: 14, color: color.icon, marginTop: 10 },

  chips: { flexDirection: "row", gap: 6, marginTop: 11, flexWrap: "wrap" },
  chip: { height: 26, paddingHorizontal: 10, borderRadius: radius.control, alignItems: "center", justifyContent: "center" },
  chipText: { fontSize: 12, fontWeight: "500" },

  cardFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 13 },
  price: { fontSize: 21, fontWeight: "800", color: color.brand, letterSpacing: -0.4 },
  meta: { fontSize: 12, color: color.mutedForeground },
  no: { fontSize: 12, color: color.mutedForeground, fontFamily: "monospace" },

  track: { flexDirection: "row", gap: 3, marginTop: 14 },
  trackStep: { flex: 1, height: 4, borderRadius: 2 },

  figures: { flexDirection: "row", gap: 18, marginTop: 12 },
  figure: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  figureNum: { fontSize: 20, fontWeight: "700", color: color.foreground },
  figureLabel: { fontSize: 12, color: color.mutedForeground },

  owner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: color.border,
  },
  ownerIcon: { width: 28, height: 28, borderRadius: radius.control, backgroundColor: color.muted, alignItems: "center", justifyContent: "center" },
  ownerName: { fontSize: 13, fontWeight: "600", color: color.foreground },
}));
