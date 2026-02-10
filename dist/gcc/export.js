import { spawnSync } from "child_process";
import { appendText, ensureDir } from "../util/fs.js";
import { createSegmentStore, finalizeSegmentMeta } from "../segments/store.js";
import { selectCommitRange } from "./commits.js";
import { gccBranchLogJsonlPath, gccRootDir, gccSegmentsDir } from "./paths.js";
function nowIso() {
    return new Date().toISOString();
}
function makeSegmentId() {
    const ts = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "");
    const rand = Math.random().toString(16).slice(2, 10);
    return `seg_${ts}_${rand}`;
}
function runGit(cwd, args) {
    const result = spawnSync("git", args, { cwd, encoding: "utf-8" });
    const stdout = (result.stdout || "").toString();
    const stderr = (result.stderr || "").toString();
    return { ok: result.status === 0, stdout, stderr };
}
function formatCommitTranscript(rec) {
    const parts = [];
    parts.push(`## ${rec.id} (${rec.kind})`);
    parts.push("");
    parts.push(`- Time: ${rec.ts}`);
    parts.push(`- Summary: ${rec.summary}`);
    if (rec.git?.insideWorkTree) {
        parts.push(`- Git: ${rec.git.branch || "(detached)"}@${rec.git.commitSha || "(unknown)"}`);
    }
    if (rec.details) {
        parts.push("");
        parts.push("```text");
        parts.push(rec.details);
        parts.push("```");
    }
    parts.push("");
    return parts.join("\n");
}
export async function exportCommitRange(opts) {
    const { cwd, branch, fromCommitId, toCommitId, lastN, includeMerges = true, includeGitDiffStat = true, includeGitPatch = false, maxInlineChars, attachToBranchLog = true, } = opts;
    // Ensure storage exists.
    ensureDir(gccRootDir(cwd));
    ensureDir(gccSegmentsDir(cwd));
    const selectedInfo = selectCommitRange({
        cwd,
        branch,
        fromCommitId,
        toCommitId,
        lastN,
        includeMerges,
    });
    const selected = selectedInfo.selected;
    const segmentId = makeSegmentId();
    const store = createSegmentStore({ cwd, segmentId, maxInlineChars, storeImages: false });
    store.writeTranscript(`# GCC Export\n\nBranch: ${branch}\nRange: ${selectedInfo.fromId}..${selectedInfo.toId}\nGenerated: ${nowIso()}\n\n`);
    // Write commit entries.
    let merges = 0;
    for (const rec of selected) {
        if (rec.kind === "merge")
            merges += 1;
        store.writeEventLine(JSON.stringify({
            ts: rec.ts,
            kind: "meta",
            meta: { type: "gcc_commit", record: rec },
        }));
        store.writeTranscript(formatCommitTranscript(rec));
    }
    // Git diff between endpoints (best-effort).
    let statBlobSha256;
    let patchBlobSha256;
    const fromSha = selected[0].git?.commitSha || null;
    const toSha = selected[selected.length - 1].git?.commitSha || null;
    if (includeGitDiffStat && fromSha && toSha && fromSha !== toSha) {
        const stat = runGit(cwd, ["diff", "--stat", `${fromSha}..${toSha}`]);
        const body = stat.ok ? stat.stdout : `git diff --stat failed: ${stat.stderr}`;
        const stored = store.maybeStoreLargeText("git_diff_stat", body);
        statBlobSha256 = stored.blobSha256;
        store.writeEventLine(JSON.stringify({
            ts: nowIso(),
            kind: "meta",
            meta: {
                type: "git_diff_stat",
                fromSha,
                toSha,
                text: stored.inline,
                blobSha256: stored.blobSha256 || null,
            },
        }));
        store.writeTranscript(`## Git Diff (stat)\n\n\`\`\`text\n${stored.inline}\n\`\`\`\n\n`);
    }
    if (includeGitPatch && fromSha && toSha && fromSha !== toSha) {
        const patch = runGit(cwd, ["diff", `${fromSha}..${toSha}`]);
        const body = patch.ok ? patch.stdout : `git diff failed: ${patch.stderr}`;
        const stored = store.maybeStoreLargeText("git_diff_patch", body);
        patchBlobSha256 = stored.blobSha256;
        store.writeEventLine(JSON.stringify({
            ts: nowIso(),
            kind: "meta",
            meta: {
                type: "git_diff_patch",
                fromSha,
                toSha,
                text: stored.inline,
                blobSha256: stored.blobSha256 || null,
            },
        }));
        store.writeTranscript(`## Git Diff (patch)\n\n\`\`\`diff\n${stored.inline}\n\`\`\`\n\n`);
    }
    await store.close();
    const meta = {
        id: segmentId,
        createdAt: nowIso(),
        source: {
            type: "gcc_commits",
            branch,
            fromCommitId: selectedInfo.fromId,
            toCommitId: selectedInfo.toId,
            commitIds: selected.map((r) => r.id),
            includeMerges,
            gitDiff: fromSha && toSha && fromSha !== toSha
                ? {
                    fromSha,
                    toSha,
                    statBlobSha256,
                    patchBlobSha256,
                }
                : undefined,
        },
        mode: "gcc",
        stats: {
            commits: selected.length,
            merges,
            blobsWritten: store.blobsWritten,
        },
        blobs: store.blobs,
    };
    finalizeSegmentMeta(cwd, segmentId, meta);
    if (attachToBranchLog) {
        const log = gccBranchLogJsonlPath(cwd, branch);
        appendText(log, `${JSON.stringify({
            ts: nowIso(),
            kind: "export_segment",
            segmentId,
            branch,
            fromCommitId: selectedInfo.fromId,
            toCommitId: selectedInfo.toId,
            commits: selected.length,
        })}\n`);
    }
    return { segmentId, meta };
}
//# sourceMappingURL=export.js.map