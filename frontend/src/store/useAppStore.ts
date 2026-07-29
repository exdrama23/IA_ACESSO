import { create } from "zustand";
import * as THREE from "three";

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface LastResponse {
  text: string;
  audioUrl: string;
  timestamp: number;
}

export type AppStatus = "idle" | "listening" | "thinking" | "speaking" | "error";

interface AppState {
  status: AppStatus;
  setStatus: (status: AppStatus) => void;

  isThinkingDeeply: boolean;
  setIsThinkingDeeply: (isThinking: boolean) => void;

  isRecording: boolean;
  toggleRecording: () => void;
  
  isUserPresent: boolean;
  isPinching: boolean;
  isStoppingGesture: boolean;
  handLandmarks: HandLandmark[];
  cursorPosition: THREE.Vector3;
  
  activeVoiceId: string;
  setActiveVoiceId: (voiceId: string) => void;

  lastResponse: LastResponse | null;
  setLastResponse: (response: LastResponse | null) => void;
  
  currentAudio: HTMLAudioElement | null;
  setCurrentAudio: (audio: HTMLAudioElement | null) => void;
  
  setHandData: (landmarks: HandLandmark[], isPinching: boolean, isPresent: boolean, isStopping?: boolean) => void;
  setCursorPosition: (pos: THREE.Vector3) => void;
}

export const useAppStore = create<AppState>((set) => ({
  status: "idle",
  setStatus: (status) => set({ status }),

  isThinkingDeeply: false,
  setIsThinkingDeeply: (isThinkingDeeply) => set({ isThinkingDeeply }),

  isRecording: false,
  toggleRecording: () => set((state) => ({ isRecording: !state.isRecording })),

  isUserPresent: false,
  isPinching: false,
  isStoppingGesture: false,
  handLandmarks: [],
  cursorPosition: new THREE.Vector3(0, 0, 0),
  
  activeVoiceId: "hpp4J3VqNfWAUOO0d1Us",
  setActiveVoiceId: (voiceId) => set({ activeVoiceId: voiceId }),

  lastResponse: null,
  setLastResponse: (response) => set({ lastResponse: response }),

  currentAudio: null,
  setCurrentAudio: (audio) => set({ currentAudio: audio }),

  setHandData: (landmarks, isPinching, isPresent, isStopping = false) => set({ 
    handLandmarks: landmarks, 
    isPinching, 
    isUserPresent: isPresent,
    isStoppingGesture: isStopping
  }),
  
  setCursorPosition: (cursorPosition) => set({ cursorPosition }),
}));
