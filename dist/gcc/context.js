import { gccBranchesDir, gccBranchCommitMdPath, gccBranchCommitsJsonlPath, gccBranchLogJsonlPath, gccBranchMetadataPath, gccMainPath, } from "./paths.js";
import { listDirNames, pathExists, readText } from "../util/fs.js";
import { loadState } from "./state.js";
function tailLines(text, count) {
    const lines = text.split("\n").filter(Boolean);
    return lines.slice(-Math.max(0, count)).join("\n");
}
export function getContext(req) {
    const { cwd, scope, branch, tail = 50 } = req;
    const state = loadState(cwd);
    if (scope === "status") {
        return {
            cwd,
            state,
            mainExists: pathExists(gccMainPath(cwd)),
            branches: listDirNames(gccBranchesDir(cwd)),
        };
    }
    if (scope === "main") {
        const path = gccMainPath(cwd);
        return pathExists(path) ? readText(path) : null;
    }
    if (scope === "branches") {
        return listDirNames(gccBranchesDir(cwd));
    }
    const b = branch || state.currentBranch;
    if (scope === "branch_head") {
        const commitMd = gccBranchCommitMdPath(cwd, b);
        return pathExists(commitMd) ? tailLines(readText(commitMd), 60) : null;
    }
    if (scope === "branch_commits") {
        const commits = gccBranchCommitsJsonlPath(cwd, b);
        if (!pathExists(commits))
            return [];
        return tailLines(readText(commits), 10);
    }
    if (scope === "commit_md") {
        const commitMd = gccBranchCommitMdPath(cwd, b);
        return pathExists(commitMd) ? readText(commitMd) : null;
    }
    if (scope === "log_tail") {
        const log = gccBranchLogJsonlPath(cwd, b);
        return pathExists(log) ? tailLines(readText(log), tail) : null;
    }
    if (scope === "metadata") {
        const meta = gccBranchMetadataPath(cwd, b);
        return pathExists(meta) ? readText(meta) : null;
    }
    return null;
}
//# sourceMappingURL=context.js.map