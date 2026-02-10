import { gccStatePath } from "./paths.js";
import { pathExists, readJson, writeJson } from "../util/fs.js";
export function defaultState() {
    return { version: 1, currentBranch: "main" };
}
export function loadState(cwd) {
    const path = gccStatePath(cwd);
    if (!pathExists(path))
        return defaultState();
    try {
        const state = readJson(path);
        if (state && state.version === 1 && typeof state.currentBranch === "string") {
            return state;
        }
        return defaultState();
    }
    catch {
        return defaultState();
    }
}
export function saveState(cwd, state) {
    writeJson(gccStatePath(cwd), state);
}
//# sourceMappingURL=state.js.map