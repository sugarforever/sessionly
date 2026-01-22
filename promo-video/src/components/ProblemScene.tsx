import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600"],
  subsets: ["latin"],
});

const { fontFamily: monoFont } = loadMono("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

const FileIcon = ({ delay }: { delay: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12 },
  });

  const opacity = interpolate(frame - delay, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: 60,
        height: 72,
        backgroundColor: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        transform: `scale(${scale})`,
        opacity,
        display: "flex",
        flexDirection: "column",
        padding: 8,
        gap: 4,
      }}
    >
      <div
        style={{
          height: 4,
          width: "80%",
          backgroundColor: "rgba(255,255,255,0.3)",
          borderRadius: 2,
        }}
      />
      <div
        style={{
          height: 4,
          width: "60%",
          backgroundColor: "rgba(255,255,255,0.2)",
          borderRadius: 2,
        }}
      />
      <div
        style={{
          height: 4,
          width: "90%",
          backgroundColor: "rgba(255,255,255,0.15)",
          borderRadius: 2,
        }}
      />
    </div>
  );
};

export const ProblemScene = () => {
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

  const pathOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const questionOpacity = interpolate(frame, [80, 100], [0, 1], {
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
          fontSize: 56,
          fontWeight: 600,
          color: "#ffffff",
          margin: 0,
          marginBottom: 48,
          opacity: titleOpacity,
          transform: `translateY(${interpolate(titleY, [0, 1], [30, 0])}px)`,
        }}
      >
        Your sessions are hidden in files...
      </h2>

      {/* Path display */}
      <div
        style={{
          opacity: pathOpacity,
          marginBottom: 48,
        }}
      >
        <code
          style={{
            fontFamily: monoFont,
            fontSize: 24,
            color: "rgba(255,255,255,0.5)",
            backgroundColor: "rgba(255,255,255,0.05)",
            padding: "12px 24px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          ~/.claude/projects/
        </code>
      </div>

      {/* Scattered files visualization */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 48,
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: 600,
        }}
      >
        {[0, 5, 10, 15, 20, 25, 30, 35].map((delay, i) => (
          <FileIcon key={i} delay={delay} />
        ))}
      </div>

      {/* Question */}
      <p
        style={{
          fontSize: 32,
          fontWeight: 400,
          color: "rgba(255,255,255,0.6)",
          margin: 0,
          opacity: questionOpacity,
          textAlign: "center",
          maxWidth: 800,
        }}
      >
        JSONL files are hard to read and explore
      </p>
    </AbsoluteFill>
  );
};
