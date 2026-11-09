"use client";

import { createContext, useContext } from "react";

export type WorkspaceSwitcher = {
  switching: boolean;
  onSwitch: (organizationId: string) => void;
};

/** Lets page content reuse the app shell's workspace switching logic. */
export const WorkspaceSwitcherContext = createContext<WorkspaceSwitcher | null>(null);

export function useWorkspaceSwitcher(): WorkspaceSwitcher {
  return (
    useContext(WorkspaceSwitcherContext) ?? {
      switching: false,
      onSwitch: () => {},
    }
  );
}
