import { gccBranchCommitsJsonlPath } from "./paths.js";
import { pathExists, readText } from "../util/fs.js";
export function readCommitRecords(cwd, branch) {
    const path = gccBranchCommitsJsonlPath(cwd, branch);
    if (!pathExists(path)) {
        throw new Error(`Branch not initialized: ${branch}`);
    }
    const lines = readText(path)
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    const records = [];
    for (const line of lines) {
        try {
            const parsed = JSON.parse(line);
            if (!parsed || typeof parsed !== "object")
                continue;
            const rec = parsed;
            if (!rec.id || !rec.ts || !rec.summary || !rec.branch)
                continue;
            records.push(rec);
        }
        catch {
            // ignore bad lines
        }
    }
    return records;
}
export function listCommitRecords(cwd, branch, limit, offset) {
    const records = readCommitRecords(cwd, branch);
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const safeOffset = Math.min(Math.max(offset, 0), records.length);
    return records.slice(safeOffset, safeOffset + safeLimit);
}
export function searchCommitRecords(cwd, branch, query, limit) {
    const q = query.trim().toLowerCase();
    if (!q)
        return [];
    const records = readCommitRecords(cwd, branch);
    const scored = [];
    for (const rec of records) {
        const hay = `${rec.summary}\n${rec.details || ""}`.toLowerCase();
        const idx = hay.indexOf(q);
        if (idx === -1)
            continue;
        // Simple heuristic: earlier match is better.
        const score = Math.max(1, 10000 - idx);
        scored.push({ rec, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, Math.min(Math.max(limit, 1), 50)).map((x) => x.rec);
}
export function selectCommitRange(opts) {
    const { cwd, branch, fromCommitId, toCommitId, lastN, includeMerges = true } = opts;
    let records = readCommitRecords(cwd, branch);
    if (!includeMerges) {
        records = records.filter((r) => r.kind !== "merge");
    }
    if (records.length === 0) {
        throw new Error(`No commits found in branch: ${branch}`);
    }
    if (typeof lastN === "number" && Number.isFinite(lastN) && lastN > 0) {
        const n = Math.min(Math.floor(lastN), records.length);
        const selected = records.slice(-n);
        return { selected, fromId: selected[0].id, toId: selected[selected.length - 1].id };
    }
    const fromId = fromCommitId || records[0].id;
    const toId = toCommitId || records[records.length - 1].id;
    const fromIndex = records.findIndex((r) => r.id === fromId);
    const toIndex = records.findIndex((r) => r.id === toId);
    if (fromIndex === -1)
        throw new Error(`fromCommitId not found: ${fromId}`);
    if (toIndex === -1)
        throw new Error(`toCommitId not found: ${toId}`);
    if (toIndex < fromIndex) {
        throw new Error(`Invalid range: toCommitId is before fromCommitId (${fromId}..${toId})`);
    }
    const selected = records.slice(fromIndex, toIndex + 1);
    return { selected, fromId, toId };
}
//# sourceMappingURL=commits.js.map