import { create } from "zustand";

export type AppState = "idle" | "listening" | "thinking" | "speaking";

interface AppStore {
  status: AppState;
  isRecording: boolean;
  setStatus: (status: AppState) => void;
  toggleRecording: () => void;
  stopRecording: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  status: "idle",
  isRecording: false,
  setStatus: (status) => set({ status }),
  toggleRecording: () =>
    set((state) => {
      const nextIsRecording = !state.isRecording;
      return {
        isRecording: nextIsRecording,
        status: nextIsRecording ? "listening" : "thinking",
      };
    }),
  stopRecording: () => set({ isRecording: false, status: "thinking" }),
}));
