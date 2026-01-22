import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "600", "700"],
  subsets: ["latin"],
});

export const IntroScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo animation
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const logoRotation = interpolate(
    spring({ frame, fps, config: { damping: 200 } }),
    [0, 1],
    [-10, 0]
  );

  // Title animation
  const titleOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleY = interpolate(
    spring({ frame: frame - 30, fps, config: { damping: 200 } }),
    [0, 1],
    [40, 0]
  );

  // Tagline animation
  const taglineOpacity = interpolate(frame, [60, 80], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Decorative lines
  const lineWidth = interpolate(frame, [40, 80], [0, 200], {
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
      {/* Background gradient effect */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background:
            "radial-gradient(ellipse at center, rgba(255,255,255,0.03) 0%, transparent 70%)",
        }}
      />

      {/* Logo */}
      <div
        style={{
          transform: `scale(${logoScale}) rotate(${logoRotation}deg)`,
          marginBottom: 40,
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 28,
            backgroundColor: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 20px 60px rgba(255,255,255,0.1)",
          }}
        >
          <span
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "#0a0a0a",
            }}
          >
            S
          </span>
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        <h1
          style={{
            fontSize: 96,
            fontWeight: 700,
            color: "#ffffff",
            margin: 0,
            letterSpacing: -2,
          }}
        >
          Sessionly
        </h1>
      </div>

      {/* Decorative lines */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 24,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: lineWidth,
            height: 2,
            backgroundColor: "rgba(255,255,255,0.3)",
          }}
        />
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: "#ffffff",
            transform: `scale(${interpolate(frame, [50, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
          }}
        />
        <div
          style={{
            width: lineWidth,
            height: 2,
            backgroundColor: "rgba(255,255,255,0.3)",
          }}
        />
      </div>

      {/* Tagline */}
      <p
        style={{
          fontSize: 32,
          fontWeight: 300,
          color: "rgba(255,255,255,0.7)",
          margin: 0,
          opacity: taglineOpacity,
          letterSpacing: 4,
          textTransform: "uppercase",
        }}
      >
        Your Claude Code Session Browser
      </p>
    </AbsoluteFill>
  );
};
