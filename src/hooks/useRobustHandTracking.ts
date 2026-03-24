import { useEffect, useRef } from "react";
import { useAppStore } from "../store/useAppStore";
import type { HandLandmark } from "../store/useAppStore";

type HandLandmarkerInstance = {
  detectForVideo(
    videoFrame: HTMLVideoElement,
    timestampMs: number
  ): { landmarks?: Array<Array<{ x: number; y: number; z: number }>> };
  close?: () => void;
};

type VisionModule = {
  FilesetResolver: {
    forVisionTasks(basePath: string): Promise<unknown>;
  };
  HandLandmarker: {
    createFromOptions(wasmFileset: unknown, options: unknown): Promise<HandLandmarkerInstance>;
  };
};

const PINCH_PRESS_THRESHOLD = 0.04;
const PINCH_RELEASE_THRESHOLD = 0.06;
const TIMEOUT_DESISTENCIA = 1200;
const CONFIDENCE = 0.45;
const INFERENCE_INTERVAL_MS = 33; 
const MISSED_FRAMES_TO_ABSENT = 10;

export function useRobustHandTracking(videoElement: HTMLVideoElement | null) {
  const handLandmarker = useRef<HandLandmarkerInstance | null>(null);
  const lastDetectionTime = useRef<number>(Date.now());
  const lastInferenceTime = useRef(0);
  const lastDetectTimestamp = useRef(0);
  const setHandData = useAppStore((state) => state.setHandData);
  const pinchLatched = useRef(false);
  const isHandPresentRef = useRef(false);
  const missedFramesRef = useRef(0);

  useEffect(() => {
    if (!videoElement) return;
    let animationFrameId = 0;
    let isActive = true;

    const handleMiss = () => {
      missedFramesRef.current += 1;
      const timedOut = Date.now() - lastDetectionTime.current > TIMEOUT_DESISTENCIA;
      const tooManyMisses = missedFramesRef.current >= MISSED_FRAMES_TO_ABSENT;

      if (isHandPresentRef.current && (timedOut || tooManyMisses)) {
        isHandPresentRef.current = false;
        pinchLatched.current = false;
        setHandData([], false, false);
      }
    };

    const setup = async () => {
      try {
        const mediapipeModuleUrl = "/node_modules/@mediapipe/tasks-vision/vision_bundle.mjs";
        const visionModule = (await import(
           
           mediapipeModuleUrl
        )) as VisionModule;
        const { FilesetResolver, HandLandmarker } = visionModule;

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        handLandmarker.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1, 
          minHandDetectionConfidence: CONFIDENCE,
          minHandPresenceConfidence: CONFIDENCE,
          minTrackingConfidence: CONFIDENCE
        });

        animationFrameId = requestAnimationFrame(predict);
      } catch (error) {
        console.error("Falha ao iniciar hand tracking:", error);
        setHandData([], false, false);
      }
    };

    const predict = () => {
      if (!isActive) return;

      if (!videoElement || videoElement.paused || videoElement.readyState < 2) {
        animationFrameId = requestAnimationFrame(predict);
        return;
      }

      const now = performance.now();
      if (now - lastInferenceTime.current < INFERENCE_INTERVAL_MS) {
        animationFrameId = requestAnimationFrame(predict);
        return;
      }
      lastInferenceTime.current = now;

      if (handLandmarker.current) {
        try {
          const nowMs = performance.now();
          const startTimeMs = nowMs <= lastDetectTimestamp.current
            ? lastDetectTimestamp.current + 1
            : nowMs;
          lastDetectTimestamp.current = startTimeMs;
          const results = handLandmarker.current.detectForVideo(videoElement, startTimeMs);

          if (results.landmarks && results.landmarks.length > 0) {
            lastDetectionTime.current = Date.now();
            missedFramesRef.current = 0;
            const hand = results.landmarks[0];

            if (!hand || hand.length < 9) {
              handleMiss();
              animationFrameId = requestAnimationFrame(predict);
              return;
            }

            const distance = Math.sqrt(
              Math.pow(hand[4].x - hand[8].x, 2) +
              Math.pow(hand[4].y - hand[8].y, 2)
            );

            if (!Number.isFinite(distance)) {
              handleMiss();
              animationFrameId = requestAnimationFrame(predict);
              return;
            }

            if (!pinchLatched.current && distance <= PINCH_PRESS_THRESHOLD) {
              pinchLatched.current = true;
            } else if (pinchLatched.current && distance >= PINCH_RELEASE_THRESHOLD) {
              pinchLatched.current = false;
            }

            const landmarks: HandLandmark[] = hand.map((l) => ({
              x: l.x,
              y: l.y,
              z: l.z
            }));

            if (!isHandPresentRef.current) {
              isHandPresentRef.current = true;
            }

            setHandData(landmarks, pinchLatched.current, true);
          } else {
            handleMiss();
          }
        } catch (e) {
          console.error("Erro no Tracking:", e);
          handleMiss();
        }
      }
      
      animationFrameId = requestAnimationFrame(predict);
    };

    setup();

    return () => {
      isActive = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      isHandPresentRef.current = false;
      pinchLatched.current = false;
      missedFramesRef.current = 0;
      handLandmarker.current?.close?.();
      handLandmarker.current = null;
    };
  }, [videoElement, setHandData]);
}
