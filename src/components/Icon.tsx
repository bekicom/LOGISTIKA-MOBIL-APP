/**
 * Ikonkalar — Lucide uslubida, chiziqli, 2px qalinlikda.
 *
 * Web'da `lucide-react` ishlatiladi; bu yerda kutubxona qo'shilmadi,
 * chunki ilovaga o'ndan sanoqli ikonka kerak va har biri bir necha
 * qatorlik `path`. Butun paketni bundle'ga qo'shishning ma'nosi yo'q.
 */
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
  | "check";

type Props = { name: IconName; size?: number; stroke?: string; fill?: string };

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
    </Svg>
  );
}
