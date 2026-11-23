import { create } from "zustand";

export interface Toast {
  id: number;
  message: string;
  tone: "neutral" | "success" | "danger";
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, tone?: Toast["tone"]) => void;
  dismiss: (id: number) => void;
}

let next = 1;
const DURATION_MS = 3000;

/** Notifications brèves (« Copié », « Validée »…), retirées au bout de 3 s. */
export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message, tone = "neutral") => {
    const id = next++;
    set((state) => ({ toasts: [...state.toasts.slice(-2), { id, message, tone }] }));
    setTimeout(() => get().dismiss(id), DURATION_MS);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (message: string, tone?: Toast["tone"]) =>
  useToastStore.getState().push(message, tone);
