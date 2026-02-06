"use client";

import { useState, useEffect, CSSProperties } from "react";
import { CLIFrame, CLISection } from "./CLIFrame";

const bootMessages = [
  { text: "KYRIKU v1.0", type: "header" },
  { text: "A project for Ana, by Guli", type: "subtitle" },
  { text: "", type: "spacer" },
  { text: "Initializing renderer", type: "ok" },
  { text: "Fetching core memories", type: "ok" },
  { text: "Loading WebGL context", type: "ok" },
  { text: "Calibrating flux capacitor", type: "ok" },
  { text: "Reticulating splines", type: "ok" },
  { text: "Preparing gaussian splat decoder", type: "ok" },
  { text: "Warming up the pixels", type: "ok" },
  { text: "Convincing electrons to cooperate", type: "ok" },
  { text: "Celebrating 2 years together", type: "ok" },
  { text: "Loading 3D memories", type: "ok" },
];

const MESSAGE_DELAY = 180; // ms between each message

interface CLILoaderProps {
  onReady?: () => void;
  isMobile?: boolean;
}

export function CLILoader({ onReady, isMobile }: CLILoaderProps) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [cursor, setCursor] = useState(true);
  const [dots, setDots] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  // Reveal boot messages one by one
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    bootMessages.forEach((_, index) => {
      const timer = setTimeout(() => {
        setVisibleLines(index + 1);
      }, index * MESSAGE_DELAY);
      timers.push(timer);
    });

    // Mark as complete after all messages + a small delay
    const completeTimer = setTimeout(
      () => {
        setIsComplete(true);
      },
      bootMessages.length * MESSAGE_DELAY + 500,
    );
    timers.push(completeTimer);

    return () => timers.forEach(clearTimeout);
  }, []);

  // Blinking cursor
  useEffect(() => {
    const interval = setInterval(() => {
      setCursor((prev) => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  // Animated dots for loading
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // Handle enter key press or double tap on mobile
  useEffect(() => {
    if (!isComplete || !onReady) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        onReady();
      }
    };

    let lastTap = 0;
    let wasMultiTouch = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        wasMultiTouch = true;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // Ignore if other fingers still down
      if (e.touches.length > 0) return;

      // Ignore multi-touch gestures
      if (wasMultiTouch) {
        wasMultiTouch = false;
        lastTap = 0;
        return;
      }

      const now = Date.now();
      const timeSinceLastTap = now - lastTap;

      if (timeSinceLastTap > 50 && timeSinceLastTap < 250) {
        onReady();
        lastTap = 0;
      } else {
        lastTap = now;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    if (isMobile) {
      window.addEventListener("touchstart", handleTouchStart);
      window.addEventListener("touchend", handleTouchEnd);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (isMobile) {
        window.removeEventListener("touchstart", handleTouchStart);
        window.removeEventListener("touchend", handleTouchEnd);
      }
    };
  }, [isComplete, onReady, isMobile]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000",
      }}
    >
      <CLIFrame style={{ minWidth: "340px", maxWidth: "400px" }}>
        <CLISection noBorderTop>
          <div
            style={{
              marginBottom: "0.5rem",
              opacity: 0.5,
              fontSize: "0.65rem",
            }}
          >
            {">"} BOOT SEQUENCE
          </div>

          {bootMessages.slice(0, visibleLines).map((msg, index) => {
            if (msg.type === "spacer") {
              return <div key={index} style={{ height: "0.5rem" }} />;
            }
            if (msg.type === "header") {
              return (
                <div
                  key={index}
                  style={{ fontWeight: "bold", marginBottom: "0.15rem" }}
                >
                  {msg.text}
                </div>
              );
            }
            if (msg.type === "subtitle") {
              return (
                <div
                  key={index}
                  style={{
                    opacity: 0.6,
                    fontSize: "0.75rem",
                    marginBottom: "0.25rem",
                  }}
                >
                  {msg.text}
                </div>
              );
            }
            return (
              <div
                key={index}
                style={{
                  marginBottom: "0.15rem",
                  opacity: 0.7,
                  fontSize: "0.75rem",
                }}
              >
                <span style={{ color: "var(--amber)", opacity: 0.8 }}>
                  [OK]
                </span>{" "}
                {msg.text}
              </div>
            );
          })}

          {visibleLines >= bootMessages.length && !isComplete && (
            <div style={{ marginTop: "0.5rem", fontSize: "0.75rem" }}>
              <span style={{ opacity: 0.7 }}>{">"}</span> Finalizing{dots}
              <span style={{ opacity: cursor ? 1 : 0 }}>_</span>
            </div>
          )}
        </CLISection>

        <CLISection>
          {!isComplete ? (
            <div
              style={{
                height: "2px",
                background: "var(--amber-dim)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  height: "100%",
                  width: "30%",
                  background: "var(--amber)",
                  animation: "cliLoadingBar 1.5s ease-in-out infinite",
                }}
              />
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                fontSize: "0.75rem",
                opacity: cursor ? 1 : 0.3,
                transition: "opacity 0.1s",
              }}
            >
              {isMobile ? "DOUBLE TAP TO ENTER" : "PRESS ENTER TO CONTINUE"}
            </div>
          )}
          <style>{`
            @keyframes cliLoadingBar {
              0% { transform: translateX(-100%); }
              50% { transform: translateX(330%); }
              100% { transform: translateX(-100%); }
            }
          `}</style>
        </CLISection>
      </CLIFrame>
    </div>
  );
}

// Minimal loader for between splats
interface CLIMiniLoaderProps {
  visible?: boolean;
  style?: CSSProperties;
}

export function CLIMiniLoader({ visible = true, style }: CLIMiniLoaderProps) {
  const [dots, setDots] = useState("");
  const [cursor, setCursor] = useState(true);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setCursor((prev) => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        zIndex: 50,
        ...style,
      }}
    >
      <CLIFrame style={{ minWidth: "200px" }}>
        <CLISection noBorderTop>
          <div style={{ fontSize: "0.75rem", textAlign: "center" }}>
            Loading splat{dots}
            <span style={{ opacity: cursor ? 1 : 0 }}>_</span>
          </div>
        </CLISection>
      </CLIFrame>
    </div>
  );
}
