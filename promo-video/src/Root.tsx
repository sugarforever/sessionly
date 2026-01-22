import { Composition } from "remotion";
import { PromoVideo } from "./Promo";

export const RemotionRoot = () => {
  return (
    <Composition
      id="PromoVideo"
      component={PromoVideo}
      durationInFrames={900} // 30 seconds at 30fps
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
