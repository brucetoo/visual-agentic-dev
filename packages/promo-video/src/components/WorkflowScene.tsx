import React from "react";
import {
    AbsoluteFill,
    interpolate,
    spring,
    useCurrentFrame,
    useVideoConfig,
    Easing,
} from "remotion";
import { COLORS, FONTS } from "../design-tokens";

/**
 * Detailed workflow scene — 41 seconds, FULL SCREEN layout.
 * Each step has 3-4 seconds of breathing time so users can read clearly.
 * Video ends at "Done ✨" — no fade-out, no extra content.
 */

// ═══ Click Indicator ═══
const ClickIndicator: React.FC<{
    x: number; y: number;
    clickAt: number;
    duration?: number;
}> = ({ x, y, clickAt, duration = 1.2 }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const t = interpolate(
        frame, [clickAt * fps, (clickAt + duration) * fps], [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    if (t <= 0 || t >= 1) return null;
    return (
        <>
            <div style={{
                position: "absolute",
                left: x - 40 * t, top: y - 40 * t,
                width: 80 * t, height: 80 * t,
                borderRadius: "50%",
                border: `3px solid ${COLORS.accentCyan}`,
                opacity: 1 - t, zIndex: 610,
            }} />
            <div style={{
                position: "absolute",
                left: x - 20 * t, top: y - 20 * t,
                width: 40 * t, height: 40 * t,
                borderRadius: "50%",
                background: `${COLORS.accentCyan}30`,
                border: `2px solid ${COLORS.accentCyan}80`,
                opacity: 1 - t * 0.6, zIndex: 611,
            }} />
            <div style={{
                position: "absolute",
                left: x - 4, top: y - 4, width: 8, height: 8,
                borderRadius: "50%",
                background: COLORS.accentCyan,
                opacity: interpolate(t, [0, 0.3, 1], [0, 1, 0]),
                boxShadow: `0 0 16px ${COLORS.accentCyan}`,
                zIndex: 612,
            }} />
            <div style={{
                position: "absolute", left: x + 20, top: y - 28,
                opacity: interpolate(t, [0, 0.15, 0.7, 1], [0, 1, 1, 0]),
                transform: `scale(${interpolate(t, [0, 0.15], [0.5, 1], { extrapolateRight: "clamp" })})`,
                zIndex: 620,
            }}>
                <div style={{
                    background: COLORS.accentCyan, color: "#000",
                    fontFamily: FONTS.heading, fontSize: 12, fontWeight: 800,
                    padding: "3px 10px", borderRadius: 6, letterSpacing: 1,
                }}>CLICK</div>
            </div>
        </>
    );
};

// ═══ Callout — label with arrow from edge to target ═══
const Callout: React.FC<{
    text: string;
    labelX: number; labelY: number;
    targetX: number; targetY: number;
    showAt: number; hideAt: number;
    color?: string;
}> = ({ text, labelX, labelY, targetX, targetY, showAt, hideAt, color = COLORS.accentCyan }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const showProgress = spring({
        frame, fps, delay: showAt * fps,
        config: { damping: 14, stiffness: 120 },
    });
    const hideProgress = interpolate(
        frame, [(hideAt - 0.3) * fps, hideAt * fps], [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    const opacity = showProgress * (1 - hideProgress);
    if (opacity <= 0.01) return null;

    const scale = interpolate(showProgress, [0, 1], [0.85, 1]);
    const estLabelW = text.length * 10.5 + 44;
    const estLabelH = 48;
    const labelLeft = labelX - estLabelW / 2;
    const labelRight = labelX + estLabelW / 2;
    const labelTop = labelY - estLabelH / 2;
    const labelBottom = labelY + estLabelH / 2;

    let arrowStartX = labelX;
    let arrowStartY = labelY;
    const dx = targetX - labelX;
    const dy = targetY - labelY;
    if (Math.abs(dx) > Math.abs(dy)) {
        arrowStartX = dx > 0 ? labelRight : labelLeft;
        arrowStartY = Math.max(labelTop, Math.min(labelBottom, targetY));
    } else {
        arrowStartY = dy > 0 ? labelBottom : labelTop;
        arrowStartX = Math.max(labelLeft, Math.min(labelRight, targetX));
    }

    return (
        <>
            <svg style={{
                position: "absolute", left: 0, top: 0,
                width: "100%", height: "100%",
                pointerEvents: "none", zIndex: 500, opacity,
            }}>
                <line
                    x1={arrowStartX} y1={arrowStartY}
                    x2={targetX} y2={targetY}
                    stroke={color} strokeWidth="2"
                    strokeDasharray="6 3" opacity={0.6}
                />
            </svg>
            <div style={{
                position: "absolute",
                left: targetX - 6, top: targetY - 6,
                width: 12, height: 12, borderRadius: "50%",
                background: color, opacity, zIndex: 502,
                boxShadow: `0 0 14px ${color}`,
            }} />
            <div style={{
                position: "absolute",
                left: targetX - 18, top: targetY - 18,
                width: 36, height: 36, borderRadius: "50%",
                border: `2px solid ${color}50`,
                opacity: opacity * 0.5, zIndex: 499,
                transform: `scale(${1 + Math.sin(frame / 8) * 0.2})`,
            }} />
            <div style={{
                position: "absolute",
                left: labelX - estLabelW / 2, top: labelY - estLabelH / 2,
                transform: `scale(${scale})`, opacity, zIndex: 510,
                whiteSpace: "nowrap",
            }}>
                <div style={{
                    background: "rgba(0,0,0,0.8)",
                    border: `2px solid ${color}`,
                    borderRadius: 12, padding: "10px 20px",
                    fontFamily: FONTS.heading, fontSize: 20, fontWeight: 700,
                    color, backdropFilter: "blur(8px)",
                    boxShadow: `0 0 30px ${color}40, inset 0 0 20px ${color}10`,
                }}>{text}</div>
            </div>
        </>
    );
};

// ═══ Animated cursor ═══
const Cursor: React.FC<{
    startX: number; startY: number;
    endX: number; endY: number;
    moveStart: number; moveEnd: number;
    clickAt: number; hideAt?: number;
}> = ({ startX, startY, endX, endY, moveStart, moveEnd, clickAt, hideAt }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const moveProgress = interpolate(
        frame, [moveStart * fps, moveEnd * fps], [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) }
    );
    const x = interpolate(moveProgress, [0, 1], [startX, endX]);
    const y = interpolate(moveProgress, [0, 1], [startY, endY]);
    const showOpacity = interpolate(
        frame, [(moveStart - 0.15) * fps, moveStart * fps], [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    const hideOpacity = hideAt
        ? interpolate(frame, [hideAt * fps, (hideAt + 0.2) * fps], [1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
        : 1;
    return (
        <div style={{
            position: "absolute", left: x, top: y,
            opacity: showOpacity * hideOpacity, zIndex: 600,
        }}>
            <svg width="28" height="28" viewBox="0 0 24 24">
                <path d="M4 1L4 19 L9 14 L15 14Z" fill="white" stroke="#222" strokeWidth="1.5" />
            </svg>
        </div>
    );
};

// ═══ Hover highlight ═══
const HoverHighlight: React.FC<{
    x: number; y: number; w: number; h: number;
    showAt: number; hideAt?: number; label?: string;
}> = ({ x, y, w, h, showAt, hideAt, label }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const show = interpolate(frame, [showAt * fps, (showAt + 0.15) * fps], [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const hide = hideAt
        ? interpolate(frame, [hideAt * fps, (hideAt + 0.15) * fps], [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
        : 0;
    const opacity = show * (1 - hide);
    return (
        <div style={{
            position: "absolute", left: x, top: y, width: w, height: h,
            border: `2px solid ${COLORS.accentCyan}`, borderRadius: 6,
            opacity, background: `${COLORS.accentCyan}08`,
            boxShadow: `0 0 16px ${COLORS.accentCyan}30, inset 0 0 16px ${COLORS.accentCyan}06`,
            zIndex: 50,
        }}>
            {label && (
                <div style={{
                    position: "absolute", top: -24, left: 0,
                    background: COLORS.accentCyan, color: "#000",
                    fontSize: 11, fontFamily: FONTS.mono, fontWeight: 700,
                    padding: "2px 10px", borderRadius: 5, opacity, whiteSpace: "nowrap",
                }}>{label}</div>
            )}
        </div>
    );
};

// ═════════════════════════════════════════════════════════════════
// MAIN SCENE — 34 seconds, ends right after "Done" appears
// ═════════════════════════════════════════════════════════════════
export const WorkflowScene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // ─── Phase timings (each step ~3s visibility, total 34s) ────
    const P = {
        browserAppear: 0.3,
        sidebarAppear: 0.6,
        statusConnect: 1.2,
        projectDetected: 1.6,

        inspectClick: 3.0,         // ① inspect mode (3s → 6s)

        hoverElement1: 6.0,        // ② click element 1 (6s → 9.5s)
        clickElement1: 7.0,
        sourceInfoAppear: 7.5,

        hoverElement2: 9.5,        // click element 2 (9.5s → 12s)
        clickElement2: 10.5,
        sourceInfo2Appear: 11.0,

        promptGenerate: 13.0,      // ④ prompt auto-gen (13s → 18s)

        taskInput: 18.0,           // ⑤ user types task (18s → 22s)

        agentWorking: 22.0,        // ⑥ agent processing (22s → 26s)
        codeChanging: 25.0,

        liveResult: 27.0,          // ⑦ live result (27s → 31s)

        celebration: 31.0,         // Done appears at 31s, video ends at 34s
    };

    // ─── Layout constants ────────────────────────────────────────
    const SIDEBAR_X = 1520;
    const TODO1_Y = 124;
    const TODO3_Y = 256;
    const INSPECT_BTN_X = SIDEBAR_X + 338;
    const INSPECT_BTN_Y = 23;

    // ─── Animations ──────────────────────────────────────────────
    const browserSpring = spring({ frame, fps, delay: P.browserAppear * fps, config: { damping: 200 } });
    const sidebarSpring = spring({ frame, fps, delay: P.sidebarAppear * fps, config: { damping: 200 } });
    const sidebarXOffset = interpolate(sidebarSpring, [0, 1], [50, 0]);

    const statusProgress = interpolate(frame, [P.statusConnect * fps, (P.statusConnect + 0.3) * fps], [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const projectPathProgress = spring({ frame, fps, delay: P.projectDetected * fps, config: { damping: 200 } });

    const inspectActive = frame >= P.inspectClick * fps;
    const inspectPulse = inspectActive ? interpolate(Math.sin((frame - P.inspectClick * fps) / 8), [-1, 1], [0.7, 1]) : 0;

    const sourceInfoProgress = spring({ frame, fps, delay: P.sourceInfoAppear * fps, config: { damping: 200 } });
    const sourceInfo2Progress = spring({ frame, fps, delay: P.sourceInfo2Appear * fps, config: { damping: 200 } });

    // Terminal prompt
    const promptLines = [
        "You need to help me modify the code.",
        "",
        "## Target Location (2 items)",
        "1. File: src/components/TodoItem.tsx:24",
        "   - Element: <div.todo-item>",
        '   - Content: "Buy groceries"',
        "2. File: src/components/TodoItem.tsx:38",
        "   - Element: <button.delete-btn>",
        '   - Content: "Delete"',
        "",
        "## Task",
    ];
    const totalPromptText = promptLines.join("\n");
    const promptTypedChars = Math.min(totalPromptText.length,
        Math.max(0, Math.floor((frame - P.promptGenerate * fps) * 2.5)));
    const displayedPrompt = totalPromptText.slice(0, promptTypedChars);

    // Task input
    const taskText = "Add a completed state toggle with line-through style and opacity 0.6";
    const taskTypedChars = Math.min(taskText.length,
        Math.max(0, Math.floor((frame - P.taskInput * fps) * 1.5)));
    const displayedTask = taskText.slice(0, taskTypedChars);

    // Agent / code / result
    const agentProgress = interpolate(frame, [P.agentWorking * fps, P.codeChanging * fps], [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const spinAngle = frame >= P.agentWorking * fps ? ((frame - P.agentWorking * fps) * 8) % 360 : 0;
    const codeChangeProgress = spring({ frame, fps, delay: P.codeChanging * fps, config: { damping: 200 } });
    const liveResultProgress = spring({ frame, fps, delay: P.liveResult * fps, config: { damping: 14, stiffness: 100 } });
    const celebrationProgress = spring({ frame, fps, delay: P.celebration * fps, config: { damping: 12, stiffness: 80 } });

    const cursorBlink = interpolate(frame % Math.round(fps * 0.6), [0, fps * 0.3, fps * 0.6], [1, 0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

    return (
        <AbsoluteFill style={{ background: "#0a0a15" }}>
            {/* Ambient */}
            <div style={{
                position: "absolute", width: "100%", height: "100%",
                background: `radial-gradient(ellipse at 25% 30%, rgba(168,85,247,0.06) 0%, transparent 60%),
                     radial-gradient(ellipse at 80% 70%, rgba(59,130,246,0.05) 0%, transparent 50%)`,
            }} />

            {/* ═══ Full screen layout ═══ */}
            <div style={{
                display: "flex", width: "100%", height: "100%",
                position: "relative",
            }}>

                {/* ── Browser ── */}
                <div style={{
                    flex: 1, opacity: browserSpring,
                    display: "flex", flexDirection: "column", overflow: "hidden",
                }}>
                    {/* Chrome bar */}
                    <div style={{
                        background: "#1a1a2e", padding: "8px 14px",
                        display: "flex", alignItems: "center", gap: 8,
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                    }}>
                        <div style={{ display: "flex", gap: 5 }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ffbd2e" }} />
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c940" }} />
                        </div>
                        <div style={{
                            flex: 1, marginLeft: 8,
                            background: "rgba(255,255,255,0.05)", borderRadius: 7,
                            padding: "4px 14px",
                            fontFamily: FONTS.mono, fontSize: 12, color: COLORS.textMuted, textAlign: "center",
                        }}>🔒 localhost:3000</div>
                    </div>

                    {/* Page content */}
                    <div style={{
                        flex: 1, background: "#0d0d1e",
                        position: "relative", overflow: "hidden",
                    }}>
                        {/* App header */}
                        <div style={{
                            background: "rgba(255,255,255,0.02)",
                            padding: "12px 28px",
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{
                                    width: 30, height: 30, borderRadius: 8,
                                    background: `linear-gradient(135deg, ${COLORS.accentPurple}, ${COLORS.accentBlue})`,
                                }} />
                                <span style={{ fontFamily: FONTS.heading, fontSize: 18, fontWeight: 700, color: COLORS.textWhite }}>
                                    TodoApp
                                </span>
                            </div>
                            <div style={{ display: "flex", gap: 24 }}>
                                {["All", "Active", "Completed"].map(t => (
                                    <span key={t} style={{
                                        fontFamily: FONTS.heading, fontSize: 14,
                                        color: t === "All" ? COLORS.accentCyan : COLORS.textMuted,
                                        fontWeight: t === "All" ? 600 : 400,
                                    }}>{t}</span>
                                ))}
                            </div>
                        </div>

                        {/* Todo list */}
                        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 12 }}>
                            {/* Todo 1 */}
                            <div style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                padding: "16px 20px", background: "rgba(255,255,255,0.025)",
                                borderRadius: 12, position: "relative",
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                    <div style={{
                                        width: 22, height: 22, borderRadius: 7,
                                        border: `2px solid ${liveResultProgress > 0.5 ? COLORS.accentGreen : COLORS.textMuted}`,
                                        background: liveResultProgress > 0.5 ? COLORS.accentGreen : "transparent",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>
                                        {liveResultProgress > 0.5 && <span style={{ color: "white", fontSize: 13, fontWeight: 800 }}>✓</span>}
                                    </div>
                                    <span style={{
                                        fontFamily: FONTS.heading, fontSize: 16, fontWeight: 500,
                                        color: liveResultProgress > 0.5 ? COLORS.textMuted : COLORS.textWhite,
                                        textDecoration: liveResultProgress > 0.5 ? "line-through" : "none",
                                        opacity: liveResultProgress > 0.5 ? 0.6 : 1,
                                    }}>Buy groceries</span>
                                </div>
                                <div style={{
                                    fontFamily: FONTS.heading, fontSize: 13, color: "#ef4444", fontWeight: 500,
                                    padding: "5px 14px", borderRadius: 7, background: "rgba(239,68,68,0.08)",
                                }}>Delete</div>
                                <HoverHighlight x={-4} y={-4} w={1120} h={58}
                                    showAt={P.hoverElement1} hideAt={P.clickElement1 + 0.8}
                                    label="<div.todo-item> → TodoItem.tsx:24" />
                            </div>

                            {/* Todo 2 */}
                            <div style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                padding: "16px 20px", background: "rgba(255,255,255,0.025)", borderRadius: 12,
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                    <div style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${COLORS.textMuted}` }} />
                                    <span style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 500, color: COLORS.textWhite }}>
                                        Clean the house
                                    </span>
                                </div>
                                <div style={{
                                    fontFamily: FONTS.heading, fontSize: 13, color: "#ef4444", fontWeight: 500,
                                    padding: "5px 14px", borderRadius: 7, background: "rgba(239,68,68,0.08)",
                                }}>Delete</div>
                            </div>

                            {/* Todo 3 */}
                            <div style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                padding: "16px 20px", background: "rgba(255,255,255,0.025)",
                                borderRadius: 12, position: "relative",
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                    <div style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${COLORS.textMuted}` }} />
                                    <span style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 500, color: COLORS.textWhite }}>
                                        Read a book
                                    </span>
                                </div>
                                <div style={{
                                    fontFamily: FONTS.heading, fontSize: 13, color: "#ef4444", fontWeight: 500,
                                    padding: "5px 14px", borderRadius: 7, background: "rgba(239,68,68,0.08)",
                                    position: "relative",
                                }}>
                                    Delete
                                    <HoverHighlight x={-4} y={-4} w={72} h={34}
                                        showAt={P.hoverElement2} hideAt={P.clickElement2 + 0.8}
                                        label="<button.delete-btn> → TodoItem.tsx:38" />
                                </div>
                            </div>

                            {/* Add input */}
                            <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
                                <div style={{
                                    flex: 1, padding: "14px 18px",
                                    background: "rgba(255,255,255,0.03)",
                                    border: "1px solid rgba(255,255,255,0.06)",
                                    borderRadius: 10,
                                    fontFamily: FONTS.heading, fontSize: 15, color: COLORS.textMuted,
                                }}>What needs to be done?</div>
                                <div style={{
                                    padding: "14px 24px",
                                    background: `linear-gradient(135deg, ${COLORS.accentPurple}, ${COLORS.accentBlue})`,
                                    borderRadius: 10,
                                    fontFamily: FONTS.heading, fontSize: 15, fontWeight: 600, color: "white",
                                }}>Add</div>
                            </div>
                        </div>

                        {/* Cursors */}
                        <Cursor startX={600} startY={400} endX={500} endY={TODO1_Y - 34}
                            moveStart={P.hoverElement1 - 0.5} moveEnd={P.hoverElement1}
                            clickAt={P.clickElement1} hideAt={P.hoverElement2 - 0.5} />
                        <Cursor startX={500} startY={TODO1_Y - 34} endX={1440} endY={TODO3_Y - 34}
                            moveStart={P.hoverElement2 - 0.5} moveEnd={P.hoverElement2}
                            clickAt={P.clickElement2} hideAt={P.clickElement2 + 1.5} />

                        {/* Click indicators */}
                        <ClickIndicator x={504} y={TODO1_Y - 30} clickAt={P.clickElement1} />
                        <ClickIndicator x={1440} y={TODO3_Y - 34} clickAt={P.clickElement2} />

                        {/* Live result flash */}
                        {liveResultProgress > 0 && liveResultProgress < 0.8 && (
                            <div style={{
                                position: "absolute", inset: 0,
                                background: `radial-gradient(circle at 50% 20%, ${COLORS.accentGreen}12 0%, transparent 50%)`,
                                opacity: interpolate(liveResultProgress, [0, 0.3, 1], [0, 0.6, 0]),
                            }} />
                        )}
                    </div>
                </div>

                {/* ── Sidebar ── */}
                <div style={{
                    width: 400, opacity: sidebarSpring,
                    transform: `translateX(${sidebarXOffset}px)`,
                    background: "#111120",
                    borderLeft: "1px solid rgba(255,255,255,0.06)",
                    display: "flex", flexDirection: "column",
                    overflow: "hidden", flexShrink: 0,
                    boxShadow: "-4px 0 40px rgba(0,0,0,0.4)",
                }}>
                    {/* Header */}
                    <div style={{
                        padding: "10px 14px",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                        background: "rgba(255,255,255,0.015)",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <span style={{ fontSize: 14 }}>🎨</span>
                            <span style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, color: COLORS.textWhite }}>
                                Visual Agentic Dev
                            </span>
                            <div style={{
                                width: 7, height: 7, borderRadius: "50%",
                                background: statusProgress > 0.5 ? COLORS.accentGreen : COLORS.textMuted,
                                boxShadow: statusProgress > 0.5 ? `0 0 8px ${COLORS.accentGreen}` : "none",
                            }} />
                        </div>
                        <div style={{ display: "flex", gap: 3 }}>
                            {["🔌", "🚀", "🧹"].map((e, i) => (
                                <div key={i} style={{
                                    width: 26, height: 26, borderRadius: 6,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 12, background: "rgba(255,255,255,0.04)",
                                }}>{e}</div>
                            ))}
                            <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.08)", margin: "4px 3px" }} />
                            <div style={{
                                width: 26, height: 26, borderRadius: 6,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 12,
                                background: inspectActive ? `rgba(6,182,212,${0.12 + inspectPulse * 0.08})` : "rgba(255,255,255,0.04)",
                                border: inspectActive ? `1px solid ${COLORS.accentCyan}30` : "1px solid transparent",
                            }}>{inspectActive ? "🎯" : "🔍"}</div>
                            <div style={{
                                width: 26, height: 26, borderRadius: 6,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 12, background: "rgba(255,255,255,0.04)",
                            }}>⚙️</div>
                        </div>
                    </div>

                    {/* Project path */}
                    <div style={{
                        padding: "5px 14px", opacity: projectPathProgress,
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}>
                        <div style={{
                            fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textMuted,
                            display: "flex", alignItems: "center", gap: 5,
                        }}>
                            <span style={{ color: COLORS.accentGreen }}>●</span>
                            ~/projects/my-todo-app
                        </div>
                    </div>

                    {/* SourceInfo */}
                    <div style={{
                        overflow: "hidden",
                        maxHeight: interpolate(sourceInfoProgress, [0, 1], [0, 130]),
                        opacity: sourceInfoProgress,
                        borderBottom: sourceInfoProgress > 0 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    }}>
                        <div style={{ padding: "7px 14px", display: "flex", flexDirection: "column", gap: 5 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span style={{
                                    fontFamily: FONTS.heading, fontSize: 10, fontWeight: 600,
                                    color: COLORS.textGray, textTransform: "uppercase", letterSpacing: 0.5,
                                }}>Selected ({sourceInfo2Progress > 0.5 ? 2 : 1})</span>
                                <span style={{ fontFamily: FONTS.heading, fontSize: 9, color: COLORS.accentCyan }}>Clear all</span>
                            </div>
                            <div style={{
                                background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.12)",
                                borderRadius: 7, padding: "5px 9px",
                                display: "flex", alignItems: "center", gap: 6,
                            }}>
                                <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: COLORS.accentCyan }}>📍</span>
                                <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: COLORS.textGray, flex: 1 }}>
                                    TodoItem.tsx:24 <span style={{ color: COLORS.textMuted }}>• "Buy groceries"</span>
                                </span>
                                <span style={{ fontSize: 9, color: COLORS.textMuted }}>✕</span>
                            </div>
                            <div style={{
                                background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.12)",
                                borderRadius: 7, padding: "5px 9px",
                                display: "flex", alignItems: "center", gap: 6,
                                opacity: sourceInfo2Progress,
                                transform: `translateY(${interpolate(sourceInfo2Progress, [0, 1], [8, 0])}px)`,
                            }}>
                                <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: COLORS.accentCyan }}>📍</span>
                                <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: COLORS.textGray, flex: 1 }}>
                                    TodoItem.tsx:38 <span style={{ color: COLORS.textMuted }}>• "Delete"</span>
                                </span>
                                <span style={{ fontSize: 9, color: COLORS.textMuted }}>✕</span>
                            </div>
                        </div>
                    </div>

                    {/* Terminal */}
                    <div style={{ flex: 1, padding: "8px 14px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                        <div style={{
                            flex: 1, background: "rgba(0,0,0,0.35)", borderRadius: 8,
                            padding: 9, fontFamily: FONTS.mono, fontSize: 10, lineHeight: 1.55,
                            overflow: "hidden", border: "1px solid rgba(255,255,255,0.04)",
                        }}>
                            <div style={{ color: COLORS.textMuted, marginBottom: 3 }}>
                                <span style={{ color: COLORS.accentGreen }}>❯</span> ccr code
                            </div>
                            <div style={{ color: COLORS.textMuted, marginBottom: 6 }}>
                                <span style={{ color: COLORS.accentGreen }}>✓</span> Agent ready. Waiting for task...
                            </div>

                            {frame >= P.promptGenerate * fps && (
                                <div>
                                    {displayedPrompt.split("\n").map((line, i) => (
                                        <div key={i} style={{
                                            color: line.startsWith("##") ? COLORS.accentPurple
                                                : line.startsWith("   -") ? COLORS.accentCyan
                                                    : line.match(/^\d\./) ? COLORS.accentOrange : COLORS.textGray,
                                            fontWeight: line.startsWith("##") ? 700 : 400,
                                            minHeight: 13,
                                        }}>{line || "\u00A0"}</div>
                                    ))}
                                </div>
                            )}

                            {frame >= P.taskInput * fps && (
                                <div style={{ color: COLORS.accentGreen, marginTop: 1 }}>
                                    {displayedTask}
                                    {taskTypedChars < taskText.length && (
                                        <span style={{
                                            display: "inline-block", width: 5, height: 11,
                                            background: COLORS.accentGreen, opacity: cursorBlink,
                                            marginLeft: 1, verticalAlign: "middle",
                                        }} />
                                    )}
                                </div>
                            )}

                            {agentProgress > 0 && agentProgress < 1 && (
                                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, color: COLORS.accentPurple }}>
                                    <div style={{
                                        width: 12, height: 12,
                                        border: `2px solid ${COLORS.accentPurple}`, borderTopColor: "transparent",
                                        borderRadius: "50%", transform: `rotate(${spinAngle}deg)`,
                                    }} />
                                    <span style={{ fontSize: 10 }}>Agent modifying code...</span>
                                </div>
                            )}

                            {codeChangeProgress > 0 && (
                                <div style={{
                                    marginTop: 5, opacity: codeChangeProgress,
                                    borderLeft: `2px solid ${COLORS.accentGreen}`, paddingLeft: 7, fontSize: 9,
                                }}>
                                    <div style={{ color: COLORS.textMuted }}>✎ Modified TodoItem.tsx</div>
                                    <div style={{ color: "#ef4444" }}>- {"<div className=\"todo-item\">"}</div>
                                    <div style={{ color: COLORS.accentGreen }}>+ {"<div className={`todo-item ${done ? 'done' : ''}`}"}</div>
                                    <div style={{ color: COLORS.accentGreen }}>+   {"onClick={() => toggle(id)}>"}</div>
                                </div>
                            )}

                            {liveResultProgress > 0.5 && (
                                <div style={{ marginTop: 6, color: COLORS.accentGreen, fontWeight: 600, fontSize: 10 }}>
                                    ✓ Changes applied. Saved 1 file.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ CALLOUT INDICATORS ═══ */}

            {/* ① Enter inspect mode */}
            <Callout
                text="① Click 🔍 to start selecting"
                labelX={SIDEBAR_X + 200} labelY={90}
                targetX={INSPECT_BTN_X} targetY={INSPECT_BTN_Y}
                showAt={P.inspectClick - 0.3}
                hideAt={P.hoverElement1}
                color={COLORS.accentCyan}
            />

            {/* ② Click element → source located */}
            <Callout
                text="② Click element → source located"
                labelX={500} labelY={500}
                targetX={500} targetY={TODO1_Y}
                showAt={P.hoverElement1}
                hideAt={P.hoverElement2 - 0.5}
                color={COLORS.accentPurple}
            />

            {/* ③ Source info detected in sidebar */}
            <Callout
                text="③ Source info auto-detected"
                labelX={1280} labelY={150}
                targetX={SIDEBAR_X + 14} targetY={150}
                showAt={P.sourceInfo2Appear + 0.3}
                hideAt={P.promptGenerate}
                color={COLORS.accentOrange}
            />

            {/* ④ Prompt auto-generated in terminal */}
            <Callout
                text="④ Prompt auto-generated"
                labelX={760} labelY={500}
                targetX={SIDEBAR_X + 14} targetY={500}
                showAt={P.promptGenerate + 0.5}
                hideAt={P.taskInput}
                color={COLORS.accentBlue}
            />

            {/* ⑤ User describes changes */}
            <Callout
                text="⑤ Describe what you want"
                labelX={760} labelY={650}
                targetX={SIDEBAR_X + 14} targetY={700}
                showAt={P.taskInput + 0.3}
                hideAt={P.agentWorking}
                color={COLORS.accentGreen}
            />

            {/* ⑥ AI agent working */}
            <Callout
                text="⑥ AI agent modifying code"
                labelX={760} labelY={750}
                targetX={SIDEBAR_X + 14} targetY={770}
                showAt={P.agentWorking + 0.3}
                hideAt={P.liveResult}
                color={COLORS.accentPurple}
            />

            {/* ⑦ Changes applied live */}
            <Callout
                text="⑦ Changes applied LIVE!"
                labelX={500} labelY={600}
                targetX={300} targetY={TODO1_Y}
                showAt={P.liveResult + 0.3}
                hideAt={P.celebration}
                color={COLORS.accentGreen}
            />

            {/* ═══ Final "Done" — no GitHub, video ends here ═══ */}
            {celebrationProgress > 0 && (
                <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    pointerEvents: "none", zIndex: 700,
                }}>
                    <div style={{
                        opacity: interpolate(celebrationProgress, [0, 0.5, 1], [0, 1, 1]),
                        transform: `scale(${interpolate(celebrationProgress, [0, 1], [0.5, 1])})`,
                        background: "rgba(0,0,0,0.8)",
                        backdropFilter: "blur(16px)",
                        borderRadius: 28,
                        padding: "44px 80px",
                        textAlign: "center",
                        border: `1px solid ${COLORS.cardBorder}`,
                        boxShadow: `0 0 120px ${COLORS.glowPurple}`,
                    }}>
                        <div style={{
                            fontFamily: FONTS.heading, fontSize: 60, fontWeight: 800,
                            background: `linear-gradient(135deg, ${COLORS.accentGreen}, ${COLORS.accentCyan})`,
                            backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                        }}>
                            Done ✨
                        </div>
                        <div style={{
                            fontFamily: FONTS.heading, fontSize: 22, color: COLORS.textGray, marginTop: 14,
                        }}>
                            Click → Locate → Agent Edit → Ship
                        </div>
                    </div>
                </div>
            )}
        </AbsoluteFill>
    );
};
