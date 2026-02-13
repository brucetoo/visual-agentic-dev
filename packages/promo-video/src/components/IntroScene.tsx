import React from "react";
import {
    AbsoluteFill,
    interpolate,
    spring,
    useCurrentFrame,
    useVideoConfig,
    Easing,
    staticFile,
} from "remotion";
import { COLORS, FONTS } from "../design-tokens";

/**
 * Intro Scene — 4 seconds
 * Fast, punchy brand reveal with step-by-step tagline animation:
 *   Click → Locate → Agent Edit → Done ✨
 * Each step appears individually with unique style.
 */

// Step pill component — each step has its own color, icon, and dramatic entrance
const StepPill: React.FC<{
    label: string;
    icon: string;
    color: string;
    delay: number;
    index: number;
}> = ({ label, icon, color, delay, index }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const entrance = spring({
        frame,
        fps,
        delay: delay * fps,
        config: { damping: 10, stiffness: 140 },
    });

    const scale = interpolate(entrance, [0, 1], [0.3, 1]);
    const y = interpolate(entrance, [0, 1], [30, 0]);

    // Glow pulse after entrance
    const glowPulse = frame > (delay + 0.5) * fps
        ? interpolate(Math.sin((frame - (delay + 0.5) * fps) / 10), [-1, 1], [0.4, 1])
        : 0;

    return (
        <div style={{
            opacity: entrance,
            transform: `scale(${scale}) translateY(${y}px)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
        }}>
            {/* Icon circle */}
            <div style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: `${color}18`,
                border: `2px solid ${color}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                boxShadow: `0 0 ${30 * glowPulse}px ${color}60`,
            }}>
                {icon}
            </div>
            {/* Label */}
            <div style={{
                fontFamily: FONTS.heading,
                fontSize: 20,
                fontWeight: 700,
                color,
                letterSpacing: 0.5,
            }}>
                {label}
            </div>
        </div>
    );
};

// Flowing arrow connector between steps
const StepArrow: React.FC<{ delay: number; color: string; nextColor: string }> = ({ delay, color, nextColor }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const progress = spring({
        frame, fps,
        delay: delay * fps,
        config: { damping: 18, stiffness: 120 },
    });

    // The line draws itself from left to right
    const lineWidth = interpolate(progress, [0, 1], [0, 56]);

    // Chevron fades in slightly after the line
    const chevronOpacity = interpolate(progress, [0.5, 1], [0, 1], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
    });

    // Subtle glow traveling along the line
    const glowX = interpolate(progress, [0, 1], [-10, 50]);

    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            height: 64, // match icon circle height
            width: 70,
            justifyContent: "center",
            position: "relative",
        }}>
            <svg width="70" height="30" viewBox="0 0 70 30" style={{ overflow: "visible" }}>
                <defs>
                    <linearGradient id={`flow-${delay}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={color} stopOpacity="0.6" />
                        <stop offset="100%" stopColor={nextColor} stopOpacity="0.9" />
                    </linearGradient>
                    {/* Glow filter */}
                    <filter id={`glow-${delay}`}>
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Background track (subtle) */}
                <line
                    x1="4" y1="15" x2="58" y2="15"
                    stroke={color} strokeWidth="1" opacity={0.15 * progress}
                    strokeLinecap="round"
                />

                {/* Animated flowing line */}
                <line
                    x1="4" y1="15"
                    x2={4 + lineWidth} y2="15"
                    stroke={`url(#flow-${delay})`}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    filter={`url(#glow-${delay})`}
                />

                {/* Traveling glow dot */}
                {progress > 0 && progress < 1 && (
                    <circle
                        cx={glowX} cy="15" r="4"
                        fill={nextColor}
                        opacity={0.6}
                        filter={`url(#glow-${delay})`}
                    />
                )}

                {/* Chevron arrowhead (›) */}
                <polyline
                    points="52,8 64,15 52,22"
                    fill="none"
                    stroke={nextColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={chevronOpacity}
                    filter={`url(#glow-${delay})`}
                />
            </svg>
        </div>
    );
};

// Floating particle
const Particle: React.FC<{
    x: number; y: number; size: number; speed: number; delay: number; color: string;
}> = ({ x, y, size, speed, delay, color }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const t = Math.max(0, frame - delay * fps);
    const yOffset = -t * (speed / fps) * 20;
    const opacity = interpolate(t, [0, 0.5 * fps, speed * fps], [0, 0.5, 0], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
    });
    return (
        <div style={{
            position: "absolute", left: `${x}%`, top: `${y}%`,
            width: size, height: size, borderRadius: "50%",
            background: color, opacity,
            transform: `translateY(${yOffset}px)`,
            boxShadow: `0 0 ${size * 2}px ${color}`,
        }} />
    );
};

export const IntroScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // ─── Logo entrance (fast) ─────────────────────────────────────
    const logoSpring = spring({
        frame, fps,
        config: { damping: 12, stiffness: 160 },
        durationInFrames: 0.8 * fps,
    });

    // ─── Title entrance ───────────────────────────────────────────
    const titleSpring = spring({
        frame, fps,
        delay: 0.3 * fps,
        config: { damping: 200 },
    });
    const titleY = interpolate(titleSpring, [0, 1], [40, 0]);

    // ─── Subtitle ─────────────────────────────────────────────────
    const subtitleSpring = spring({
        frame, fps,
        delay: 0.6 * fps,
        config: { damping: 200 },
    });

    // ─── Exit fade ────────────────────────────────────────────────
    const exitProgress = interpolate(
        frame, [3.3 * fps, 4 * fps], [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) }
    );

    // Glow pulse
    const glowPulse = interpolate(Math.sin(frame / 12), [-1, 1], [0.4, 0.9]);

    // Particles
    const particles = [
        { x: 12, y: 85, size: 4, speed: 6, delay: 0.2, color: COLORS.accentPurple },
        { x: 30, y: 90, size: 3, speed: 8, delay: 0.5, color: COLORS.accentBlue },
        { x: 50, y: 80, size: 5, speed: 5, delay: 0.1, color: COLORS.accentCyan },
        { x: 70, y: 88, size: 3, speed: 7, delay: 0.8, color: COLORS.accentGreen },
        { x: 88, y: 82, size: 4, speed: 6, delay: 0.4, color: COLORS.accentPink },
        { x: 22, y: 75, size: 3, speed: 9, delay: 1.0, color: COLORS.accentOrange },
        { x: 60, y: 78, size: 4, speed: 5, delay: 1.2, color: COLORS.accentPurple },
        { x: 80, y: 72, size: 3, speed: 7, delay: 0.6, color: COLORS.accentBlue },
    ];

    return (
        <AbsoluteFill>
            {/* Background */}
            <AbsoluteFill style={{
                background: `linear-gradient(140deg, ${COLORS.gradientStart} 0%, ${COLORS.gradientMid} 50%, ${COLORS.gradientEnd} 100%)`,
            }}>
                <div style={{
                    position: "absolute", width: "100%", height: "100%",
                    background: `radial-gradient(circle at 35% 35%, ${COLORS.glowPurple} 0%, transparent 50%),
                       radial-gradient(circle at 65% 65%, ${COLORS.glowBlue} 0%, transparent 50%)`,
                }} />
            </AbsoluteFill>

            {/* Particles */}
            {particles.map((p, i) => <Particle key={i} {...p} />)}

            {/* Content */}
            <div style={{
                opacity: 1 - exitProgress,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                width: "100%", height: "100%",
                gap: 20,
            }}>
                {/* Logo + Title row */}
                <div style={{
                    display: "flex", alignItems: "center", gap: 20,
                    transform: `scale(${logoSpring})`,
                }}>
                    <div style={{
                        width: 80, height: 80,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        filter: `drop-shadow(0 0 ${20 * glowPulse}px ${COLORS.accentCyan}80) drop-shadow(0 0 ${40 * glowPulse}px ${COLORS.accentCyan}40)`,
                    }}>
                        <img
                            src={staticFile("icon.svg")}
                            style={{ width: 76, height: 76, objectFit: "contain" }}
                        />
                    </div>
                    <div style={{
                        fontFamily: FONTS.heading, fontSize: 56, fontWeight: 800,
                        opacity: titleSpring,
                        transform: `translateY(${titleY}px)`,
                    }}>
                        <span style={{
                            background: `linear-gradient(135deg, ${COLORS.textWhite} 0%, ${COLORS.accentPurple} 60%, ${COLORS.accentCyan} 100%)`,
                            backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                        }}>
                            Visual Agentic Dev
                        </span>
                    </div>
                </div>

                {/* Subtitle */}
                <div style={{
                    fontFamily: FONTS.heading, fontSize: 22, fontWeight: 400,
                    color: COLORS.textGray,
                    opacity: subtitleSpring,
                    marginBottom: 12,
                }}>
                    Immersive Browser Development Environment
                </div>

                {/* ═══ Step-by-step tagline ═══ */}
                <div style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 16,
                    marginTop: 8,
                }}>
                    <StepPill label="Click" icon="🖱️" color={COLORS.accentCyan} delay={1.0} index={0} />
                    <StepArrow delay={1.2} color={COLORS.accentCyan} nextColor={COLORS.accentPurple} />
                    <StepPill label="Locate" icon="📍" color={COLORS.accentPurple} delay={1.4} index={1} />
                    <StepArrow delay={1.6} color={COLORS.accentPurple} nextColor={COLORS.accentBlue} />
                    <StepPill label="Agent Edit" icon="🤖" color={COLORS.accentBlue} delay={1.8} index={2} />
                    <StepArrow delay={2.0} color={COLORS.accentBlue} nextColor={COLORS.accentGreen} />
                    <StepPill label="Done ✨" icon="🚀" color={COLORS.accentGreen} delay={2.2} index={3} />
                </div>
            </div>
        </AbsoluteFill>
    );
};
