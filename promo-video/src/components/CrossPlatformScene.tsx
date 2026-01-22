import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});

const PlatformIcon = ({
  name,
  icon,
  delay,
}: {
  name: string;
  icon: string;
  delay: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const iconScale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const opacity = interpolate(frame - delay, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        opacity,
        transform: `scale(${iconScale})`,
      }}
    >
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: 24,
          backgroundColor: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 48,
        }}
      >
        {icon}
      </div>
      <span
        style={{
          fontSize: 18,
          fontWeight: 500,
          color: "rgba(255,255,255,0.8)",
        }}
      >
        {name}
      </span>
    </div>
  );
};

export const CrossPlatformScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleY = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const lineWidth = interpolate(frame, [30, 60], [0, 400], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily,
      }}
    >
      {/* Title */}
      <h2
        style={{
          fontSize: 48,
          fontWeight: 600,
          color: "#ffffff",
          margin: 0,
          marginBottom: 16,
          opacity: titleOpacity,
          transform: `translateY(${interpolate(titleY, [0, 1], [30, 0])}px)`,
        }}
      >
        Works Everywhere
      </h2>

      {/* Subtitle */}
      <p
        style={{
          fontSize: 20,
          color: "rgba(255,255,255,0.5)",
          margin: 0,
          marginBottom: 64,
          opacity: titleOpacity,
        }}
      >
        Native installers for all platforms
      </p>

      {/* Platform icons */}
      <div
        style={{
          display: "flex",
          gap: 80,
          justifyContent: "center",
        }}
      >
        <PlatformIcon name="macOS" icon="" delay={20} />
        <PlatformIcon name="Windows" icon="" delay={35} />
        <PlatformIcon name="Linux" icon="" delay={50} />
      </div>

      {/* Connecting line */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, 60px)",
          width: lineWidth,
          height: 2,
          backgroundColor: "rgba(255,255,255,0.1)",
          borderRadius: 1,
        }}
      />
    </AbsoluteFill>
  );
};
