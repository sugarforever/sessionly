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

const TechBadge = ({
  name,
  delay,
}: {
  name: string;
  delay: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeSpring = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 120 },
  });

  const opacity = interpolate(frame - delay, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        padding: "12px 24px",
        borderRadius: 100,
        backgroundColor: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.15)",
        fontSize: 16,
        fontWeight: 500,
        color: "#ffffff",
        opacity,
        transform: `scale(${badgeSpring})`,
      }}
    >
      {name}
    </div>
  );
};

export const TechStackScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const technologies = [
    "Electron 32+",
    "React 18",
    "TypeScript",
    "Vite",
    "Redux Toolkit",
    "shadcn/ui",
    "Tailwind CSS",
    "xterm.js",
  ];

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
        }}
      >
        Modern Tech Stack
      </h2>

      {/* Subtitle */}
      <p
        style={{
          fontSize: 20,
          color: "rgba(255,255,255,0.5)",
          margin: 0,
          marginBottom: 48,
          opacity: titleOpacity,
        }}
      >
        Built with the best tools
      </p>

      {/* Tech badges */}
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: 800,
        }}
      >
        {technologies.map((tech, i) => (
          <TechBadge key={tech} name={tech} delay={15 + i * 5} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
