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

const SessionItem = ({
  title,
  messages,
  delay,
  active = false,
}: {
  title: string;
  messages: number;
  delay: number;
  active?: boolean;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const itemSpring = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
  });

  const opacity = interpolate(frame - delay, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: 8,
        backgroundColor: active
          ? "rgba(255,255,255,0.1)"
          : "rgba(255,255,255,0.03)",
        border: active
          ? "1px solid rgba(255,255,255,0.2)"
          : "1px solid transparent",
        opacity,
        transform: `translateX(${interpolate(itemSpring, [0, 1], [-20, 0])}px)`,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: "#ffffff",
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.5)",
        }}
      >
        {messages} messages
      </div>
    </div>
  );
};

const MessageBubble = ({
  isUser,
  delay,
}: {
  isUser: boolean;
  delay: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bubbleSpring = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
  });

  const opacity = interpolate(frame - delay, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        alignSelf: isUser ? "flex-end" : "flex-start",
        maxWidth: "70%",
        padding: "12px 16px",
        borderRadius: 12,
        backgroundColor: isUser
          ? "#ffffff"
          : "rgba(255,255,255,0.08)",
        color: isUser ? "#0a0a0a" : "#ffffff",
        opacity,
        transform: `scale(${bubbleSpring})`,
      }}
    >
      <div
        style={{
          height: 8,
          width: isUser ? 100 : 180,
          backgroundColor: isUser
            ? "rgba(0,0,0,0.2)"
            : "rgba(255,255,255,0.3)",
          borderRadius: 4,
          marginBottom: 6,
        }}
      />
      <div
        style={{
          height: 8,
          width: isUser ? 60 : 140,
          backgroundColor: isUser
            ? "rgba(0,0,0,0.15)"
            : "rgba(255,255,255,0.2)",
          borderRadius: 4,
        }}
      />
    </div>
  );
};

export const SolutionScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const windowScale = spring({
    frame: frame - 20,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  const windowOpacity = interpolate(frame - 20, [0, 15], [0, 1], {
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
        Introducing Sessionly
      </h2>

      {/* App window mockup */}
      <div
        style={{
          width: 1000,
          height: 600,
          backgroundColor: "#1a1a1a",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 40px 100px rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.1)",
          transform: `scale(${windowScale})`,
          opacity: windowOpacity,
          display: "flex",
        }}
      >
        {/* Sidebar */}
        <div
          style={{
            width: 280,
            backgroundColor: "#141414",
            borderRight: "1px solid rgba(255,255,255,0.1)",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {/* Header */}
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "rgba(255,255,255,0.5)",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 8,
              paddingLeft: 8,
            }}
          >
            Sessions
          </div>

          {/* Session items */}
          <SessionItem
            title="sessionly"
            messages={42}
            delay={40}
            active={true}
          />
          <SessionItem title="my-api-project" messages={18} delay={50} />
          <SessionItem title="react-dashboard" messages={31} delay={60} />
          <SessionItem title="cli-tool" messages={7} delay={70} />
        </div>

        {/* Main content */}
        <div
          style={{
            flex: 1,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Header bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: 16,
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#ffffff",
                }}
              >
                sessionly
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                main branch - claude-opus-4-5-20251101
              </div>
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <MessageBubble isUser={true} delay={60} />
            <MessageBubble isUser={false} delay={70} />
            <MessageBubble isUser={true} delay={80} />
            <MessageBubble isUser={false} delay={90} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
