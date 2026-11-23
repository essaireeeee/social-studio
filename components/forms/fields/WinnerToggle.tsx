"use client";

import { Segmented } from "@/components/ui/segmented";

interface WinnerToggleProps {
  choices: readonly string[];
  value: string | undefined;
  onChange: (value: string) => void;
}

/** Vainqueur choisi par bascule entre les deux combattants saisis (`live_result`). */
export function WinnerToggle({ choices, value, onChange }: WinnerToggleProps) {
  if (choices.length < 2) {
    return (
      <p className="text-xs text-muted-foreground">Saisissez d&apos;abord les deux combattants.</p>
    );
  }
  return (
    <Segmented
      label="Vainqueur"
      value={value && choices.includes(value) ? value : ""}
      options={choices.map((name) => ({ value: name, label: name }))}
      onChange={onChange}
    />
  );
}
