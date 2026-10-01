"use client";

import { useEffect, useRef, useCallback } from "react";

export interface ItemTelemetry {
  itemId: string;
  firstInputLatencyMs: number | null;
  activeDwellTimeMs: number;
  scrollReversalsYFlips: number;
  focusOutCount: number;
  focusOutDurationMs: number;
  answerRevisions: number;
  qualityFlags: string[];
}

interface UseTelemetryOptions {
  itemId: string;
  prompt: string;
}

export function useTelemetry({ itemId, prompt }: UseTelemetryOptions) {
  const mountTimeRef = useRef<number>(0);
  const firstInputTimestampRef = useRef<number | null>(null);

  // Active dwell time tracking
  const activeDwellTimeRef = useRef<number>(0);
  const lastActiveTimestampRef = useRef<number>(0);
  const isTabActiveRef = useRef<boolean>(true);

  // Focus out tracking
  const blurTimestampRef = useRef<number | null>(null);
  const focusOutCountRef = useRef<number>(0);
  const focusOutDurationRef = useRef<number>(0);

  // Scroll tracking
  const scrollReversalsRef = useRef<number>(0);
  const lastScrollYRef = useRef<number>(0);
  const lastScrollDirectionRef = useRef<"up" | "down" | null>(null);

  // Answer revision tracking
  const hasInitialAnswerRef = useRef<boolean>(false);
  const answerRevisionsRef = useRef<number>(0);

  // Reset trackers whenever itemId changes
  const resetTrackers = useCallback(() => {
    const now = performance.now();
    mountTimeRef.current = now;
    firstInputTimestampRef.current = null;

    activeDwellTimeRef.current = 0;
    lastActiveTimestampRef.current = now;
    const isFocused = typeof document !== "undefined" && !document.hidden && document.hasFocus();
    isTabActiveRef.current = isFocused;

    blurTimestampRef.current = isFocused ? null : now;
    focusOutCountRef.current = 0;
    focusOutDurationRef.current = 0;

    scrollReversalsRef.current = 0;
    lastScrollYRef.current = typeof window !== "undefined" ? window.scrollY : 0;
    lastScrollDirectionRef.current = null;

    hasInitialAnswerRef.current = false;
    answerRevisionsRef.current = 0;
  }, []);

  // Initialize/reset on itemId change
  useEffect(() => {
    resetTrackers();
  }, [itemId, resetTrackers]);

  // First input detector (pointerdown, touchstart, keydown)
  const recordFirstInput = useCallback(() => {
    if (firstInputTimestampRef.current === null) {
      firstInputTimestampRef.current = performance.now();
    }
  }, []);

  // Listeners for first input, visibility, and scroll
  useEffect(() => {
    const handleFirstInputEvent = () => {
      recordFirstInput();
    };

    const handleVisibilityChange = () => {
      const now = performance.now();
      if (document.hidden) {
        // Tab hidden -> pause dwell time, record blur
        if (isTabActiveRef.current) {
          activeDwellTimeRef.current += now - lastActiveTimestampRef.current;
          isTabActiveRef.current = false;
          blurTimestampRef.current = now;
        }
      } else {
        // Tab visible -> resume dwell time, accumulate blur
        if (!isTabActiveRef.current) {
          if (blurTimestampRef.current !== null) {
            focusOutDurationRef.current += now - blurTimestampRef.current;
            focusOutCountRef.current += 1;
            blurTimestampRef.current = null;
          }
          lastActiveTimestampRef.current = now;
          isTabActiveRef.current = true;
        }
      }
    };

    const handleWindowBlur = () => {
      const now = performance.now();
      if (isTabActiveRef.current) {
        activeDwellTimeRef.current += now - lastActiveTimestampRef.current;
        isTabActiveRef.current = false;
        blurTimestampRef.current = now;
      }
    };

    const handleWindowFocus = () => {
      const now = performance.now();
      if (!isTabActiveRef.current) {
        if (blurTimestampRef.current !== null) {
          focusOutDurationRef.current += now - blurTimestampRef.current;
          focusOutCountRef.current += 1;
          blurTimestampRef.current = null;
        }
        lastActiveTimestampRef.current = now;
        isTabActiveRef.current = true;
      }
    };

    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollYRef.current;

      // Filter out micro-jitter
      if (Math.abs(delta) >= 3) {
        if (delta > 0) {
          lastScrollDirectionRef.current = "down";
        } else if (delta < 0) {
          if (lastScrollDirectionRef.current === "down") {
            // Reversal detected: down -> up
            scrollReversalsRef.current += 1;
          }
          lastScrollDirectionRef.current = "up";
        }
        lastScrollYRef.current = currentY;
      }
    };

    window.addEventListener("pointerdown", handleFirstInputEvent, { passive: true, capture: true });
    window.addEventListener("touchstart", handleFirstInputEvent, { passive: true, capture: true });
    window.addEventListener("keydown", handleFirstInputEvent, { passive: true, capture: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", handleFirstInputEvent, { capture: true });
      window.removeEventListener("touchstart", handleFirstInputEvent, { capture: true });
      window.removeEventListener("keydown", handleFirstInputEvent, { capture: true });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [recordFirstInput]);

  // Answer revision handler
  const registerAnswerChange = useCallback(() => {
    recordFirstInput();
    if (!hasInitialAnswerRef.current) {
      hasInitialAnswerRef.current = true;
    } else {
      answerRevisionsRef.current += 1;
    }
  }, [recordFirstInput]);

  // Flush telemetry snapshot for current item
  const flushTelemetry = useCallback((): ItemTelemetry => {
    const now = performance.now();

    // Finalize dwell time calculation
    let finalActiveDwellTime = activeDwellTimeRef.current;
    if (isTabActiveRef.current) {
      finalActiveDwellTime += now - lastActiveTimestampRef.current;
    }

    let finalFocusOutDuration = focusOutDurationRef.current;
    let finalFocusOutCount = focusOutCountRef.current;
    if (!isTabActiveRef.current && blurTimestampRef.current !== null) {
      finalFocusOutDuration += now - blurTimestampRef.current;
      finalFocusOutCount += 1;
    }

    const firstInputLatencyMs =
      firstInputTimestampRef.current !== null
        ? Math.max(0, Math.round(firstInputTimestampRef.current - mountTimeRef.current))
        : null;

    const activeDwellTimeMs = Math.max(0, Math.round(finalActiveDwellTime));
    const focusOutDurationMs = Math.max(0, Math.round(finalFocusOutDuration));

    // Quality gate evaluations
    const qualityFlags: string[] = [];
    const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount > 5 && activeDwellTimeMs < 1200) {
      qualityFlags.push("speeding_suspect");
    }

    const snapshot: ItemTelemetry = {
      itemId,
      firstInputLatencyMs,
      activeDwellTimeMs,
      scrollReversalsYFlips: scrollReversalsRef.current,
      focusOutCount: finalFocusOutCount,
      focusOutDurationMs,
      answerRevisions: answerRevisionsRef.current,
      qualityFlags,
    };

    resetTrackers();
    return snapshot;
  }, [itemId, prompt, resetTrackers]);

  return {
    registerAnswerChange,
    recordFirstInput,
    flushTelemetry,
  };
}
