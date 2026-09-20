/**
 * C2 — filtrlar.
 *
 * Manzil va transport turi serverdan olinadi (`/api/locations`,
 * `/api/vehicle-types`): 8 davlat, minglab hudud — ro'yxatni ilovaga
 * yozib qo'yib bo'lmaydi va u eskiradi.
 *
 * ── BIR NECHTA HUDUD (TZ 5, ilovada 2026-09-19) ─────────────────
 *
 * Webda «qayerdan/qayerga» ga bir necha hudud tanlanadi: «Namangan,
 * Farg'ona va Andijondagi yuklar» — yonma-yon viloyatlar uchun tabiiy
 * so'rov. Ilovada bittasi tanlanardi. Endi lenta filtrida tanlagich
 * galochka bilan ishlaydi va OCHIQ qoladi; e'lon berish oynalarida esa
 * avvalgidek bitta (yuk bitta joydan ketadi).
 */
import { useMemo, useState } from "react";
import {
  Animated,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { Text } from "@/components/Text";
import { SheetBackdrop, useSheetDrag } from "@/components/sheet-kit";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "./Icon";
import { TruckIcon } from "./TruckIcon";
import { Button } from "./ui";
import { ErrorBox } from "./state";
import { useApi } from "@/lib/use-api";
import { isoBayroq } from "@/lib/phone-codes";
import { color, font, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

/**
 * Tanlangan joy. `countryCode` — bayroq uchun: saqlangan qidiruvdan
 * kelganda bo'lmasligi mumkin (u yerda faqat nom bor).
 */
export type Joy = { id: number; name: string; countryCode?: string };

export type Filtr = {
  from: Joy[];
  to: Joy[];
  vehicleTypeIds: number[];
  vehicleNames: string[];
  readyNow: boolean;
};

export const EMPTY_FILTR: Filtr = {
  from: [], to: [], vehicleTypeIds: [], vehicleNames: [], readyNow: false,
};

/** Serverdagi `parseFilters` kutgan ko'rinishga o'giradi (`fromId=3,7,9`) */
export function filtrToQuery(f: Filtr): string {
  const q = new URLSearchParams();
  if (f.from.length) q.set("fromId", f.from.map((j) => j.id).join(","));
  if (f.to.length) q.set("toId", f.to.map((j) => j.id).join(","));
  if (f.vehicleTypeIds.length) q.set("vehicleTypeId", f.vehicleTypeIds.join(","));
  if (f.readyNow) q.set("readyNow", "1");
  return q.toString();
}

/**
 * Tanlangan joylar — «Toshkent +2» (webdagi tanlagich tugmasidek): nom
 * qisqaradi, «+2» esa DOIM ko'rinadi.
 * Bitta satrda («Toshkent (poytaxt) +1») uzun nom qisqarganda «+1» ham
 * kesilib ketardi — odam ikkinchi hudud tanlanganini bilmay qolardi.
 */
export function JoylarYozuvi({
  joylar,
  bosh,
  matnStyle,
}: {
  joylar: readonly Joy[];
  /** Hech narsa tanlanmaganda */
  bosh: string;
  /** ⚠️ `flex` SIZ: bu yerda matn o'z kengligida turib qisqaradi. `flex: 1`
      (yoki `flex: 0` bilan bosish) web'da matnni nol kenglikka tushirardi */
  matnStyle: StyleProp<TextStyle>;
}) {
  return (
    <View style={s.yozuv}>
      <Text style={[matnStyle, s.yozuvMatn]} numberOfLines={1}>
        {joylar[0]?.name ?? bosh}
      </Text>
      {joylar.length > 1 ? <Text style={s.yozuvKop}>+{joylar.length - 1}</Text> : null}
    </View>
  );
}

/** Sarlavha ostidagi olib tashlanadigan chiplar */
export function filtrChips(f: Filtr): { key: keyof Filtr; label: string }[] {
  const out: { key: keyof Filtr; label: string }[] = [];
  if (f.vehicleTypeIds.length) out.push({ key: "vehicleTypeIds", label: f.vehicleNames.join(", ") });
  if (f.readyNow) out.push({ key: "readyNow", label: t("mob.loads.readyNow") });
  return out;
}

type VehicleType = { id: number; key: string; name: string; capacityT: number | null };
/* `name` — server SO'ROV TILIDA qaytaradi (`localName`). Variantlar
   qidiruv uchun qoladi: odam «Ташкент» deb ham, «Toshkent» deb ham
   yozishi mumkin. */
export type Loc = {
  id: number;
  name: string;
  /** Shu hududdagi e'lon soni — faqat sanoq so'ralganda keladi */
  count?: number;
  nameUz: string;
  nameRu: string | null;
  countryCode: string;
  type?: "COUNTRY" | "REGION" | "CITY";
  /** Viloyat/respublika/poytaxtmi — ro'yxatni guruhlash uchun (server aytadi) */
  yirik?: boolean;
};

export function FiltrSheet({
  open, value, onClose, onApply, total, kind,
}: {
  open: boolean;
  value: Filtr;
  onClose: () => void;
  onApply: (f: Filtr) => void;
  total?: number;
  /** Qaysi lenta — hudud yonidagi E'LON SONI shunga qarab olinadi */
  kind: "load" | "truck";
}) {
  const [draft, setDraft] = useState<Filtr>(value);
  /* Yopishning uchta yo'li: surish, ✕ (sarlavhada), parda */
  const drag = useSheetDrag(onClose);
  const [picking, setPicking] = useState<null | "from" | "to">(null);
  const insets = useSafeAreaInsets();

  const types = useApi<{ items: VehicleType[] }>(open ? "/api/vehicle-types" : null);

  // Ochilganda joriy holatdan boshlaymiz
  const [seen, setSeen] = useState(false);
  if (open && !seen) {
    setSeen(true);
    setDraft(value);
  }
  if (!open && seen) setSeen(false);

  const toggleType = (t: VehicleType) =>
    setDraft((d) => {
      const on = d.vehicleTypeIds.includes(t.id);
      return {
        ...d,
        vehicleTypeIds: on ? d.vehicleTypeIds.filter((x) => x !== t.id) : [...d.vehicleTypeIds, t.id],
        vehicleNames: on ? d.vehicleNames.filter((x) => x !== t.name) : [...d.vehicleNames, t.name],
      };
    });

  /* «N ta natijani ko'rsatish» faqat filtr O'ZGARMAGAN bo'lsa: `total` —
     hozirgi lentaniki, tanlov esa hali qo'llanmagan. Ilgari «Toshkent»
     tanlangandan keyin ham «9 ta natija» turardi, lenta esa 3 ta berardi */
  const ozgardi = filtrToQuery(draft) !== filtrToQuery(value);

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <SheetBackdrop onPress={onClose} />
        <Animated.View style={[s.sheet, drag.style]} {...drag.panHandlers}>
          <View style={s.grabber} />

          <View style={s.head}>
            <Text style={s.title}>{t("mob.loads.filters")}</Text>
            <Pressable onPress={() => setDraft(EMPTY_FILTR)} hitSlop={8}>
              <Text style={s.link}>{t("mob.loads.clear")}</Text>
            </Pressable>
            <Pressable onPress={onClose} hitSlop={8} style={{ marginLeft: space.lg }}>
              <Icon name="close" size={22} stroke={color.foreground} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={s.body}
            showsVerticalScrollIndicator={false}
            /* Ro'yxat tepasida turganda surish varaqni yopadi,
               aks holda aylantiradi (`useSheetDrag`) */
            onScroll={drag.onScroll}
            scrollEventThrottle={16}
          >
            {/* Yo'nalish */}
            <View style={s.sectionHead}>
              <Text style={s.label}>{t("mob.loads.route")}</Text>
              {/* Almashtirish RO'YXATLARNI almashtiradi (webdagidek):
                  «Namangan, Farg'ona → Moskva» bir bosishda
                  «Moskva → Namangan, Farg'ona» bo'ladi */}
              {draft.from.length || draft.to.length ? (
                <Pressable
                  onPress={() => setDraft((d) => ({ ...d, from: d.to, to: d.from }))}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t("feed.swap")}
                  style={({ pressed }) => [s.swap, pressed && { opacity: 0.6 }]}
                >
                  <Icon name="swap" size={16} stroke={color.brand} />
                </Pressable>
              ) : null}
            </View>
            <View style={{ gap: 8 }}>
              <Pressable style={s.row} onPress={() => setPicking("from")}>
                <View style={s.dotOutline} />
                <JoylarYozuvi
                  joylar={draft.from}
                  bosh={t("mob.loads.from")}
                  matnStyle={[s.rowJoy, !draft.from.length && s.rowPlaceholder]}
                />
                <Icon name="chevron" size={16} stroke="#94a3b8" />
              </Pressable>
              <Pressable style={s.row} onPress={() => setPicking("to")}>
                <View style={s.dotFilled} />
                <JoylarYozuvi
                  joylar={draft.to}
                  bosh={t("mob.loads.to")}
                  matnStyle={[s.rowJoy, !draft.to.length && s.rowPlaceholder]}
                />
                <Icon name="chevron" size={16} stroke="#94a3b8" />
              </Pressable>
            </View>

            {/* Transport turi */}
            <View style={s.section}>
              <View style={s.sectionHead}>
                <Text style={s.label}>{t("mob.loads.vehicleType")}</Text>
                {draft.vehicleTypeIds.length > 0 ? (
                  <Text style={s.hint}>{t("mob.loads.picked", { n: draft.vehicleTypeIds.length })}</Text>
                ) : null}
              </View>
              <View style={s.grid}>
                {(types.data?.items ?? []).map((t) => {
                  const on = draft.vehicleTypeIds.includes(t.id);
                  return (
                    <Pressable key={t.id} onPress={() => toggleType(t)} style={[s.type, on && s.typeOn]}>
                      <TruckIcon type={t.key} size={34} color={on ? color.brand : color.mutedForeground} />
                      <Text style={[s.typeText, on && s.typeTextOn]} numberOfLines={2}>
                        {t.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Kalit */}
            <View style={s.section}>
              <Pressable style={s.switchRow} onPress={() => setDraft((d) => ({ ...d, readyNow: !d.readyNow }))}>
                <Text style={s.switchLabel}>{t("mob.loads.readyOnly")}</Text>
                <View style={[s.switch, draft.readyNow && s.switchOn]}>
                  <View style={[s.knob, draft.readyNow && s.knobOn]} />
                </View>
              </Pressable>
            </View>
          </ScrollView>

          <View style={[s.foot, { paddingBottom: insets.bottom + space.lg }]}>
            <Button
              title={
                total != null && !ozgardi ? t("mob.loads.showResults", { n: total }) : t("mob.loads.apply")
              }
              onPress={() => onApply(draft)}
            />
          </View>
        </Animated.View>
      </View>

      <LocationPicker
        open={picking !== null}
        title={picking === "to" ? t("mob.loads.to") : t("mob.loads.from")}
        kind={kind}
        side={picking ?? "from"}
        /* Sanoq QOLGAN filtrlarni hisobga oladi: «Toshkentdan
           Tentga» deb turib «qayerga» ro'yxatini ochganda sonlar
           aynan shu shart bo'yicha chiqishi kerak. Shu tomonning o'z
           tanlovi sanoqqa tegmaydi (server `side` bo'yicha chiqaradi) —
           aks holda tanlangandan boshqa hamma hudud «0» ko'rinardi */
        filter={draft}
        multiple
        values={picking === "to" ? draft.to : draft.from}
        onChange={(v) => setDraft((d) => (picking === "to" ? { ...d, to: v } : { ...d, from: v }))}
        onClose={() => setPicking(null)}
      />
    </Modal>
  );
}

/* ─────────────────────────────────────────────── manzil tanlash */

/**
 * Manzil tanlagich — webdagi (`furam/src/components/location-picker.tsx`)
 * juftligi: avval DAVLATLAR (O'zbekiston birinchi, bayroq va e'lon soni
 * bilan), ichida hududlar — e'loni ko'plari tepada. Qidiruv ikki harfdan:
 * davlat ichida — shu davlat bo'ylab, tashqarida — hammasi bo'ylab.
 *
 * Ilgari ro'yxat bitta edi va qidiruvsiz hududlarni davlat KODI
 * bo'yicha alifboda 200 tagacha berardi: «Afg'oniston, Armaniston,
 * Avstriya…» tepada, O'zbekiston esa (kodi oxirida) umuman ko'rinmasdi.
 * Davlat o'rnida «UZ» degan kod turardi.
 *
 * IKKI REJIM (webdagidek):
 *   • bitta — e'lon berish oynalarida: tanlangach yopiladi (`onPick`);
 *   • ko'p — lenta filtrida: galochka, oyna OCHIQ qoladi (`onChange`).
 */
type PickerProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  /* ── E'LON SONI (2026-09-13) ────────────────────────────────
     Uchalasi ham IXTIYORIY: bu tanlagich e'lon berish oynasida
     ham ishlatiladi, u yerda esa son ma'nosiz — o'sha paytda
     ro'yxat avvalgidek alifbo bo'yicha qoladi. */
  kind?: "load" | "truck";
  side?: "from" | "to";
  filter?: Filtr;
} & (
  | { multiple?: false; onPick: (l: Loc) => void }
  | { multiple: true; values: Joy[]; onChange: (v: Joy[]) => void }
);

/** E'lon berish oynalarida ham ishlatiladi — shuning uchun eksport */
export function LocationPicker(props: PickerProps) {
  const { open, title, onClose, kind, side, filter } = props;
  const [q, setQ] = useState("");
  /* `null` — davlatlar ro'yxati; aks holda shu davlat ichi */
  const [davlat, setDavlat] = useState<Loc | null>(null);
  const insets = useSafeAreaInsets();

  /* Har ochilishda boshidan: davlatlar, bo'sh qidiruv */
  const [seen, setSeen] = useState(false);
  if (open && !seen) {
    setSeen(true);
    setQ("");
    setDavlat(null);
  }
  if (!open && seen) setSeen(false);

  /* So'rov: daraja (davlatlar / davlat ichi / qidiruv) + sanoq + joriy
     filtrlar. Sanoq serverda lentaning O'Z shartidan olinadi, ya'ni
     «Toshkent 49» deb turib lentada 7 ta chiqib qolmaydi.
     Ikki harfdan boshlab qidiradi — serverdagi shart bilan bir xil */
  const qidiruv = q.trim().length >= 2 ? q.trim() : "";
  const sp = new URLSearchParams();
  if (qidiruv) sp.set("q", qidiruv);
  if (davlat) sp.set("country", davlat.countryCode);
  else if (!qidiruv) sp.set("countries", "1");
  if (kind) {
    sp.set("counts", kind);
    sp.set("side", side ?? "from");
    if (filter) {
      const f = filtrToQuery(filter);
      if (f) for (const [k, v] of new URLSearchParams(f)) sp.set(k, v);
    }
  }
  const qs = sp.toString();

  const { data, loading, error, reload } = useApi<{ items: Loc[] }>(open ? `/api/locations?${qs}` : null, [qs, open]);

  const tanlangan = props.multiple ? props.values : [];
  const bormi = (id: number) => tanlangan.some((j) => j.id === id);

  /* Davlat qatori — davlatlar ro'yxatida va umumiy qidiruvda ICHIGA
     kiradi (webdagidek). Davlat ichida esa o'sha davlatning o'zi
     (e'lon faqat davlatga bog'langan: «O'zbekiston → Rossiya»)
     oddiy qator bo'lib tanlanadi */
  const kiradi = (l: Loc) => l.type === "COUNTRY" && !davlat;

  /* VILOYAT VA TUMAN AJRATILADI (2026-09-20 qo'lda sinovi).
     `Location` jadvalida ikkalasi ham `REGION`: «Andijon viloyati»
     bilan «Angor» alifbo bo'yicha aralashib ketardi va qaysi biri
     nima ekani faqat ruscha izohdan bilinardi. Server `yirik`
     bayrog'ini beradi (`/api/locations`), ro'yxat esa ikki guruhga
     bo'linadi. Qidiruvda va davlatlar ro'yxatida guruh yo'q —
     u yerda tartib boshqa mezon bo'yicha. */
  const royxat = useMemo(() => {
    const xom = data?.items ?? [];
    const oddiy = xom.map((j) => ({ bosh: null as string | null, joy: j as Loc | null }));
    if (!davlat || q.trim().length >= 2) return oddiy;
    const yirik = xom.filter((j) => j.yirik !== false);
    const mayda = xom.filter((j) => j.yirik === false);
    if (!yirik.length || !mayda.length) return oddiy;
    return [
      { bosh: t("mob.loc.regions"), joy: null as Loc | null },
      ...yirik.map((j) => ({ bosh: null as string | null, joy: j as Loc | null })),
      { bosh: t("mob.loc.districts"), joy: null as Loc | null },
      ...mayda.map((j) => ({ bosh: null as string | null, joy: j as Loc | null })),
    ];
  }, [data, davlat, q]);

  function bos(l: Loc) {
    if (kiradi(l)) {
      setDavlat(l);
      setQ("");
      return;
    }
    if (!props.multiple) {
      props.onPick(l);
      return;
    }
    props.onChange(
      bormi(l.id)
        ? props.values.filter((j) => j.id !== l.id)
        : [...props.values, { id: l.id, name: l.name, countryCode: l.countryCode }],
    );
  }

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={[s.picker, { paddingTop: insets.top }]}>
        <View style={s.pickerHead}>
          <Pressable onPress={onClose} hitSlop={10} style={s.back}>
            <Icon name="back" size={22} stroke={color.foreground} />
          </Pressable>
          <Text style={s.pickerTitle}>{title}</Text>
        </View>

        <View style={s.searchBox}>
          <Icon name="search" size={19} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t("mob.loads.cityPh")}
            placeholderTextColor="#94a3b8"
            style={s.searchInput}
            autoFocus
          />
        </View>

        {/* Tanlanganlar — bir necha davlat bo'ylab tanlansa ham ko'rinib
            tursin (ro'yxat ikki pog'onali, tanlov esa bitta) */}
        {props.multiple && tanlangan.length ? (
          <View style={s.chosenWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chosenRow}>
              {tanlangan.map((j) => (
                <Pressable
                  key={j.id}
                  onPress={() => props.onChange(tanlangan.filter((x) => x.id !== j.id))}
                  style={s.chosen}
                >
                  <Text style={s.chosenText} numberOfLines={1}>
                    {j.countryCode ? `${isoBayroq(j.countryCode)} ` : ""}
                    {j.name}
                  </Text>
                  <Icon name="close" size={12} stroke={color.brandText} />
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={() => props.onChange([])} hitSlop={8}>
              <Text style={s.link}>{t("mob.loads.clear")}</Text>
            </Pressable>
          </View>
        ) : null}

        <FlatList
          data={royxat}
          keyExtractor={(x) => (x.bosh ? `bosh-${x.bosh}` : String(x.joy!.id))}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            davlat ? (
              <Pressable
                style={s.countryBack}
                onPress={() => {
                  setDavlat(null);
                  setQ("");
                }}
              >
                <Icon name="back" size={17} stroke={color.brand} />
                <Text style={s.countryBackText} numberOfLines={1}>
                  {isoBayroq(davlat.countryCode)} {davlat.name}
                </Text>
              </Pressable>
            ) : null
          }
          renderItem={({ item: qator }) => {
            if (qator.bosh) return <Text style={s.guruh}>{qator.bosh}</Text>;
            const item = qator.joy!;
            const on = bormi(item.id);
            return (
              <Pressable style={[s.locRow, on && s.locRowOn]} onPress={() => bos(item)}>
                {props.multiple && !kiradi(item) ? (
                  <View style={[s.check, on && s.checkOn]}>
                    {on ? <Icon name="check" size={13} stroke="#fff" /> : null}
                  </View>
                ) : null}
                <Text style={s.flag}>{isoBayroq(item.countryCode)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.locName}>{item.name}</Text>
                  {item.nameRu && item.nameRu !== item.name ? (
                    <Text style={s.locSub}>{item.nameRu}</Text>
                  ) : null}
                </View>
                {/* E'lon soni — nol bo'lsa yozilmaydi: «0» foydali
                    ma'lumot emas, faqat ro'yxatni shovqinga to'ldiradi */}
                {item.count ? <Text style={s.locCount}>{item.count}</Text> : null}
                {kiradi(item) ? <Icon name="chevron" size={16} stroke={color.mutedForeground} /> : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            /* Aloqa xatosi «topilmadi» EMAS — odam joy yo'q deb o'ylab qolardi */
            error && !loading ? (
              <View style={{ padding: space.lg }}>
                <ErrorBox message={error} onRetry={reload} />
              </View>
            ) : (
              <Text style={s.locEmpty}>{loading ? t("mob.loads.searching") : t("mob.loads.notFound")}</Text>
            )
          }
        />

        {/* Ko'p rejimda oyna tanlovdan keyin OCHIQ qoladi — yopish shu tugma */}
        {props.multiple ? (
          <View style={[s.pickerFoot, { paddingBottom: insets.bottom + space.md }]}>
            <Button
              title={tanlangan.length ? t("mob.loads.pickDone", { n: tanlangan.length }) : t("feed.allRegions")}
              onPress={onClose}
            />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const s = themed(() => ({
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: color.card, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, maxHeight: "92%" },
  grabber: { width: 38, height: 4, borderRadius: 2, backgroundColor: color.iconFaint, alignSelf: "center" },

  head: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: space.xl,
    paddingTop: space.md, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: color.border,
  },
  title: { flex: 1, fontSize: 20, fontWeight: "700", color: color.foreground },
  link: { fontSize: 14, fontWeight: "600", color: color.brand },

  body: { padding: space.xl, gap: 0 },
  section: { marginTop: space.xl },
  sectionHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  label: { fontSize: font.caption, fontWeight: "600", color: color.foreground, marginBottom: 9 },
  hint: { fontSize: 12, color: color.mutedForeground },
  yozuv: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 5 },
  yozuvMatn: { flexShrink: 1, minWidth: 0 },
  /* Siqilmaydi — qisqaradigani faqat nom */
  yozuvKop: {
    flexShrink: 0,
    fontSize: 11.5, fontWeight: "800", color: color.brandText, backgroundColor: color.brandSoft,
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, overflow: "hidden",
  },
  swap: {
    width: 30, height: 30, borderRadius: 15, marginBottom: 4,
    alignItems: "center", justifyContent: "center", backgroundColor: color.brandSoft,
  },

  row: {
    height: 48, borderWidth: 1, borderColor: color.border, borderRadius: radius.control,
    flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 10,
  },
  rowText: { flex: 1, fontSize: font.body, fontWeight: "500", color: color.foreground },
  rowJoy: { fontSize: font.body, fontWeight: "500", color: color.foreground },
  rowPlaceholder: { fontWeight: "400", color: "#94a3b8" },
  dotOutline: { width: 9, height: 9, borderRadius: 5, borderWidth: 2.5, borderColor: color.foreground },
  dotFilled: { width: 9, height: 9, borderRadius: 5, backgroundColor: color.brand },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  type: {
    width: "22.6%", flexGrow: 1, borderWidth: 1, borderColor: color.border,
    borderRadius: radius.control, paddingVertical: 10, paddingHorizontal: 2,
    minHeight: 78, alignItems: "center", justifyContent: "center", gap: 6,
  },
  typeOn: { borderWidth: 2, borderColor: color.brand, backgroundColor: "#f45a180f" },
  typeText: { fontSize: 10, fontWeight: "500", color: color.icon, textAlign: "center", lineHeight: 13 },
  typeTextOn: { fontWeight: "700", color: color.brandText },

  switchRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  switchLabel: { flex: 1, fontSize: 14, color: color.foreground },
  switch: { width: 46, height: 27, borderRadius: 14, backgroundColor: color.border, padding: 3 },
  switchOn: { backgroundColor: color.brand },
  knob: { width: 21, height: 21, borderRadius: 11, backgroundColor: "#fff" },
  knobOn: { alignSelf: "flex-end" },

  foot: { paddingHorizontal: space.xl, paddingTop: 14, borderTopWidth: 1, borderTopColor: color.border },

  picker: { flex: 1, backgroundColor: color.card },
  pickerHead: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4 },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  pickerTitle: { fontSize: 18, fontWeight: "700", color: color.foreground },
  searchBox: {
    marginHorizontal: space.lg, marginBottom: space.md, height: 52, borderWidth: 1,
    borderColor: color.border, borderRadius: radius.control, flexDirection: "row",
    alignItems: "center", paddingHorizontal: 14, gap: 11,
  },
  searchInput: { flex: 1, fontSize: font.bodyLg, color: color.foreground, padding: 0 },

  chosenWrap: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    paddingLeft: space.lg, paddingRight: space.lg, marginBottom: space.md,
  },
  chosenRow: { gap: 6, alignItems: "center" },
  chosen: {
    flexDirection: "row", alignItems: "center", gap: 5, height: 30, maxWidth: 220,
    paddingLeft: 10, paddingRight: 8, borderRadius: radius.pill, backgroundColor: color.brandSoft,
  },
  chosenText: { flexShrink: 1, fontSize: 12.5, fontWeight: "600", color: color.brandText },

  countryBack: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: space.lg, paddingVertical: 12,
  },
  countryBackText: { flex: 1, fontSize: font.body, fontWeight: "700", color: color.brand },

  locRow: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: space.lg,
    paddingVertical: 14, borderTopWidth: 1, borderTopColor: color.border, gap: space.md,
  },
  locRowOn: { backgroundColor: color.brandSoft },
  check: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: color.border,
    alignItems: "center", justifyContent: "center",
  },
  checkOn: { backgroundColor: color.brand, borderColor: color.brand },
  /* Bayroq — ISO koddan (`isoBayroq`); ilgari shu joyda «UZ» turardi */
  flag: { fontSize: 18, lineHeight: 22 },
  guruh: {
    fontSize: 12,
    fontWeight: "700",
    color: color.mutedForeground,
    letterSpacing: 0.6,
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: 6,
  },
  locName: { fontSize: font.body, fontWeight: "500", color: color.foreground },
  locSub: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },
  /* Son davlat kodidan KUCHLIROQ ko'rinadi: odam ro'yxatni aynan
     shu raqamga qarab varaqlaydi */
  locCount: {
    fontSize: 12.5,
    fontWeight: "800",
    color: color.brandText,
    minWidth: 22,
    textAlign: "right",
  },
  locEmpty: { textAlign: "center", color: color.mutedForeground, marginTop: space.xxl, fontSize: font.caption },
  pickerFoot: { paddingHorizontal: space.lg, paddingTop: space.md, borderTopWidth: 1, borderTopColor: color.border },
}));
