// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { useStudioStore } from "@/stores/studio.store";

describe("brouillon du Studio : écriture différée", () => {
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("écrit après 300 ms, ou tout de suite quand la page est quittée", async () => {
    vi.useFakeTimers();
    await useStudioStore.persist.rehydrate();
    useStudioStore.getState().updateDraft((d) => ({ ...d, categoryId: "live_ko" }));
    expect(localStorage.getItem("hex-studio-draft")).toBeNull();
    vi.advanceTimersByTime(300);
    expect(localStorage.getItem("hex-studio-draft")).toContain("live_ko");

    useStudioStore.getState().updateDraft((d) => ({ ...d, categoryId: "live_sub" }));
    expect(localStorage.getItem("hex-studio-draft")).not.toContain("live_sub");
    window.dispatchEvent(new Event("pagehide"));
    expect(localStorage.getItem("hex-studio-draft")).toContain("live_sub");
  });
});
