import { gccBranchDir } from "./paths.js";
import { pathExists } from "../util/fs.js";
import { loadState, saveState } from "./state.js";
export function checkoutBranch(cwd, branch) {
    const dir = gccBranchDir(cwd, branch);
    if (!pathExists(dir)) {
        throw new Error(`Branch not found: ${branch}`);
    }
    const state = loadState(cwd);
    const previous = state.currentBranch;
    saveState(cwd, { ...state, currentBranch: branch });
    return { previous, current: branch };
}
//# sourceMappingURL=checkout.js.map