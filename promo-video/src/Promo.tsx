import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { IntroScene } from "./components/IntroScene";
import { ProblemScene } from "./components/ProblemScene";
import { SolutionScene } from "./components/SolutionScene";
import { FeaturesScene } from "./components/FeaturesScene";
import { CrossPlatformScene } from "./components/CrossPlatformScene";
import { TechStackScene } from "./components/TechStackScene";
import { OutroScene } from "./components/OutroScene";

export const PromoVideo = () => {
  const transitionDuration = 15;
  const timing = linearTiming({ durationInFrames: transitionDuration });

  return (
    <TransitionSeries>
      {/* Scene 1: Intro with logo */}
      <TransitionSeries.Sequence durationInFrames={150}>
        <IntroScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={timing}
      />

      {/* Scene 2: Problem statement */}
      <TransitionSeries.Sequence durationInFrames={120}>
        <ProblemScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={timing}
      />

      {/* Scene 3: Solution overview */}
      <TransitionSeries.Sequence durationInFrames={150}>
        <SolutionScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={timing}
      />

      {/* Scene 4: Feature highlights */}
      <TransitionSeries.Sequence durationInFrames={180}>
        <FeaturesScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-bottom" })}
        timing={timing}
      />

      {/* Scene 5: Cross-platform */}
      <TransitionSeries.Sequence durationInFrames={90}>
        <CrossPlatformScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={timing}
      />

      {/* Scene 6: Tech stack */}
      <TransitionSeries.Sequence durationInFrames={90}>
        <TechStackScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={timing}
      />

      {/* Scene 7: Outro/CTA */}
      <TransitionSeries.Sequence durationInFrames={120}>
        <OutroScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
