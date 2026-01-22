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
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const { fontFamily: monoFont } = loadMono("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

const FeatureCard = ({
  icon,
  title,
  description,
  delay,
  content,
}: {
  icon: string;
  title: string;
  description: string;
  delay: number;
  content: React.ReactNode;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardSpring = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  const opacity = interpolate(frame - delay, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: 400,
        backgroundColor: "rgba(255,255,255,0.03)",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.1)",
        padding: 24,
        opacity,
        transform: `scale(${cardSpring}) translateY(${interpolate(cardSpring, [0, 1], [20, 0])}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: "rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
          }}
        >
          {icon}
        </div>
        <div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#ffffff",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.5)",
            }}
          >
            {description}
          </div>
        </div>
      </div>
      <div
        style={{
          backgroundColor: "rgba(0,0,0,0.3)",
          borderRadius: 8,
          padding: 16,
          minHeight: 120,
        }}
      >
        {content}
      </div>
    </div>
  );
};

const CodeBlockContent = () => {
  const frame = useCurrentFrame();

  const lines = [
    { text: "const", color: "#c678dd" },
    { text: " result", color: "#e06c75" },
    { text: " = ", color: "#abb2bf" },
    { text: "await", color: "#c678dd" },
    { text: " fetchData", color: "#61afef" },
    { text: "()", color: "#abb2bf" },
  ];

  return (
    <div style={{ fontFamily: monoFont, fontSize: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ color: "rgba(255,255,255,0.3)" }}>1</span>
        <div style={{ display: "flex" }}>
          {lines.map((item, i) => {
            const charDelay = i * 3;
            const opacity = interpolate(frame - charDelay, [0, 5], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <span key={i} style={{ color: item.color, opacity }}>
                {item.text}
              </span>
            );
          })}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "rgba(255,255,255,0.3)" }}>2</span>
        <span style={{ color: "#c678dd" }}>console</span>
        <span style={{ color: "#abb2bf" }}>.</span>
        <span style={{ color: "#61afef" }}>log</span>
        <span style={{ color: "#abb2bf" }}>(result)</span>
      </div>
    </div>
  );
};

const ThinkingContent = () => {
  const frame = useCurrentFrame();

  const textOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const pulseOpacity = interpolate(
    frame % 30,
    [0, 15, 30],
    [0.3, 0.6, 0.3]
  );

  return (
    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          opacity: pulseOpacity,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: "#a855f7",
          }}
        />
        <span style={{ color: "#a855f7", fontWeight: 500 }}>Extended Thinking</span>
      </div>
      <p style={{ margin: 0, opacity: textOpacity, lineHeight: 1.5 }}>
        Let me analyze the code structure and identify the best approach for
        implementing this feature...
      </p>
    </div>
  );
};

const TerminalContent = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cursor = frame % 30 < 15 ? "|" : "";
  const typedChars = Math.min(
    Math.floor(frame / 2),
    "npm run build".length
  );

  return (
    <div style={{ fontFamily: monoFont, fontSize: 13 }}>
      <div style={{ color: "#22c55e", marginBottom: 8 }}>
        ~/my-project $
      </div>
      <div style={{ color: "#ffffff" }}>
        {"npm run build".slice(0, typedChars)}
        <span style={{ opacity: frame % 30 < 15 ? 1 : 0 }}>|</span>
      </div>
    </div>
  );
};

export const FeaturesScene = () => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
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
          marginBottom: 48,
          opacity: titleOpacity,
        }}
      >
        Powerful Features
      </h2>

      {/* Feature cards grid */}
      <div
        style={{
          display: "flex",
          gap: 24,
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: 1300,
        }}
      >
        <FeatureCard
          icon="{ }"
          title="Syntax Highlighting"
          description="30+ languages supported"
          delay={20}
          content={<CodeBlockContent />}
        />
        <FeatureCard
          icon="~"
          title="Thinking Blocks"
          description="See Claude's reasoning"
          delay={40}
          content={<ThinkingContent />}
        />
        <FeatureCard
          icon=">"
          title="Integrated Terminal"
          description="Full PTY support"
          delay={60}
          content={<TerminalContent />}
        />
      </div>
    </AbsoluteFill>
  );
};
