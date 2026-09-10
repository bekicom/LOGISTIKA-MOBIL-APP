/**
 * Ovozli xabar yozish — bosib turiladi, qo'yib yuborilganda yuboriladi.
 *
 * `expo-audio` yozuvchisi: iOS va Android'da `.m4a` (AAC) — server
 * `audio/mp4` ni qabul qiladi (`MEDIA_MIME`).
 *
 * ── IKKI XATO, IKKALASI HAM «JIMGINA» EDI (2026-09-06) ──────────
 *
 * 1. POYGA. `start()` — asinxron: ruxsat so'raladi, keyin
 *    `prepareToRecordAsync()`. Odam tugmani bir soniyada qo'yib
 *    yuborsa, `stop()` `start()` TUGAMASDAN chaqirilardi va
 *    `startedAt` hali null bo'lgani uchun jimgina qaytardi —
 *    keyin yozuv boshlanib, hech qachon to'xtamasdi. Endi
 *    «to'xtatish so'raldi» bayrog'i bor: `start()` tugagach uni
 *    ko'radi va darrov to'xtatadi.
 *
 * 2. RUXSAT. Birinchi bosishda tizim oynasi chiqadi. Odam
 *    barmog'ini olib «Ruxsat» ni bosadi — ya'ni bosib turish
 *    uzilgan, yozuv yo'q, xato ham yo'q: tugma «ishlamayapti»
 *    ko'rinardi. Endi ruxsat so'ralgandan keyin aniq yozuv
 *    chiqadi: «yana bosib turing».
 *
 * 1 soniyadan qisqa yozuv yuborilmaydi — tasodifiy tegib ketish.
 */
import { useRef, useState } from "react";
import { Pressable, View } from "react-native";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { Icon } from "@/components/Icon";
import { Text } from "@/components/Text";
import { color, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

export type VoiceFile = { uri: string; name: string; type: string; sec: number };

const MAX_SEC = 300;
/** Shundan qisqa bosish — tasodifiy tegish, yuborilmaydi */
const MIN_SEC = 1;

export function MicButton({
  onDone,
  onError,
  onHint,
  disabled,
}: {
  onDone: (v: VoiceFile) => void;
  onError: (msg: string) => void;
  /** Xato emas, yo'l-yo'riq: «bosib turing» */
  onHint: (msg: string) => void;
  disabled?: boolean;
}) {
  const rec = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const st = useAudioRecorderState(rec, 300);
  const [arming, setArming] = useState(false);
  const startedAt = useRef<number | null>(null);
  /** Barmoq `start()` tugamasdan ko'tarildi */
  const stopWanted = useRef(false);

  async function start() {
    if (disabled || arming || startedAt.current) return;
    stopWanted.current = false;
    setArming(true);
    try {
      const perm = await AudioModule.getRecordingPermissionsAsync();
      if (!perm.granted) {
        const asked = await AudioModule.requestRecordingPermissionsAsync();
        /* Ruxsat oynasi chiqqan payt barmoq ko'tarilgan bo'ladi —
           yozuvni boshlamaymiz, nima qilish kerakligini aytamiz. */
        onHint(asked.granted ? t("mob.msg.holdToRecord") : t("mob.msg.micDenied"));
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await rec.prepareToRecordAsync();
      if (stopWanted.current) {
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        return;
      }
      rec.record();
      startedAt.current = Date.now();
    } catch (e) {
      if (__DEV__) console.warn("[mic] start", String(e));
      onError(t("mob.msg.micDenied"));
    } finally {
      setArming(false);
    }
  }

  async function stop() {
    // Hali tayyorlanayotgan bo'lsa — tugagach o'zi to'xtaydi
    if (!startedAt.current) {
      stopWanted.current = true;
      return;
    }
    const sec = Math.round((Date.now() - startedAt.current) / 1000);
    startedAt.current = null;
    try {
      await rec.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    } catch (e) {
      if (__DEV__) console.warn("[mic] stop", String(e));
      return;
    }
    const uri = rec.uri;
    if (!uri) return;
    if (sec < MIN_SEC) {
      onHint(t("mob.msg.tooShort"));
      return;
    }
    onDone({ uri, name: `voice-${Date.now()}.m4a`, type: "audio/mp4", sec: Math.min(sec, MAX_SEC) });
  }

  const secs = Math.round((st.durationMillis ?? 0) / 1000);
  const recording = st.isRecording;

  return (
    <View style={s.wrap}>
      {recording ? (
        <View style={s.bar} pointerEvents="none">
          <View style={s.dot} />
          <Text style={s.barText}>
            {t("mob.msg.recording", { s: `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}` })}
          </Text>
          <Text style={s.barHint} numberOfLines={1}>{t("mob.msg.releaseToSend")}</Text>
        </View>
      ) : null}
      <Pressable
        onPressIn={start}
        onPressOut={stop}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={t("mob.msg.holdToRecord")}
        style={({ pressed }) => [s.btn, recording && s.btnOn, pressed && !recording && { opacity: 0.8 }]}
      >
        <Icon name="mic" size={20} stroke="#ffffff" />
      </Pressable>
    </View>
  );
}

const s = themed(() => ({
  wrap: { alignItems: "flex-end" },
  btn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  btnOn: { backgroundColor: color.danger, transform: [{ scale: 1.15 }] },
  bar: {
    position: "absolute",
    right: 52,
    bottom: 0,
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 21,
    backgroundColor: color.dangerSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: 250,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.danger },
  barText: { fontSize: 13, fontWeight: "700", color: color.danger, fontVariant: ["tabular-nums"] },
  barHint: { fontSize: 11, color: color.mutedForeground, flex: 1 },
}));
