import { gccBranchesDir, gccMainPath, gccRootDir, gccSegmentsDir } from "./paths.js";
import { ensureDir, pathExists, writeText } from "../util/fs.js";
import { createBranch } from "./branch.js";
import { defaultState, saveState } from "./state.js";
function defaultMainMd(projectGoal, initialPlan) {
    const parts = [];
    parts.push("# Roadmap");
    parts.push("");
    parts.push(`Goal: ${projectGoal.trim() || "(empty)"}`);
    parts.push("");
    if (initialPlan && initialPlan.trim()) {
        parts.push("## Initial Plan");
        parts.push("");
        parts.push(initialPlan.trim());
        parts.push("");
    }
    parts.push("## Updates");
    parts.push("");
    parts.push("- (none)");
    parts.push("");
    return parts.join("\n");
}
export function initGcc(opts) {
    const { cwd, projectGoal, initialPlan, overwrite } = opts;
    ensureDir(gccRootDir(cwd));
    ensureDir(gccBranchesDir(cwd));
    ensureDir(gccSegmentsDir(cwd));
    const mainPath = gccMainPath(cwd);
    if (overwrite || !pathExists(mainPath)) {
        writeText(mainPath, defaultMainMd(projectGoal, initialPlan));
    }
    createBranch({ cwd, branch: "main", purpose: "Mainline", overwrite: false });
    saveState(cwd, defaultState());
    return { rootDir: gccRootDir(cwd), mainPath };
}
//# sourceMappingURL=init.js.map