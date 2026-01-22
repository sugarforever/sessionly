import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "600", "700"],
  subsets: ["latin"],
});

export const OutroScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo animation
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  // Title animation
  const titleOpacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleY = spring({
    frame: frame - 20,
    fps,
    config: { damping: 200 },
  });

  // CTA animation
  const ctaOpacity = interpolate(frame, [50, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ctaScale = spring({
    frame: frame - 50,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  // Glow effect
  const glowOpacity = interpolate(
    frame % 60,
    [0, 30, 60],
    [0.3, 0.6, 0.3]
  );

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
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
          opacity: glowOpacity,
        }}
      />

      {/* Logo */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: 24,
            backgroundColor: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 20px 60px rgba(255,255,255,0.15)",
          }}
        >
          <span
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: "#0a0a0a",
            }}
          >
            S
          </span>
        </div>
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: 72,
          fontWeight: 700,
          color: "#ffffff",
          margin: 0,
          marginBottom: 16,
          opacity: titleOpacity,
          transform: `translateY(${interpolate(titleY, [0, 1], [20, 0])}px)`,
          letterSpacing: -1,
        }}
      >
        Sessionly
      </h1>

      {/* Tagline */}
      <p
        style={{
          fontSize: 24,
          fontWeight: 300,
          color: "rgba(255,255,255,0.6)",
          margin: 0,
          marginBottom: 48,
          opacity: titleOpacity,
        }}
      >
        Browse your Claude Code sessions beautifully
      </p>

      {/* CTA Button */}
      <div
        style={{
          opacity: ctaOpacity,
          transform: `scale(${ctaScale})`,
        }}
      >
        <div
          style={{
            padding: "16px 48px",
            borderRadius: 100,
            backgroundColor: "#ffffff",
            fontSize: 18,
            fontWeight: 600,
            color: "#0a0a0a",
            boxShadow: "0 10px 40px rgba(255,255,255,0.2)",
          }}
        >
          Download Free on GitHub
        </div>
      </div>

      {/* Footer */}
      <p
        style={{
          position: "absolute",
          bottom: 48,
          fontSize: 14,
          color: "rgba(255,255,255,0.3)",
          margin: 0,
          opacity: ctaOpacity,
        }}
      >
        MIT License - Open Source
      </p>
    </AbsoluteFill>
  );
};
