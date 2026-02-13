import { Composition } from "remotion";
import { PromoVideo } from "./PromoVideo";

// 30fps, 38 seconds total
const FPS = 30;
const DURATION = 38 * FPS;

export const RemotionRoot: React.FC = () => {
    return (
        <Composition
            id="PromoVideo"
            component={PromoVideo}
            durationInFrames={DURATION}
            fps={FPS}
            width={1920}
            height={1080}
        />
    );
};
