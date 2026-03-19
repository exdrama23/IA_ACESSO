declare module "@mediapipe/tasks-vision" {
  export interface NormalizedLandmark {
    x: number;
    y: number;
    z: number;
    visibility?: number;
  }

  export interface HandLandmarkerResult {
    landmarks: NormalizedLandmark[][];
  }

  export interface WasmFileset {
    wasmLoaderPath?: string;
    wasmBinaryPath?: string;
  }

  export interface HandLandmarkerOptions {
    baseOptions: {
      modelAssetPath: string;
      delegate?: "CPU" | "GPU";
    };
    runningMode?: "IMAGE" | "VIDEO" | "LIVE_STREAM";
    numHands?: number;
    minHandDetectionConfidence?: number;
    minHandPresenceConfidence?: number;
    minTrackingConfidence?: number;
  }

  export class FilesetResolver {
    static forVisionTasks(basePath: string): Promise<WasmFileset>;
  }

  export class HandLandmarker {
    static createFromOptions(
      wasmFileset: WasmFileset,
      options: HandLandmarkerOptions
    ): Promise<HandLandmarker>;

    detectForVideo(videoFrame: HTMLVideoElement, timestampMs: number): HandLandmarkerResult;

    close(): void;
  }
}
