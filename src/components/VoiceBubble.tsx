/**
 * Ovozli xabar — tinglash.
 *
 * `expo-audio`: manba sarlavha bilan beriladi (fayl himoyalangan).
 * Har pufakcha o'z pleyeri — bir vaqtda bittasi tinglanadi, chunki
 * odam ikkinchisini bossa birinchisi to'xtatiladi (`activeRef`).
 */
import { useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus, type AudioPlayer } from "expo-audio";
import { Icon } from "@/components/Icon";
import { Text } from "@/components/Text";
import { color, themed } from "@/lib/theme";
import type { ImgSource } from "@/lib/img";

/* Bir vaqtda bitta ovoz — ikkita xabar ustma-ust eshitilmasin */
let active: AudioPlayer | null = null;

function mmss(sec: number) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function VoiceBubble({
  source,
  durationSec,
  mine,
}: {
  source: ImgSource;
  durationSec: number | null;
  mine: boolean;
}) {
  const player = useAudioPlayer(source);
  const st = useAudioPlayerStatus(player);
  const finished = useRef(false);

  const total = st.duration > 0 ? st.duration : (durationSec ?? 0);
  const cur = st.playing || st.currentTime > 0 ? st.currentTime : 0;
  const pct = total > 0 ? Math.min(1, cur / total) : 0;

  useEffect(() => {
    if (st.didJustFinish) finished.current = true;
  }, [st.didJustFinish]);

  function toggle() {
    if (st.playing) {
      player.pause();
      return;
    }
    if (active && active !== player) {
      try { active.pause(); } catch { /* boshqa pleyer allaqachon yopilgan */ }
    }
    active = player;
    if (finished.current) {
      player.seekTo(0);
      finished.current = false;
    }
    player.play();
  }

  const fg = mine ? "#ffffff" : color.foreground;
  const track = mine ? "#ffffff55" : color.border;
  const fill = mine ? "#ffffff" : color.brand;

  return (
    <View style={s.row}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        style={[s.btn, { backgroundColor: mine ? "#ffffff33" : color.brandSoft }]}
      >
        <Icon name={st.playing ? "pause" : "play"} size={18} stroke={mine ? "#ffffff" : color.brand} fill={st.playing ? "none" : mine ? "#ffffff" : color.brand} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <View style={[s.track, { backgroundColor: track }]}>
          <View style={[s.fill, { width: `${pct * 100}%`, backgroundColor: fill }]} />
        </View>
        <Text style={[s.time, { color: mine ? "#ffffffcc" : color.mutedForeground }]}>
          {mmss(st.playing || cur > 0 ? cur : total)}
          {total > 0 ? ` / ${mmss(total)}` : ""}
        </Text>
      </View>
      <Icon name="mic" size={16} stroke={mine ? "#ffffffaa" : "#94a3b8"} />
      <View style={{ width: 0, height: 0 }} accessibilityLabel={fg} />
    </View>
  );
}

const s = themed(() => ({
  row: { flexDirection: "row", alignItems: "center", gap: 10, minWidth: 200 },
  btn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  track: { height: 4, borderRadius: 2, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2 },
  time: { fontSize: 11, marginTop: 5, fontVariant: ["tabular-nums"] },
}));
