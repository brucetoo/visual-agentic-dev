import React from "react";
import {
    AbsoluteFill,
    Sequence,
    useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

import { IntroScene } from "./components/IntroScene";
import { WorkflowScene } from "./components/WorkflowScene";

import { SCENE_TIMING } from "./design-tokens";

// Load Inter font for the entire video
const { fontFamily } = loadFont("normal", {
    weights: ["400", "500", "600", "700", "800"],
    subsets: ["latin"],
});

export const PromoVideo: React.FC = () => {
    const { fps } = useVideoConfig();

    return (
        <AbsoluteFill style={{ fontFamily, backgroundColor: "#0f0c29" }}>
            {/* Scene 1: Intro - Brand reveal */}
            <Sequence
                from={SCENE_TIMING.intro.start * fps}
                durationInFrames={SCENE_TIMING.intro.duration * fps}
                premountFor={1 * fps}
            >
                <IntroScene />
            </Sequence>

            {/* Scene 2: Detailed workflow demo */}
            <Sequence
                from={SCENE_TIMING.workflow.start * fps}
                durationInFrames={SCENE_TIMING.workflow.duration * fps}
                premountFor={1 * fps}
            >
                <WorkflowScene />
            </Sequence>
        </AbsoluteFill>
    );
};
