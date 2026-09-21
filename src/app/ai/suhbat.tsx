/**
 * K2 — AI bilan suhbat.
 *
 * Uchta qaror dizayndan:
 *
 *  1. RAQAMLAR JADVALDA. Model «- 01 A 123 AA — 4 200 USD» deb yozsa,
 *     bu telefonda bir uzun satr bo'lib ketadi. Shunday satrlar
 *     guruhini jadval qilib CHIZAMIZ. Diqqat: bu faqat JOYLASHTIRISH —
 *     raqam o'ylab topilmaydi, model nima yozgan bo'lsa o'sha turadi.
 *  2. «MANBA» QATORI MAJBURIY. Server qaysi funksiyalarni chaqirganini
 *     `tools` da qaytaradi. Modelning o'zi manbani yozishiga tashlab
 *     qo'yilmaydi — u ba'zan yozadi, ba'zan yo'q.
 *  3. JAVOBDAN AMALGA. `actions` — bu modelning TAKLIFI, o'zi
 *     bajarilmagan. Tugma bosilganda server bajaradi.
 *
 * ── TZ-09: YORDAMCHI 2.0 (2026-09-19) ───────────────────────────
 *
 * Web bilan bir xil (`furam/src/app/ai/ai-client.tsx`):
 *
 *   📎 rasm/PDF — «bu qanday hujjat?». Surat OpenAI ga ketadi, shuning
 *      uchun HAR SAFAR rozilik varag'i (skaner bilan bir xil qoida).
 *      Javob ostidagi «tasdiqlanmagan» belgisi va «Hujjatlarimga
 *      saqlash» tugmasini KOD qo'yadi, model emas.
 *   📍 joylashuv — yaqin ustaxona, yoqilg'i, oshxona, to'xtash joyi.
 *      Xarita tugmasi faqat RAQAMLARDAN yasaladi: model yozgan matndan
 *      havola chizilmaydi (begona e'lon matni havola tiqishtirmasin).
 *   🎤 ovoz → matn. Shofyor yo'lda yozmaydi, gapiradi.
 *   🔒 tarif yetmasa tugma o'zi «Men kimman?» ga, kerakli rol tanlangan
 *      holda olib boradi. iOS'da «tarif», narx va to'lov so'zlari YO'Q
 *      (Apple 3.1.1) — «bu amal shu rolda ishlaydi» deyiladi.
 *
 * Fayl ham, nuqta ham suhbat tarixiga yozilmaydi — faqat [📎]/[📍]
 * belgisi (server qoidasi, `ai-ilova.ts`).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native";
import * as Location from "expo-location";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Icon, type IconName } from "@/components/Icon";
import { AiReportButton } from "@/components/AiReport";
import { Sheet } from "@/components/Sheet";
import { Button } from "@/components/ui";
import { MicButton, type VoiceFile } from "@/components/Recorder";
import { webToApp } from "@/lib/routes";
import { api, apiUpload, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { pickPhotos, pickScanFile, takePhoto, toUpload, type Photo } from "@/lib/photo";
import { afterSheet } from "@/lib/native-ui";
import { roleLabel, t, tOr } from "@/lib/i18n";
import { color, font, radius, shadow, space, themed } from "@/lib/theme";
import { tariffBlocked } from "@/lib/features";

type Action = {
  id: string;
  kind: string;
  title: string;
  furamNo?: number;
  url?: string;
  /** Tarif yetmadi — tugma «Men kimman?» ni ochadi (TZ-09 §9.4) */
  locked?: string;
  /** Qaysi rol kerak — tugma shu rolni tanlab ochadi */
  rol?: string;
};
type Tool = { name: string; args?: Record<string, unknown> };

/** `furam/src/lib/ai-joy.ts:YaqinJoy` */
type YaqinJoy = {
  tur: string;
  nomi: string;
  km: number;
  manba: "furam" | "osm";
  /** Faqat ochiq joylarda (OSM, chegara) — ustaning nuqtasi berilmaydi */
  lat?: number;
  lng?: number;
  href?: string;
};

type Msg = {
  id: string;
  role: "me" | "ai";
  text: string;
  tools?: Tool[];
  actions?: Action[];
  /** Chegara tugadi — javob emas, ogohlantirish */
  warn?: boolean;
  /** Foydalanuvchi pufagida: nima biriktirgani */
  ilova?: string;
  /** Rasm/PDF o'qildi — natija DALIL EMAS */
  hujjat?: boolean;
  joylar?: YaqinJoy[];
  hudud?: string | null;
  ustalarHref?: string;
};

type Reply = {
  threadId: string;
  answer: string;
  actions?: Action[];
  tools?: Tool[];
  hujjat?: boolean;
  joylar?: YaqinJoy[];
  hudud?: string | null;
  ustalarHref?: string;
};
type Usage = { ask: { hourLeft: number; dayLeft: number } };

/**
 * Funksiya nomi → manba turi.
 *
 * Xom nom («match_trucks_for_my_load») foydalanuvchiga hech nima
 * demaydi va uni sakkiz tilga o'girish ham ma'nosiz. Shuning uchun
 * funksiyalar bir nechta MANBAGA yig'iladi.
 */
const SOURCE: Record<string, string> = {
  analytics: "analytics",
  trip_profit: "analytics",
  monthly_business: "analytics",
  daily_brief: "analytics",
  market_price: "analytics",
  my_trips: "trips",
  trip_state: "trips",
  my_loads: "feed",
  find_loads: "feed",
  find_trucks: "feed",
  match_loads_for_my_truck: "feed",
  match_trucks_for_my_load: "feed",
  /* Bozor qidiruvi (2026-09-05, TZ 12). Ular ham LENTADAN o'qiydi
     (`feed.ts`), shuning uchun mavjud «feed» kaliti — yangi `mob.*`
     kalit qo'shilmaydi. Bularsiz `SOURCE[...] ?? "data"` ishlab,
     manba «Ma'lumot» degan umumiy so'z bo'lib chiqardi: web tomonda
     esa (`ai-source.ts`) «FURAM yuk lentasi» deb yozilgan — ikki
     mijoz bir javob ostida boshqa-boshqa manba ko'rsatardi. */
  market_find_loads: "feed",
  market_find_trucks: "feed",
  market_match: "feed",
  fleet_state: "fleet",
  pick_vehicle: "fleet",
  expiring_documents: "docs",
  money: "money",
  my_contracts: "contracts",
  contract_check: "contracts",
  platform_help: "guide",
  trust_of: "people",
  my_trust: "people",
  pick_driver: "people",
  my_driver_state: "people",
  risks: "people",
  /* Chegara navbati (2026-09-05, TZ 12) — reys manbasiga qo'shiladi.
     Yangi tarjima kaliti kerak emas: mavjud «trips» ishlatiladi. */
  border_queues: "trips",
  /* TZ-09: yuborilgan rasm va lokatsiya (web `ai-source.ts` bilan bir xil ma'no) */
  image_read: "image",
  nearby_places: "places",
};

/* Serverdagi web manzili → ilovadagi ekran: `lib/routes.ts` dagi
   UMUMIY jadval (2026-09-19). Ilgari bu yerda 9 ta yo'lli alohida
   ro'yxat turardi va manzilni SO'ROV QISMI bilan birga qidirardi —
   TZ-09 dan keyin server `/loads?fromId=12` kabi havola yuboradi va
   tugma hech qayerga olib bormay qolardi. */

/** Yaqin joy turi → belgi (web `ai-client.tsx` bilan bir xil) */
const JOY_BELGI: Record<string, string> = {
  ustaxona: "🔧",
  usta: "🧰",
  zapchast: "⚙️",
  yoqilgi: "⛽",
  oshxona: "🍽️",
  mehmonxona: "🛏️",
  toxtash: "🅿️",
  chegara: "🛃",
};

/* Xarita havolasi FAQAT raqamlardan yasaladi — model yozgan matndan
   havola chizilmaydi */
const xarita = (lat: number, lng: number) =>
  `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`;

/** Server qabul qiladigan fayllar (`ai-ilova.ts`: AI_RASM_MIME + PDF) */
const QABUL = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);

/* Apple 3.1.1: iOS'da narx, tarif va to'lovga ishora yo'q */
const IOS = Platform.OS === "ios";

/* AI javobi vositalar zanjiri bilan 15 soniyadan oshadi; lokatsiyada
   tashqi xarita manbasi ham kutiladi (6–15 s, keyin kesh) */
const AI_MS = 60_000;

/**
 * Server xatosini foydalanuvchi tilida ko'rsatish.
 *
 * Server KOD ham, matn ham yuboradi. Kod tanish bo'lsa tarjima
 * ishlatiladi; notanish bo'lsa serverning matni qoladi — ilgari
 * ruscha interfeysda «Soatlik chegara tugadi» chiqardi.
 */
function aiError(e: FuramError): string {
  return tOr(`mob.aiErr.${e.code}`, e.message || t("mob.ai.failed"));
}

let seq = 0;
const nextId = () => `m${++seq}`;

export default function Suhbat() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [thread, setThread] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState<Action | null>(null);
  /* Xabar ohangi: ilgari xato ham yashil «bajarildi» qutisida chiqardi */
  const [toast, setToast] = useState<{ matn: string; ohang: "ok" | "warn" | "info" } | null>(null);
  const ok = (matn: string) => setToast({ matn, ohang: "ok" });
  const ogoh = (matn: string) => setToast({ matn, ohang: "warn" });

  /* Ilovalar — keyingi savol bilan ketadi, keyin tozalanadi */
  const [fayl, setFayl] = useState<Photo | null>(null);
  const [joy, setJoy] = useState<{ lat: number; lng: number } | null>(null);
  const [rozilik, setRozilik] = useState(false);
  const [joyBand, setJoyBand] = useState(false);
  const [ovozBand, setOvozBand] = useState(false);

  const listRef = useRef<FlatList<Msg>>(null);
  const { data: usage, refresh } = useApi<Usage>("/api/ai/usage");

  const send = useCallback(
    async (question: string) => {
      const clean = question.trim();
      /* Savolsiz ham bo'ladi — rasm yoki joylashuv bilan («bu nima?»).
         Ilovasiz esa kamida 2 belgi: server bo'sh savolni rad etadi */
      if (busy || (!fayl && !joy && clean.length < 2)) return;
      /* Savol YOZILGANDAN keyin emas, YUBORISHDAN oldin: matn
         `setText("")` bilan tozalanmasin, odam uni yo'qotmasin. */
      if (tariffBlocked("ai")) return;

      const f = fayl;
      const j = joy;
      const ilova = [f ? `📎 ${f.name}` : "", j ? t("pgAi.locationAdded") : ""].filter(Boolean).join(" · ");
      setText("");
      setFayl(null);
      setJoy(null);
      setMsgs((m) => [...m, { id: nextId(), role: "me", text: clean, ilova: ilova || undefined }]);
      setBusy(true);
      try {
        /* Fayl bo'lsa — forma (nuqta ham shu formada); bo'lmasa JSON
           (`location` bilan yoki usiz) — server ikkalasini o'qiydi */
        const r = f
          ? await apiUpload<Reply>(
              "/api/ai/chat",
              { question: clean, threadId: thread ?? undefined, lat: j?.lat, lng: j?.lng },
              [toUpload(f, "file")],
            )
          : await api<Reply>("/api/ai/chat", {
              method: "POST",
              body: { question: clean, threadId: thread, ...(j ? { location: j } : {}) },
              timeoutMs: AI_MS,
            });
        setThread(r.threadId);
        setMsgs((m) => [
          ...m,
          {
            id: nextId(),
            role: "ai",
            text: r.answer,
            tools: r.tools,
            actions: r.actions,
            hujjat: !!r.hujjat,
            joylar: Array.isArray(r.joylar) ? r.joylar : undefined,
            hudud: r.hudud ?? null,
            ustalarHref: typeof r.ustalarHref === "string" ? r.ustalarHref : undefined,
          },
        ]);
      } catch (e) {
        const err = e as FuramError;
        /* Ilova QAYTARILADI: odam suratni qaytadan tanlab yoki joyini
           qaytadan aniqlab o'tirmasin — bir bosishda qayta yuboradi */
        if (f) setFayl(f);
        if (j) setJoy(j);
        setText((old) => old || clean);
        setMsgs((m) => [...m, { id: nextId(), role: "ai", warn: true, text: aiError(err) }]);
      } finally {
        setBusy(false);
        refresh();
      }
    },
    [busy, fayl, joy, thread, refresh],
  );

  /* Tayyor savol bilan ochilgan bo'lsa — darrov yuboriladi. Odam
     savolni ko'chirib yozib o'tirmaydi. */
  const started = useRef(false);
  useEffect(() => {
    if (q && !started.current) {
      started.current = true;
      void send(q);
    }
  }, [q, send]);

  /** Rozilik varag'idan: surat yoki fayl tanlash */
  async function biriktir(from: "camera" | "gallery" | "file") {
    /* Varaq yopilmaguncha tizim oynasi ochilmaydi (`afterSheet`) —
       aks holda kamera/galereya jimgina «bekor qilindi» qaytarardi */
    const p = await afterSheet(() => setRozilik(false), async () =>
      from === "file" ? await pickScanFile() : ((from === "camera" ? await takePhoto() : await pickPhotos(1))[0] ?? null),
    );
    if (!p) return;
    /* HEIC va boshqalarni server BAD_TYPE bilan qaytarardi — oldindan
       aytamiz, odam javobni kutib o'tirmasin */
    if (!QABUL.has(p.type)) {
      ogoh(t("mob.aiErr.BAD_TYPE"));
      return;
    }
    setFayl(p);
  }

  /** Joylashuv — faqat shu savol uchun, hech qayerda saqlanmaydi */
  async function joyniOl() {
    setJoyBand(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        ogoh(t("mob.msg.locDenied"));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setJoy({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      ogoh(t("mob.msg.locDenied"));
    } finally {
      setJoyBand(false);
    }
  }

  /** Ovoz → matn: yozilgan matn o'chmaydi, yangisi ortidan qo'shiladi */
  async function ovozdan(v: VoiceFile) {
    /* Qoida 5: to'siq OLDINDAN — ovozni o'girish ham `ai` tarifida */
    if (tariffBlocked("ai")) return;
    setOvozBand(true);
    try {
      const r = await apiUpload<{ text?: string }>("/api/ai/voice-text", {}, [
        { field: "file", uri: v.uri, name: v.name, type: v.type },
      ]);
      const matn = (r.text ?? "").trim();
      if (!matn) {
        ogoh(t("pgAi.voiceFailed"));
        return;
      }
      setText((old) => (old.trim() ? `${old.trim()} ${matn}` : matn));
    } catch (e) {
      ogoh(aiError(e as FuramError));
    } finally {
      setOvozBand(false);
    }
  }

  /** Taklifni tasdiqlash yoki rad etish */
  async function decide(a: Action, confirm: boolean) {
    setAsk(null);
    try {
      const r = await api<{ message?: string; goto?: string }>(`/api/ai/actions/${a.id}`, {
        method: "PATCH",
        body: { confirm },
      });
      /* Serverning `message` i o'zbekcha tayyor jumla («Sahifaga
         o'tilmoqda») — ilova sakkiz tilda, shuning uchun o'z matni.
         Sahifa ochishda xabar kerak emas — ekranning o'zi almashadi */
      if (a.kind !== "open_page" || !confirm) ok(confirm ? t("mob.ai.actDone") : t("mob.ai.actRejected"));
      const to = r.goto ? webToApp(r.goto) : null;
      if (to) router.push(to as never);
    } catch (e) {
      ogoh(aiError(e as FuramError));
    }
  }

  /** Tugma bosildi: sahifa ochish — to'g'ridan-to'g'ri, qolgani — tasdiq bilan */
  function onAction(a: Action) {
    /* Sahifani ochish hech narsani o'zgartirmaydi: «tasdiqlaysizmi?»
       oynasi ortiqcha qadam bo'lardi. Mijoz: «bossa o'sha rolga olib
       o'tadi» (TZ-09 §9.4) */
    if (a.kind === "open_page") void decide(a, true);
    else setAsk(a);
  }

  function ochish(href: string) {
    const to = webToApp(href);
    if (to) router.push(to as never);
  }

  const left = usage?.ask.hourLeft ?? null;
  const yuborsaBoladi = !busy && !ovozBand && (text.trim().length >= 2 || !!fayl || !!joy);

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      /* ⚠️ `keyboardVerticalOffset` OLIB TASHLANDI (2026-09-13).
         Bu View ekranning eng tepasidan boshlanadi (`paddingTop`
         uni ICHIDAN suradi, ramkasini emas). Offset berilsa
         klaviatura balandligiga o'sha son QO'SHILIB, yozuv qatori
         klaviaturadan ~50 px yuqorida suzib turardi — Bekzod
         suratda aynan shu bo'shliqni ko'rsatdi.

         Muloqot chatida bu 2026-09-06 da shunday tuzatilgan
         (`suhbat/[id]/index.tsx`), AI chati esa eski holida
         qolgan edi. */
    >
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.back}>
          <Icon name="back" size={22} stroke={color.foreground} />
        </Pressable>
        <View style={s.avatar}>
          <Icon name="sparkle" size={18} stroke={color.brand} />
        </View>
        <View style={s.grow}>
          <Text style={s.title} numberOfLines={1}>
            {t("mob.ai.title")}
          </Text>
          {left !== null ? (
            <Text style={[s.sub, left === 0 ? s.subOver : null]}>
              {left === 0 ? t("mob.ai.limitOver") : t("mob.ai.left", { n: left })}
            </Text>
          ) : null}
        </View>
      </View>

      <FlatList
        /* Klaviatura ochiq turganda tugma BIRINCHI bosishda ishlasin (2026-09-21,
           expo-native-ui: «Keyboard Blindness») — aks holda birinchi bosish
           faqat klaviaturani yopardi */
        keyboardShouldPersistTaps="handled"
        ref={listRef}
        data={msgs}
        keyExtractor={(m) => m.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        /* `scrollToEnd` EMAS: u oxirgi katakning ESKI o'lchamiga tayanadi va
           uzun javob (yaqin joylar ro'yxati) kelganda ro'yxat chala
           surilardi — javobning pastki qismi yozish qatori ostida qolardi
           (brauzerda bosib sinalganda ko'rindi). Yangi balandlik
           to'g'ridan-to'g'ri beriladi, ortig'i chegaraga qisiladi */
        onContentSizeChange={(_, h) => listRef.current?.scrollToOffset({ offset: h, animated: true })}
        ListEmptyComponent={
          <View style={s.hello}>
            <Text style={s.helloText}>{t("mob.ai.helloText")}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Bubble
            msg={item}
            onAction={onAction}
            onOpen={ochish}
            onSaveDocs={() => router.push("/hujjatlarim")}
            onCopy={() => {
              void Clipboard.setStringAsync(item.text);
              ok(t("mob.ai.copied"));
            }}
          />
        )}
        ListFooterComponent={busy ? <Typing /> : null}
      />

      {toast ? (
        <Pressable
          style={[s.toast, toast.ohang === "warn" && s.toastWarn, toast.ohang === "info" && s.toastInfo]}
          onPress={() => setToast(null)}
        >
          {toast.ohang !== "info" ? (
            <Icon
              name={toast.ohang === "warn" ? "alert" : "check"}
              size={15}
              stroke={toast.ohang === "warn" ? color.warning : color.success}
            />
          ) : null}
          <Text
            style={[
              s.toastText,
              toast.ohang === "warn" && { color: color.warning },
              toast.ohang === "info" && { color: color.foreground },
            ]}
          >
            {toast.matn}
          </Text>
        </Pressable>
      ) : null}

      {/* Yozish */}
      <View style={[s.bar, { paddingBottom: insets.bottom + 10 }]}>
        {/* Biriktirilganlar — yuborilguncha shu yerda, ✕ bilan olinadi */}
        {fayl || joy ? (
          <View style={s.chips}>
            {fayl ? (
              <Chip icon="paperclip" label={fayl.name} onRemove={() => setFayl(null)} />
            ) : null}
            {/* Belgisiz: matnning o'zida 📍 bor (`pgAi.locationAdded`) */}
            {joy ? <Chip label={t("pgAi.locationAdded")} onRemove={() => setJoy(null)} /> : null}
          </View>
        ) : null}

        <View style={s.row}>
          <Pressable
            style={s.tool}
            onPress={() => setRozilik(true)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t("pgAi.attach")}
          >
            <Icon name="paperclip" size={19} stroke={fayl ? color.brand : color.icon} />
          </Pressable>
          <Pressable
            style={s.tool}
            onPress={() => void joyniOl()}
            disabled={busy || joyBand}
            accessibilityRole="button"
            accessibilityLabel={t("pgAi.location")}
          >
            {joyBand ? (
              <ActivityIndicator size="small" color={color.brand} />
            ) : (
              <Icon name="map-pin" size={19} stroke={joy ? color.brand : color.icon} />
            )}
          </Pressable>
          <View style={s.field}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={ovozBand ? t("mob.voiceNote.working") : t("mob.ai.askPh")}
              placeholderTextColor={color.faintText}
              style={s.input}
              multiline
              editable={!busy && !ovozBand}
            />
          </View>
          {/* Matn yoki ilova bo'lmasa — mikrofon (chatdagidek) */}
          {text.trim() || fayl || joy || busy ? (
            <Pressable
              style={[s.sendBtn, !yuborsaBoladi ? s.sendOff : null]}
              onPress={() => void send(text)}
              disabled={!yuborsaBoladi}
              accessibilityRole="button"
              accessibilityLabel={t("pgAi.ask")}
            >
              {busy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Icon name="arrow-right" size={19} stroke="#fff" />
              )}
            </Pressable>
          ) : ovozBand ? (
            <View style={[s.sendBtn, s.sendOff]}>
              <ActivityIndicator color="#fff" size="small" />
            </View>
          ) : (
            <MicButton
              onDone={(v) => void ovozdan(v)}
              onError={ogoh}
              onHint={(matn) => setToast({ matn, ohang: "info" })}
              disabled={busy}
            />
          )}
        </View>
      </View>

      {/* Rozilik — surat OpenAI ga ketadi (skanerdagi qoida bilan bir xil).
          Tanlash tugmalari SHU varaqda: rozilik va tanlov bitta qadam */}
      <Sheet open={rozilik} onClose={() => setRozilik(false)} title={t("mob.ai.consentTitle")}>
        <Text style={s.consentText}>{t("mob.ai.chatConsentText")}</Text>
        <View style={s.points}>
          <Point text={t("mob.ai.consent1")} />
          <Point text={t("mob.ai.chatConsent2")} />
          <Point text={t("mob.ai.chatConsent3")} />
        </View>
        <View style={s.consentBtns}>
          <Button title={t("mob.ai.chatConsentCamera")} onPress={() => void biriktir("camera")} />
          <Button title={t("mob.ai.consentGallery")} variant="secondary" onPress={() => void biriktir("gallery")} />
          <Button title={t("mob.ai.consentFile")} variant="secondary" onPress={() => void biriktir("file")} />
        </View>
      </Sheet>

      {/* Taklif — AI o'zi bajarmaydi, odam qaror qiladi */}
      <Modal visible={!!ask} animationType="slide" transparent onRequestClose={() => setAsk(null)}>
        <Pressable style={s.backdrop} onPress={() => setAsk(null)}>
          <View style={[s.sheet, { paddingBottom: insets.bottom + space.lg }]}>
            <View style={s.grabber} />
            <Text style={s.sheetTitle}>{t("mob.ai.confirmTitle")}</Text>
            <Text style={s.sheetText}>{ask ? actionLabel(ask) : ""}</Text>
            <Text style={s.sheetNote}>{t("mob.ai.confirmNote")}</Text>

            <Pressable
              style={s.primary}
              onPress={() => ask && void decide(ask, true)}
              accessibilityRole="button"
            >
              <Text style={s.primaryText}>{t("mob.ai.confirm")}</Text>
            </Pressable>
            <Pressable
              style={s.ghost}
              onPress={() => ask && void decide(ask, false)}
              accessibilityRole="button"
            >
              <Text style={s.ghostText}>{t("mob.ai.reject")}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

/* ─────────────────────────────────────────────── bo'laklar */

function Bubble({
  msg,
  onAction,
  onOpen,
  onSaveDocs,
  onCopy,
}: {
  msg: Msg;
  onAction: (a: Action) => void;
  onOpen: (href: string) => void;
  onSaveDocs: () => void;
  onCopy: () => void;
}) {
  if (msg.role === "me") {
    return (
      <View style={s.me}>
        {msg.text ? <Text style={s.meText}>{msg.text}</Text> : null}
        {msg.ilova ? <Text style={[s.meIlova, msg.text ? s.meIlovaGap : null]}>{msg.ilova}</Text> : null}
      </View>
    );
  }

  const src = sources(msg.tools);

  return (
    <View style={[s.ai, msg.warn ? s.aiWarn : null]}>
      {blocks(msg.text).map((b, i) =>
        b.kind === "table" ? (
          <View key={i} style={s.tbl}>
            {b.rows.map((r, j) => (
              <View key={j} style={[s.tr, j > 0 ? s.trLine : null]}>
                <Text style={s.tk}>{r.k}</Text>
                <Text style={[s.tv, r.neg ? s.tvNeg : null]}>{r.v}</Text>
              </View>
            ))}
          </View>
        ) : b.kind === "bullets" ? (
          <View key={i} style={s.bullets}>
            {b.items.map((it, j) => (
              <View key={j} style={s.bullet}>
                <Text style={s.dot}>•</Text>
                <Text style={s.txt}>{it}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text key={i} style={[s.txt, i > 0 ? s.txtGap : null]}>
            {b.text}
          </Text>
        ),
      )}

      {/* RASM O'QILGAN — natija DALIL EMAS (TZ-09 §9.2). Belgi va saqlash
          tugmasini kod qo'yadi, model emas */}
      {msg.hujjat ? (
        <View style={s.unverified}>
          <Text style={s.unverifiedText}>{t("pgAi.unverified")}</Text>
          <Pressable onPress={onSaveDocs} hitSlop={6} accessibilityRole="button">
            <Text style={s.link}>{t("pgAi.saveDocs")} →</Text>
          </Pressable>
        </View>
      ) : null}

      {/* YAQIN JOYLAR (TZ-09 §9.1). Xarita tugmasi faqat ochiq joylarda —
          ustaning aniq nuqtasi berilmaydi */}
      {msg.joylar ? (
        <View style={s.near}>
          <Text style={s.nearTitle}>
            {t("pgAi.nearTitle")}
            {msg.hudud ? ` · ${msg.hudud}` : ""}
          </Text>
          {msg.joylar.slice(0, 12).map((j, k) => (
            <View key={k} style={s.nearRow}>
              <Text style={s.nearIcon}>{JOY_BELGI[j.tur] ?? "•"}</Text>
              <Text style={s.nearName} numberOfLines={1}>
                {j.nomi || t(`pgAi.joyTur.${j.tur}`)}
              </Text>
              <Text style={s.nearKm}>{t("pgAi.km", { km: j.km })}</Text>
              {j.lat != null && j.lng != null ? (
                <Pressable
                  onPress={() => void Linking.openURL(xarita(j.lat!, j.lng!))}
                  hitSlop={6}
                  accessibilityRole="link"
                >
                  <Text style={s.link}>{t("pgAi.map")}</Text>
                </Pressable>
              ) : null}
              {j.href && webToApp(j.href) ? (
                <Pressable onPress={() => onOpen(j.href!)} hitSlop={6} accessibilityRole="button">
                  <Text style={s.link}>{t("pgAi.open")}</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
          {msg.ustalarHref && webToApp(msg.ustalarHref) ? (
            <Pressable onPress={() => onOpen(msg.ustalarHref!)} hitSlop={6} accessibilityRole="button">
              <Text style={[s.link, s.nearAll]}>{t("pgAi.allMasters")} →</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Qaysi ma'lumotga tayandi */}
      {src.length ? (
        <View style={s.srcRow}>
          <Icon name="route" size={13} stroke="#64748b" />
          <Text style={s.srcText}>
            {t("mob.ai.source")}: {src.map((k) => t(`mob.aiSrc.${k}`)).join(" · ")}
          </Text>
        </View>
      ) : null}

      {/* Javobdan amalga */}
      {!msg.warn ? (
        <View style={s.acts}>
          {(msg.actions ?? []).map((a) =>
            a.locked ? (
              /* Tarif yetmadi — tugma YOLG'ON VA'DA bermaydi (TZ-09 §9.4) */
              <View key={a.id} style={s.lock}>
                <Text style={s.lockText}>{lockNote(a)}</Text>
                <Pressable style={[s.act, s.actLock]} onPress={() => onAction(a)} accessibilityRole="button">
                  <Text style={[s.actText, s.actLockText]} numberOfLines={1}>
                    {IOS ? t("mob.ai.rolniKorish") : t("pgAi.tarifniKorish")}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable key={a.id} style={s.act} onPress={() => onAction(a)} accessibilityRole="button">
                <Text style={s.actText} numberOfLines={1}>
                  {actionLabel(a)}
                </Text>
              </Pressable>
            ),
          )}
          <Pressable style={s.act} onPress={onCopy} accessibilityRole="button">
            <Text style={s.actText}>{t("mob.ai.copy")}</Text>
          </Pressable>
        </View>
      ) : null}

      {/* AI javobi ustidan shikoyat — Google Play talabi (2026-09-18,
          do'kon auditi A13). Ogohlantirish xabari (`warn`) AI javobi
          emas, ilovaning o'z matni — unga shikoyat qilinmaydi. */}
      {!msg.warn ? <AiReportButton place="chat" answer={msg.text} /> : null}
    </View>
  );
}

/**
 * Qulf izohi — platformaga qarab.
 *
 * Android: «🔒 Bu amal uchun «Yuk egasi» tarifi kerak» (web bilan bir
 * xil; Play narxni ko'rsatishni taqiqlamaydi). iOS: tarif so'zisiz —
 * «bu amal «Yuk egasi» rolida ishlaydi» (Apple 3.1.1).
 */
function lockNote(a: Action): string {
  const rol = a.rol ? roleLabel(a.rol) : "";
  return IOS ? t("mob.ai.rolKerak", { rol }) : t("pgAi.tarifKerak", { rol });
}

function Chip({ icon, label, onRemove }: { icon?: IconName; label: string; onRemove: () => void }) {
  return (
    <View style={s.chip}>
      {icon ? <Icon name={icon} size={13} stroke={color.icon} /> : null}
      <Text style={s.chipText} numberOfLines={1}>
        {label}
      </Text>
      <Pressable onPress={onRemove} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("pgAi.remove")}>
        <Icon name="close" size={13} stroke={color.mutedForeground} />
      </Pressable>
    </View>
  );
}

function Point({ text }: { text: string }) {
  return (
    <View style={s.point}>
      <Icon name="check" size={14} stroke={color.success} />
      <Text style={s.pointText}>{text}</Text>
    </View>
  );
}

function Typing() {
  return (
    <View style={[s.ai, s.typing]}>
      <View style={s.dots}>
        <View style={[s.tdot, { backgroundColor: color.iconFaint }]} />
        <View style={[s.tdot, { backgroundColor: "#94a3b8" }]} />
        <View style={[s.tdot, { backgroundColor: color.iconFaint }]} />
      </View>
      <Text style={s.typingText}>{t("mob.ai.thinking")}</Text>
    </View>
  );
}

/* ─────────────────────────────────────────────── matnni bo'laklash */

type Block =
  | { kind: "text"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "table"; rows: { k: string; v: string; neg: boolean }[] };

/** «- Kalit — qiymat» ko'rinishidagi satr */
const PAIR = /^[-•*]\s*(.{1,40}?)\s*(?:—|–|:)\s*(.{1,24})$/;
const ITEM = /^[-•*]\s*(.+)$/;

/**
 * Javob matnini ko'rinadigan bo'laklarga ajratadi.
 *
 * HECH NIMA O'YLAB TOPILMAYDI: bu faqat joylashtirish. Ketma-ket
 * kelgan «- kalit — qiymat» satrlari jadval bo'ladi, oddiy «- ...»
 * satrlari ro'yxat, qolgani matn.
 */
export function blocks(answer: string): Block[] {
  const out: Block[] = [];
  const lines = answer.split("\n").map((l) => l.trim());

  let para: string[] = [];
  let group: string[] = [];

  const flushPara = () => {
    if (para.length) out.push({ kind: "text", text: para.join(" ") });
    para = [];
  };
  const flushGroup = () => {
    if (!group.length) return;
    const pairs = group.map((l) => l.match(PAIR));
    // Jadval faqat HAMMA satr juft bo'lsa va kamida ikkitasi bo'lsa
    if (group.length >= 2 && pairs.every(Boolean)) {
      out.push({
        kind: "table",
        rows: pairs.map((m) => ({
          k: m![1],
          v: m![2],
          neg: /^[−–-]/.test(m![2]),
        })),
      });
    } else {
      out.push({ kind: "bullets", items: group.map((l) => l.replace(ITEM, "$1")) });
    }
    group = [];
  };

  for (const line of lines) {
    if (!line) {
      flushGroup();
      flushPara();
      continue;
    }
    if (ITEM.test(line)) {
      flushPara();
      group.push(line);
    } else {
      flushGroup();
      para.push(line);
    }
  }
  flushGroup();
  flushPara();

  return out.length ? out : [{ kind: "text", text: answer }];
}

/** Chaqirilgan funksiyalardan manba turlari — takrorlanmagan holda */
function sources(tools?: Tool[]): string[] {
  const out: string[] = [];
  for (const tool of tools ?? []) {
    if (tool.name.startsWith("propose_")) continue;
    const key = SOURCE[tool.name] ?? "data";
    if (!out.includes(key)) out.push(key);
  }
  return out;
}

/**
 * Taklif yozuvi — SERVERNIKI EMAS.
 *
 * Server `title` ni o'zbekcha yozadi («#412 reysida lokatsiya
 * so'rash»). Bu yerda `kind` va reys raqamidan foydalanib yozuv
 * foydalanuvchi tilida tuziladi. Noma'lum tur bo'lsa serverniki
 * ishlatiladi — bo'sh tugmadan ko'ra shu yaxshi.
 */
function actionLabel(a: Action): string {
  const no = a.furamNo;
  if (a.kind === "open_page") return t("mob.aiAct.open_page");

  /* ── YARATISH AMALLARI (2026-09-10) ───────────────────────────

     Bu uchtasida reys raqami YO'Q — hali hech narsa yaratilmagan.
     Shuning uchun ular pastdagi `!no` to'sig'idan OLDIN turadi,
     aks holda `a.title` bilan chiqib ketardi.

     Serverning `title` i — MA'LUMOT, jumla emas: «Toshkent →
     Moskva · 20 t · Tent». Unda tugma nima qilishi ko'rinmaydi,
     shuning uchun oldiga amal nomi qo'yiladi. Ma'lumotning o'zi
     tarjima qilinmaydi. */
  if (a.kind === "create_load") return `${t("mob.aiAct.create_load")}: ${a.title}`;
  if (a.kind === "create_truck") return `${t("mob.aiAct.create_truck")}: ${a.title}`;
  if (a.kind === "create_deal") return `${t("mob.aiAct.create_deal")}: ${a.title}`;

  if (!no) return a.title;
  if (a.kind === "request_location") return t("mob.aiAct.request_location", { n: no });
  if (a.kind === "send_message") return t("mob.aiAct.send_message", { n: no });
  if (a.kind === "create_incident") return t("mob.aiAct.create_incident", { n: no });
  return a.title;
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  grow: { flex: 1 },

  header: {
    paddingLeft: 4,
    paddingRight: space.lg,
    paddingTop: 4,
    paddingBottom: space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: color.brand + "24",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: font.bodyLg, fontWeight: "700", color: color.foreground },
  sub: { fontSize: 12, color: color.successText },
  subOver: { color: color.danger },

  list: { padding: space.lg, gap: space.md },
  hello: { paddingVertical: space.xxl, paddingHorizontal: space.sm },
  helloText: {
    fontSize: font.caption,
    color: color.mutedForeground,
    textAlign: "center",
    lineHeight: 20,
  },

  me: {
    alignSelf: "flex-end",
    maxWidth: "85%",
    backgroundColor: color.navy,
    borderRadius: radius.card,
    borderBottomRightRadius: 4,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  meText: { fontSize: font.body, color: "#fff", lineHeight: 21 },
  meIlova: { fontSize: 12, color: "#ffffffb3" },
  meIlovaGap: { marginTop: 4 },

  ai: {
    alignSelf: "flex-start",
    maxWidth: "94%",
    backgroundColor: color.card,
    borderRadius: radius.card,
    borderBottomLeftRadius: 4,
    padding: 15, ...shadow.card,},
  aiWarn: { borderColor: color.warning + "66", backgroundColor: color.warningSoft },

  txt: { fontSize: font.body, color: color.foreground, lineHeight: 23 },
  txtGap: { marginTop: 12 },

  bullets: { marginTop: 10, gap: 6 },
  bullet: { flexDirection: "row", gap: 8 },
  dot: { fontSize: font.body, color: color.mutedForeground, lineHeight: 23 },

  tbl: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 12,
  },
  tr: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 9, gap: 10 },
  trLine: { borderTopWidth: 1, borderTopColor: color.border },
  tk: { flex: 1, fontSize: font.caption, color: color.foreground },
  tv: { fontSize: font.caption, fontWeight: "700", color: color.foreground },
  tvNeg: { color: color.danger },

  unverified: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: color.warning + "66",
    backgroundColor: color.warningSoft,
    gap: 6,
  },
  unverifiedText: { fontSize: 12.5, lineHeight: 18, fontWeight: "600", color: color.warning },
  link: { fontSize: 12.5, fontWeight: "700", color: color.brandText },

  near: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: color.border, gap: 7 },
  nearTitle: { fontSize: 11.5, fontWeight: "700", color: color.mutedForeground },
  nearRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  nearIcon: { fontSize: 14, width: 20, textAlign: "center" },
  nearName: { flex: 1, fontSize: 13, fontWeight: "600", color: color.foreground },
  nearKm: { fontSize: 12, color: color.mutedForeground, fontVariant: ["tabular-nums"] },
  nearAll: { marginTop: 2 },

  srcRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  srcText: { flex: 1, fontSize: font.micro, color: "#64748b" },

  acts: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  act: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: color.border,
    justifyContent: "center",
    maxWidth: "100%",
  },
  actText: { fontSize: font.caption, fontWeight: "600", color: color.icon },
  lock: { width: "100%", gap: 6 },
  lockText: { fontSize: 12.5, lineHeight: 18, fontWeight: "600", color: color.warning },
  actLock: { alignSelf: "flex-start", backgroundColor: color.brand, borderColor: color.brand },
  actLockText: { color: "#fff" },

  typing: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 },
  dots: { flexDirection: "row", gap: 4 },
  tdot: { width: 7, height: 7, borderRadius: 4 },
  typingText: { fontSize: font.caption, color: color.mutedForeground },

  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginHorizontal: space.lg,
    marginBottom: space.sm,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: color.successSoft,
  },
  toastText: { flex: 1, fontSize: font.caption, color: color.successText },
  toastWarn: { backgroundColor: color.warningSoft },
  toastInfo: { backgroundColor: color.muted },

  bar: {
    backgroundColor: color.card,
    paddingHorizontal: 10,
    paddingTop: 10,
    gap: 8, ...shadow.bar,},
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "100%",
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 15,
    backgroundColor: color.muted,
  },
  chipText: { flexShrink: 1, fontSize: 12, fontWeight: "600", color: color.foreground },
  row: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  tool: { width: 38, height: 44, alignItems: "center", justifyContent: "center" },
  field: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  input: { fontSize: font.body, color: color.foreground, paddingVertical: 11 },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  sendOff: { backgroundColor: color.iconFaint },

  consentText: { fontSize: font.body, lineHeight: 22, color: color.foreground },
  points: { gap: 9, marginTop: space.md },
  point: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  pointText: { flex: 1, fontSize: 13, lineHeight: 19, color: color.mutedForeground },
  consentBtns: { gap: 10, marginTop: space.lg },

  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: color.card,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.iconFaint,
    alignSelf: "center",
    marginBottom: 18,
  },
  sheetTitle: { fontSize: font.title, fontWeight: "700", color: color.foreground },
  sheetText: { fontSize: font.body, color: color.foreground, marginTop: 10, lineHeight: 22 },
  sheetNote: { fontSize: 12, color: color.mutedForeground, marginTop: 10, lineHeight: 19 },
  primary: {
    height: 52,
    borderRadius: radius.control,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  primaryText: { fontSize: font.body, fontWeight: "600", color: "#fff" },
  ghost: {
    height: 52,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  ghostText: { fontSize: font.body, fontWeight: "600", color: color.icon },
}));
