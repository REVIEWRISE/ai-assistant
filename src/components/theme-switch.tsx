"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "vyntrise-theme";
const THEME_EVENT = "vyntrise-theme-change";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribe(onStoreChange: () => void) {
  const syncStoredTheme = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || (event.newValue !== "light" && event.newValue !== "dark")) return;
    applyTheme(event.newValue);
    onStoreChange();
  };
  const syncTheme = () => onStoreChange();

  window.addEventListener(THEME_EVENT, syncTheme);
  window.addEventListener("storage", syncStoredTheme);
  return () => {
    window.removeEventListener(THEME_EVENT, syncTheme);
    window.removeEventListener("storage", syncStoredTheme);
  };
}

export function ThemeSwitch({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "light");

  const nextTheme: Theme = theme === "dark" ? "light" : "dark";

  function toggleTheme() {
    applyTheme(nextTheme);
    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // The applied theme still works when browser storage is unavailable.
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} theme`}
      title={`Switch to ${nextTheme} theme`}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] shadow-sm outline-none transition hover:bg-[var(--color-raised)] hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] ${className}`}
    >
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.8 6.8 0 0 0 21 12.8Z" />
        </svg>
      )}
    </button>
  );
}
