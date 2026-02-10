import { randomUUID } from "crypto";
import { gccBranchCommitMdPath, gccBranchCommitsJsonlPath, gccBranchLogJsonlPath, } from "./paths.js";
import { appendText, pathExists } from "../util/fs.js";
import { getGitSnapshot } from "../util/git.js";
import { truncateEnd } from "../util/text.js";
import { loadBranchMetadata, saveBranchMetadata } from "./metadata.js";
function nowIso() {
    return new Date().toISOString();
}
function makeCommitId() {
    const ts = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "");
    return `c_${ts}_${randomUUID().slice(0, 8)}`;
}
export function commitMilestone(opts) {
    const { cwd, branch, summary, kind = "commit", details, maxInlineChars = 4000 } = opts;
    const id = makeCommitId();
    const ts = nowIso();
    const git = getGitSnapshot(cwd);
    const { text: detailsText } = truncateEnd(details ? details.trim() : "", maxInlineChars);
    const record = {
        id,
        ts,
        kind,
        branch,
        summary: summary.trim(),
        details: detailsText || undefined,
        git,
    };
    const commitsPath = gccBranchCommitsJsonlPath(cwd, branch);
    if (!pathExists(commitsPath)) {
        throw new Error(`Branch not initialized: ${branch}`);
    }
    appendText(commitsPath, `${JSON.stringify(record)}\n`);
    const commitMdPath = gccBranchCommitMdPath(cwd, branch);
    const mdLines = [];
    mdLines.push(`## ${record.id} - ${record.summary}`);
    mdLines.push("");
    mdLines.push(`- Time: ${record.ts}`);
    if (git.insideWorkTree) {
        mdLines.push(`- Git: ${git.branch || "(detached)"}@${git.commitSha || "(unknown)"}`);
    }
    if (record.details) {
        mdLines.push("- Contribution:");
        mdLines.push("");
        mdLines.push("```text");
        mdLines.push(record.details);
        mdLines.push("```");
    }
    mdLines.push("");
    appendText(commitMdPath, `${mdLines.join("\n")}\n`);
    const logPath = gccBranchLogJsonlPath(cwd, branch);
    appendText(logPath, `${JSON.stringify({ ts, kind: record.kind, id: record.id, summary: record.summary })}\n`);
    const meta = loadBranchMetadata(cwd, branch);
    const updated = {
        ...meta,
        updatedAt: ts,
        git,
        lastCommit: {
            id: record.id,
            ts: record.ts,
            summary: record.summary,
            kind: record.kind,
        },
    };
    saveBranchMetadata(cwd, branch, updated);
    return record;
}
//# sourceMappingURL=commit.js.map