import { commitMilestone } from "./commit.js";
import { gccBranchDir, gccBranchLogJsonlPath, gccMainPath } from "./paths.js";
import { appendText, pathExists, readText, writeText } from "../util/fs.js";
import { truncateEnd } from "../util/text.js";
function nowIso() {
    return new Date().toISOString();
}
export function mergeBranch(opts) {
    const { cwd, fromBranch, intoBranch, summary, includeLogTail = 0, maxInlineChars = 4000, updateMain = true, } = opts;
    const fromDir = gccBranchDir(cwd, fromBranch);
    const intoDir = gccBranchDir(cwd, intoBranch);
    if (!pathExists(fromDir))
        throw new Error(`Branch not found: ${fromBranch}`);
    if (!pathExists(intoDir))
        throw new Error(`Branch not found: ${intoBranch}`);
    let details = `Merged branch '${fromBranch}' into '${intoBranch}'.`;
    if (includeLogTail > 0) {
        const fromLog = gccBranchLogJsonlPath(cwd, fromBranch);
        if (pathExists(fromLog)) {
            const lines = readText(fromLog)
                .split("\n")
                .filter(Boolean)
                .slice(-includeLogTail);
            const tail = lines.join("\n");
            const truncated = truncateEnd(tail, maxInlineChars);
            details += `\n\nFrom '${fromBranch}' log tail (${includeLogTail} lines):\n${truncated.text}`;
        }
    }
    const mergeSummary = summary?.trim() || `merge: ${fromBranch} -> ${intoBranch}`;
    const record = commitMilestone({
        cwd,
        branch: intoBranch,
        summary: mergeSummary,
        details,
        maxInlineChars,
    });
    const intoLog = gccBranchLogJsonlPath(cwd, intoBranch);
    appendText(intoLog, `${JSON.stringify({ ts: nowIso(), kind: "merge", fromBranch, intoBranch, commitId: record.id })}\n`);
    if (updateMain) {
        const mainPath = gccMainPath(cwd);
        if (pathExists(mainPath)) {
            const prev = readText(mainPath);
            const line = `- ${nowIso()} MERGE ${fromBranch} -> ${intoBranch}: ${mergeSummary}`;
            const next = prev.replace(/\n- \(none\)\n?$/, `\n${line}\n`) + (prev.includes(line) ? "" : "");
            // If the placeholder was not present, just append.
            if (next === prev) {
                writeText(mainPath, `${prev.trimEnd()}\n${line}\n`);
            }
            else {
                writeText(mainPath, next);
            }
        }
    }
    return { ...record, kind: "merge" };
}
//# sourceMappingURL=merge.js.map