import { create } from "zustand";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: number;
  message: string;
  tone: "neutral" | "success" | "danger";
  /** Action proposée (ex. « Réessayer » après une erreur). */
  action?: ToastAction;
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, tone?: Toast["tone"], action?: ToastAction) => void;
  dismiss: (id: number) => void;
}

let next = 1;
const DURATION_MS = 3000;
/** Plus long quand une action est proposée : le temps de la lire et de cliquer. */
const ACTION_DURATION_MS = 8000;

/** Notifications brèves (« Copié », « Validée »…), retirées au bout de 3 s. */
export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message, tone = "neutral", action) => {
    const id = next++;
    set((state) => ({ toasts: [...state.toasts.slice(-2), { id, message, tone, action }] }));
    setTimeout(() => get().dismiss(id), action ? ACTION_DURATION_MS : DURATION_MS);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (message: string, tone?: Toast["tone"], action?: ToastAction) =>
  useToastStore.getState().push(message, tone, action);
