/**
 * Ikonkalar — Lucide uslubida, chiziqli, 2px qalinlikda.
 *
 * Web'da `lucide-react` ishlatiladi; bu yerda kutubxona qo'shilmadi,
 * chunki ilovaga o'ndan sanoqli ikonka kerak va har biri bir necha
 * qatorlik `path`. Butun paketni bundle'ga qo'shishning ma'nosi yo'q.
 */
import type { ColorValue } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { color } from "@/lib/theme";

export type IconName =
  | "home"
  | "package"
  | "route"
  | "chat"
  | "sparkle"
  | "user"
  | "bell"
  | "search"
  | "filter"
  | "back"
  | "chevron"
  | "close"
  | "arrow-right"
  | "truck"
  | "clock"
  | "alert"
  | "heart"
  | "plus"
  | "doc"
  | "border"
  | "check"
  | "chart"
  /* Dizayn-2: menyu va «+» varag'i uchun */
  | "grid"
  | "wrench"
  | "briefcase"
  | "wallet"
  | "star"
  | "calc"
  | "play"
  | "lock"
  | "users"
  | "shield"
  | "headset"
  | "handshake"
  | "tag"
  /* Muloqot (A-qadam) */
  | "mic"
  | "paperclip"
  | "send"
  | "pin"
  | "reply"
  | "globe"
  | "map-pin"
  | "phone"
  | "play"
  | "pause"
  | "stop"
  | "file"
  | "image"
  | "check-check"
  | "more"
  | "trash"
  | "copy"
  | "eye"
  | "eye-off";

/* `stroke` — `string` emas, `ColorValue`: `Tabs.Screen` ning
   `tabBarIcon` i rangni shu turda beradi (RN 0.86). */
type Props = { name: IconName; size?: number; stroke?: ColorValue; fill?: string };

export function Icon({ name, size = 22, stroke = color.mutedForeground, fill = "none" }: Props) {
  const p = { stroke, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === "home" && <Path {...p} d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />}
      {name === "package" && <Path {...p} d="m7.5 4.27 9 5.15M21 8l-9 5-9-5 9-5 9 5zM3 8v8l9 5 9-5V8" />}
      {name === "route" && (
        <>
          <Circle {...p} cx={6} cy={19} r={3} />
          <Path {...p} d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
          <Circle {...p} cx={18} cy={5} r={3} />
        </>
      )}
      {name === "chat" && <Path {...p} d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />}
      {name === "sparkle" && (
        <>
          <Path {...p} d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
          <Circle {...p} cx={12} cy={12} r={3} />
        </>
      )}
      {name === "user" && (
        <>
          <Path {...p} d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <Circle {...p} cx={12} cy={7} r={4} />
        </>
      )}
      {name === "bell" && <Path {...p} d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />}
      {name === "search" && (
        <>
          <Circle {...p} cx={11} cy={11} r={8} />
          <Path {...p} d="m21 21-4.3-4.3" />
        </>
      )}
      {name === "filter" && <Path {...p} d="M3 5h18l-7 8v6l-4 2v-8z" />}
      {name === "back" && <Path {...p} d="m15 18-6-6 6-6" />}
      {name === "chevron" && <Path {...p} d="m9 18 6-6-6-6" />}
      {name === "close" && <Path {...p} d="M18 6 6 18M6 6l12 12" />}
      {name === "arrow-right" && <Path {...p} d="M5 12h14M13 6l6 6-6 6" />}
      {name === "truck" && (
        <>
          <Path {...p} d="M10 17h4V5H2v12h3M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
          <Circle {...p} cx={7.5} cy={17.5} r={2.5} />
          <Circle {...p} cx={17.5} cy={17.5} r={2.5} />
        </>
      )}
      {name === "clock" && (
        <>
          <Circle {...p} cx={12} cy={12} r={10} />
          <Path {...p} d="M12 6v6l4 2" />
        </>
      )}
      {name === "alert" && (
        <>
          <Path {...p} d="M12 9v4M12 17h.01" />
          <Path {...p} d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        </>
      )}
      {name === "heart" && (
        <Path
          {...p}
          fill={fill}
          d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l8.8 8.8 8.8-8.8a5.5 5.5 0 0 0 0-7.8z"
        />
      )}
      {name === "plus" && <Path {...p} d="M12 5v14M5 12h14" />}
      {name === "doc" && (
        <>
          <Path {...p} d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <Path {...p} d="M14 2v6h6" />
        </>
      )}
      {name === "border" && <Path {...p} d="M4 4v16M4 5h13l-2.5 4L17 13H4" />}
      {name === "check" && <Path {...p} d="M20 6 9 17l-5-5" />}
      {/* Analitika: o'suvchi chiziq va burchakdagi strelka */}
      {name === "chart" && (
        <>
          <Path {...p} d="M4 18l5-6 4 3 6-8" />
          <Path {...p} d="M15 7h4v4" />
        </>
      )}
      {/* ── Dizayn-2 ── */}
      {name === "grid" && <Path {...p} d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />}
      {name === "wrench" && (
        <Path
          {...p}
          d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
        />
      )}
      {name === "briefcase" && (
        <>
          <Path {...p} d="M4 7h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
          <Path {...p} d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M2 13h20" />
        </>
      )}
      {name === "wallet" && (
        <>
          <Path {...p} d="M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <Path {...p} d="M18 12a2 2 0 0 0 0 4h4v-4z" />
        </>
      )}
      {name === "star" && (
        <Path {...p} fill={fill} d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
      )}
      {name === "calc" && (
        <>
          <Path {...p} d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
          <Path {...p} d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h.01M16 19h.01" />
        </>
      )}
      {name === "play" && <Path {...p} fill={fill} d="M6 4l14 8-14 8z" />}
      {name === "lock" && (
        <>
          <Path {...p} d="M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z" />
          <Path {...p} d="M8 11V7a4 4 0 0 1 8 0v4" />
        </>
      )}
      {name === "users" && (
        <>
          <Path {...p} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <Circle {...p} cx={9} cy={7} r={4} />
          <Path {...p} d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </>
      )}
      {name === "shield" && <Path {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />}
      {name === "headset" && (
        <>
          <Path {...p} d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <Path {...p} d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
        </>
      )}
      {name === "handshake" && (
        <Path
          {...p}
          d="m11 17 2 2a1 1 0 1 0 3-3M14 14l2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.54l.48.32a1 1 0 0 0 1.11 0L21 4M21 3l1 11h-2M3 3 2 14h2M3 4l4.44-.35a3 3 0 0 1 2.1.55L11 5"
        />
      )}
      {name === "tag" && (
        <>
          <Path {...p} d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z" />
          <Circle {...p} cx={7} cy={7} r={1.5} />
        </>
      )}
      {/* ── Muloqot ── */}
      {name === "mic" && (
        <>
          <Path {...p} d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
          <Path {...p} d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8" />
        </>
      )}
      {name === "paperclip" && (
        <Path {...p} d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
      )}
      {name === "send" && <Path {...p} d="m22 2-7 20-4-9-9-4zM22 2 11 13" />}
      {name === "pin" && <Path {...p} d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />}
      {name === "reply" && <Path {...p} d="M9 17H7A5 5 0 0 1 7 7h9M13 3l4 4-4 4" />}
      {name === "globe" && (
        <>
          <Circle {...p} cx={12} cy={12} r={10} />
          <Path {...p} d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </>
      )}
      {name === "map-pin" && (
        <>
          <Path {...p} d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
          <Circle {...p} cx={12} cy={10} r={3} />
        </>
      )}
      {name === "phone" && (
        <Path {...p} d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
      )}
      {name === "play" && <Path {...p} fill={fill} d="M6 4l14 8-14 8z" />}
      {name === "pause" && <Path {...p} d="M8 5v14M16 5v14" />}
      {name === "stop" && <Path {...p} d="M6 6h12v12H6z" />}
      {name === "file" && (
        <>
          <Path {...p} d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <Path {...p} d="M14 2v6h6M8 13h8M8 17h8" />
        </>
      )}
      {name === "image" && (
        <>
          <Path {...p} d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          <Circle {...p} cx={9} cy={9} r={2} />
          <Path {...p} d="m21 15-5-5L5 21" />
        </>
      )}
      {name === "check-check" && <Path {...p} d="M18 6 7 17l-5-5M22 10l-7.5 7.5L13 16" />}
      {name === "more" && (
        <>
          <Circle {...p} cx={12} cy={12} r={1} />
          <Circle {...p} cx={19} cy={12} r={1} />
          <Circle {...p} cx={5} cy={12} r={1} />
        </>
      )}
      {name === "trash" && <Path {...p} d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />}
      {name === "copy" && (
        <>
          <Path {...p} d="M10 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" />
          <Path {...p} d="M4 16H3a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1" />
        </>
      )}
      {name === "eye" && (
        <>
          <Path {...p} d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
          <Circle {...p} cx={12} cy={12} r={3} />
        </>
      )}
      {name === "eye-off" && (
        <>
          <Path {...p} d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
          <Circle {...p} cx={12} cy={12} r={3} />
          <Path {...p} d="M3 3l18 18" />
        </>
      )}
    </Svg>
  );
}
