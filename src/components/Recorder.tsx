/**
 * Ovozli xabar yozish — bosib turiladi, qo'yib yuborilganda yuboriladi.
 *
 * `expo-audio` yozuvchisi: iOS va Android'da `.m4a` (AAC) — server
 * `audio/mp4` ni qabul qiladi (`MEDIA_MIME`). Ruxsat birinchi
 * bosishda so'raladi; rad etilsa xato matni qaytadi.
 *
 * 1 soniyadan qisqa yozuv yuborilmaydi — tasodifiy tegib ketish.
 */
import { useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { Icon } from "@/components/Icon";
import { Text } from "@/components/Text";
import { color } from "@/lib/theme";
import { t } from "@/lib/i18n";

export type VoiceFile = { uri: string; name: string; type: string; sec: number };

const MAX_SEC = 300;

export function MicButton({
  onDone,
  onError,
  disabled,
}: {
  onDone: (v: VoiceFile) => void;
  onError: (msg: string) => void;
  disabled?: boolean;
}) {
  const rec = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const st = useAudioRecorderState(rec, 500);
  const [arming, setArming] = useState(false);
  const startedAt = useRef<number | null>(null);
  const cancelled = useRef(false);

  async function start() {
    if (disabled || st.isRecording || arming) return;
    setArming(true);
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        onError(t("mob.msg.micDenied"));
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await rec.prepareToRecordAsync();
      rec.record();
      cancelled.current = false;
      startedAt.current = Date.now();
    } catch {
      onError(t("mob.msg.micDenied"));
    } finally {
      setArming(false);
    }
  }

  async function stop() {
    if (!startedAt.current) return;
    const sec = Math.round((Date.now() - startedAt.current) / 1000);
    startedAt.current = null;
    try {
      await rec.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    } catch {
      return;
    }
    const uri = rec.uri;
    if (cancelled.current || !uri || sec < 1) return;
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
          <Text style={s.barHint}>{t("mob.msg.releaseToSend")}</Text>
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

const s = StyleSheet.create({
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
    width: 260,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.danger },
  barText: { fontSize: 13, fontWeight: "700", color: color.danger, fontVariant: ["tabular-nums"] },
  barHint: { fontSize: 11, color: color.mutedForeground, flex: 1 },
});
