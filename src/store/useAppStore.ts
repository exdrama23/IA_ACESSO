import { create } from "zustand";
import * as THREE from "three";

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export type AppStatus = "idle" | "listening" | "thinking" | "speaking" | "error";

interface AppState {
  status: AppStatus;
  setStatus: (status: AppStatus) => void;
  
  isUserPresent: boolean;
  isPinching: boolean;
  handLandmarks: HandLandmark[];
  cursorPosition: THREE.Vector3; 
  
  setHandData: (landmarks: HandLandmark[], isPinching: boolean, isPresent: boolean) => void;
  setCursorPosition: (pos: THREE.Vector3) => void;
}

export const useAppStore = create<AppState>((set) => ({
  status: "idle",
  setStatus: (status) => set({ status }),

  isUserPresent: false,
  isPinching: false,
  handLandmarks: [],
  cursorPosition: new THREE.Vector3(0, 0, 0),

  setHandData: (landmarks, isPinching, isPresent) => set({ 
    handLandmarks: landmarks, 
    isPinching, 
    isUserPresent: isPresent 
  }),
  
  setCursorPosition: (cursorPosition) => set({ cursorPosition }),
}));
