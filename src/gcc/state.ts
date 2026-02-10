import { gccStatePath } from "./paths.js";
import { pathExists, readJson, writeJson } from "../util/fs.js";

export type GccState = {
  version: 1;
  currentBranch: string;
};

export function defaultState(): GccState {
  return { version: 1, currentBranch: "main" };
}

export function loadState(cwd: string): GccState {
  const path = gccStatePath(cwd);
  if (!pathExists(path)) return defaultState();
  try {
    const state = readJson<GccState>(path);
    if (state && state.version === 1 && typeof state.currentBranch === "string") {
      return state;
    }
    return defaultState();
  } catch {
    return defaultState();
  }
}

export function saveState(cwd: string, state: GccState): void {
  writeJson(gccStatePath(cwd), state);
}
