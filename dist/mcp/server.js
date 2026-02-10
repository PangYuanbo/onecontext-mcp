import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { gccBranchCommitMdPath, gccBranchCommitsJsonlPath, gccBranchLogJsonlPath, gccBranchMetadataPath, gccMainPath, gccSegmentBlobPath, gccSegmentEventsPath, gccSegmentMetaPath, gccSegmentTranscriptPath, gccBranchesDir, gccRootDir, gccSegmentsDir, } from "../gcc/paths.js";
import { initGcc } from "../gcc/init.js";
import { createBranch } from "../gcc/branch.js";
import { checkoutBranch } from "../gcc/checkout.js";
import { commitMilestone } from "../gcc/commit.js";
import { mergeBranch } from "../gcc/merge.js";
import { getContext } from "../gcc/context.js";
import { findCommitRecord } from "../gcc/lookup.js";
import { listCommitRecords, searchCommitRecords } from "../gcc/commits.js";
import { exportCommitRange } from "../gcc/export.js";
import { loadState } from "../gcc/state.js";
import { ensureDir, listDirNames, pathExists, readText } from "../util/fs.js";
import { truncateEnd } from "../util/text.js";
import { forwardCodexSessionSegment } from "../codex/forward.js";
function buildAboutText() {
    return [
        "OneContext MCP provides Git-style context control for LLM agents (GCC).",
        "Forwarding is done by exporting a bounded commit range into a shareable segment.",
        "",
        "Core actions: gcc-init / gcc-branch / gcc-checkout / gcc-commit / gcc-merge / gcc-context",
        "Forwarding: gcc-export (range -> segment) + segment resources",
        "Optional helpers: forward-codex-session-segment (import raw Codex logs into a segment)",
    ].join("\n");
}
function buildInstructionsText() {
    return [
        "Use this MCP server to persist and retrieve structured agent context.",
        "",
        "1) Initialize: callTool gcc-init",
        "2) Work in branches: gcc-branch + gcc-checkout",
        "3) Checkpoint milestones: gcc-commit",
        "4) Merge experiments: gcc-merge",
        "5) Retrieve context: gcc-context or read resources under onecontext://gcc/...",
        "",
        "Forward a bounded slice of memory:",
        "- callTool gcc-list-commits or gcc-search-commits to identify the relevant commit ids",
        "- callTool gcc-export with lastN or fromCommitId/toCommitId",
        "- share the returned segmentId",
        "- another agent reads onecontext://segment/{id}/transcript or /events",
        "",
        "Privacy notes:",
        "- This server does not store chain-of-thought.",
        "- Base64 images are redacted by default (storeImages=false).",
        "- Large tool inputs/outputs are truncated and saved as blobs.",
    ].join("\n");
}
function isSafeName(value) {
    // Disallow path traversal and separators.
    if (!value)
        return false;
    if (value.includes(".."))
        return false;
    if (value.includes("/") || value.includes("\\"))
        return false;
    return /^[A-Za-z0-9._-]+$/.test(value);
}
function readFileIfExists(path) {
    if (!pathExists(path)) {
        throw new Error(`Not found: ${path}`);
    }
    return readText(path);
}
function currentBranch(cwd) {
    try {
        return loadState(cwd).currentBranch;
    }
    catch {
        return "main";
    }
}
export function createServerInstance(version) {
    const server = new McpServer({ name: "OneContext", version }, {
        instructions: "Use this server to manage long-horizon agent context with Git-like operations and share Codex session segments as resources.",
    });
    server.registerResource("onecontext-about", "onecontext://about", {
        title: "OneContext Overview",
        description: "Overview of OneContext MCP",
        mimeType: "text/plain",
    }, async (uri) => ({
        contents: [{ uri: uri.href, text: buildAboutText() }],
    }));
    server.registerResource("onecontext-instructions", "onecontext://instructions", {
        title: "OneContext Instructions",
        description: "How to use GCC tools and segment forwarding",
        mimeType: "text/plain",
    }, async (uri) => ({
        contents: [{ uri: uri.href, text: buildInstructionsText() }],
    }));
    // GCC resources
    server.registerResource("onecontext-gcc-main", "onecontext://gcc/main", {
        title: "GCC Main Roadmap",
        description: "Contents of .GCC/main.md",
        mimeType: "text/markdown",
    }, async (uri) => ({
        contents: [{ uri: uri.href, text: readFileIfExists(gccMainPath(process.cwd())) }],
    }));
    server.registerResource("onecontext-gcc-state", "onecontext://gcc/state", {
        title: "GCC State",
        description: "Current GCC state (state.json)",
        mimeType: "application/json",
    }, async (uri) => {
        const path = `${gccRootDir(process.cwd())}/state.json`;
        return { contents: [{ uri: uri.href, text: readFileIfExists(path) }] };
    });
    server.registerResource("onecontext-gcc-branches", "onecontext://gcc/branches", {
        title: "GCC Branches",
        description: "List branches under .GCC/branches",
        mimeType: "application/json",
    }, async (uri) => {
        const branches = listDirNames(gccBranchesDir(process.cwd()));
        return { contents: [{ uri: uri.href, text: JSON.stringify(branches, null, 2) }] };
    });
    server.registerResource("onecontext-gcc-branch-commit", new ResourceTemplate("onecontext://gcc/branch/{branch}/commit", { list: undefined }), {
        title: "GCC Branch commit.md",
        description: "Human-readable commit history for a branch",
        mimeType: "text/markdown",
    }, async (uri, { branch }) => {
        const b = String(branch);
        if (!isSafeName(b))
            throw new Error(`Invalid branch: ${b}`);
        return {
            contents: [{ uri: uri.href, text: readFileIfExists(gccBranchCommitMdPath(process.cwd(), b)) }],
        };
    });
    server.registerResource("onecontext-gcc-branch-commits", new ResourceTemplate("onecontext://gcc/branch/{branch}/commits", { list: undefined }), {
        title: "GCC Branch commits.jsonl",
        description: "Machine-readable commits (JSONL)",
        mimeType: "application/jsonl",
    }, async (uri, { branch }) => {
        const b = String(branch);
        if (!isSafeName(b))
            throw new Error(`Invalid branch: ${b}`);
        return {
            contents: [{ uri: uri.href, text: readFileIfExists(gccBranchCommitsJsonlPath(process.cwd(), b)) }],
        };
    });
    server.registerResource("onecontext-gcc-branch-log", new ResourceTemplate("onecontext://gcc/branch/{branch}/log/{tail}", { list: undefined }), {
        title: "GCC Branch log.jsonl (tail)",
        description: "Tail of the branch log",
        mimeType: "application/jsonl",
    }, async (uri, { branch, tail }) => {
        const b = String(branch);
        if (!isSafeName(b))
            throw new Error(`Invalid branch: ${b}`);
        const n = Math.min(Math.max(parseInt(String(tail), 10) || 50, 1), 2000);
        const full = readFileIfExists(gccBranchLogJsonlPath(process.cwd(), b));
        const lines = full.split("\n").filter(Boolean);
        const text = lines.slice(-n).join("\n") + (lines.length ? "\n" : "");
        return { contents: [{ uri: uri.href, text }] };
    });
    server.registerResource("onecontext-gcc-branch-metadata", new ResourceTemplate("onecontext://gcc/branch/{branch}/metadata", { list: undefined }), {
        title: "GCC Branch metadata.yaml",
        description: "Structured branch metadata",
        mimeType: "text/yaml",
    }, async (uri, { branch }) => {
        const b = String(branch);
        if (!isSafeName(b))
            throw new Error(`Invalid branch: ${b}`);
        return {
            contents: [{ uri: uri.href, text: readFileIfExists(gccBranchMetadataPath(process.cwd(), b)) }],
        };
    });
    server.registerResource("onecontext-gcc-commit", new ResourceTemplate("onecontext://gcc/commit/{id}", { list: undefined }), {
        title: "GCC Commit (By ID)",
        description: "Lookup a commit record across all branches by commit id",
        mimeType: "application/json",
    }, async (uri, { id }) => {
        const commitId = String(id);
        if (!isSafeName(commitId))
            throw new Error(`Invalid commit id: ${commitId}`);
        const found = findCommitRecord(process.cwd(), commitId);
        if (!found)
            throw new Error(`Commit not found: ${commitId}`);
        return {
            contents: [{ uri: uri.href, text: JSON.stringify(found, null, 2) }],
        };
    });
    // Segment resources
    server.registerResource("onecontext-segment-meta", new ResourceTemplate("onecontext://segment/{id}/meta", { list: undefined }), {
        title: "Segment meta.json",
        description: "Segment metadata",
        mimeType: "application/json",
    }, async (uri, { id }) => {
        const seg = String(id);
        if (!isSafeName(seg))
            throw new Error(`Invalid segment id: ${seg}`);
        return {
            contents: [{ uri: uri.href, text: readFileIfExists(gccSegmentMetaPath(process.cwd(), seg)) }],
        };
    });
    server.registerResource("onecontext-segment-transcript", new ResourceTemplate("onecontext://segment/{id}/transcript", { list: undefined }), {
        title: "Segment transcript.md",
        description: "Human-readable transcript",
        mimeType: "text/markdown",
    }, async (uri, { id }) => {
        const seg = String(id);
        if (!isSafeName(seg))
            throw new Error(`Invalid segment id: ${seg}`);
        return {
            contents: [{ uri: uri.href, text: readFileIfExists(gccSegmentTranscriptPath(process.cwd(), seg)) }],
        };
    });
    server.registerResource("onecontext-segment-events", new ResourceTemplate("onecontext://segment/{id}/events", { list: undefined }), {
        title: "Segment events.jsonl",
        description: "Normalized events (JSONL)",
        mimeType: "application/jsonl",
    }, async (uri, { id }) => {
        const seg = String(id);
        if (!isSafeName(seg))
            throw new Error(`Invalid segment id: ${seg}`);
        return {
            contents: [{ uri: uri.href, text: readFileIfExists(gccSegmentEventsPath(process.cwd(), seg)) }],
        };
    });
    server.registerResource("onecontext-segment-blob", new ResourceTemplate("onecontext://segment/{id}/blob/{sha256}", { list: undefined }), {
        title: "Segment blob",
        description: "Blob contents (large tool inputs/outputs)",
        mimeType: "text/plain",
    }, async (uri, { id, sha256 }) => {
        const seg = String(id);
        const h = String(sha256);
        if (!isSafeName(seg))
            throw new Error(`Invalid segment id: ${seg}`);
        if (!/^[a-f0-9]{64}$/.test(h))
            throw new Error(`Invalid sha256: ${h}`);
        return {
            contents: [{ uri: uri.href, text: readFileIfExists(gccSegmentBlobPath(process.cwd(), seg, h)) }],
        };
    });
    // Tools
    server.registerTool("gcc-init", {
        title: "GCC Init",
        description: "Initialize .GCC/ (main.md, state.json, branches/main, segments).",
        inputSchema: {
            projectGoal: z.string().describe("High-level project goal for .GCC/main.md"),
            initialPlan: z.string().optional().describe("Optional initial plan text"),
            overwrite: z.boolean().optional().default(false).describe("Overwrite main.md if it exists"),
        },
    }, async ({ projectGoal, initialPlan, overwrite }) => {
        try {
            const res = initGcc({ cwd: process.cwd(), projectGoal, initialPlan, overwrite });
            return {
                content: [
                    {
                        type: "text",
                        text: `Initialized GCC at ${res.rootDir}\nmain: ${res.mainPath}`,
                    },
                ],
            };
        }
        catch (err) {
            return { content: [{ type: "text", text: `gcc-init failed: ${String(err)}` }] };
        }
    });
    server.registerTool("gcc-branch", {
        title: "GCC Branch",
        description: "Create a branch under .GCC/branches/<name>.",
        inputSchema: {
            name: z.string().describe("Branch name"),
            purpose: z.string().describe("Branch purpose"),
            checkout: z.boolean().optional().default(true).describe("Set as current branch"),
            overwrite: z.boolean().optional().default(false).describe("Overwrite existing branch files"),
        },
    }, async ({ name, purpose, checkout, overwrite }) => {
        try {
            if (!isSafeName(name))
                throw new Error(`Invalid branch: ${name}`);
            const { created, branchDir } = createBranch({
                cwd: process.cwd(),
                branch: name,
                purpose,
                overwrite,
            });
            const checkoutInfo = checkout ? checkoutBranch(process.cwd(), name) : null;
            return {
                content: [
                    {
                        type: "text",
                        text: `Branch ${name} ${created ? "created" : "ready"} at ${branchDir}${checkoutInfo ? `\nchecked out (previous=${checkoutInfo.previous})` : ""}`,
                    },
                ],
            };
        }
        catch (err) {
            return { content: [{ type: "text", text: `gcc-branch failed: ${String(err)}` }] };
        }
    });
    server.registerTool("gcc-checkout", {
        title: "GCC Checkout",
        description: "Switch the current branch (updates .GCC/state.json).",
        inputSchema: {
            name: z.string().describe("Branch name"),
        },
    }, async ({ name }) => {
        try {
            if (!isSafeName(name))
                throw new Error(`Invalid branch: ${name}`);
            const res = checkoutBranch(process.cwd(), name);
            return {
                content: [
                    {
                        type: "text",
                        text: `Checked out branch ${name} (previous=${res.previous})`,
                    },
                ],
            };
        }
        catch (err) {
            return { content: [{ type: "text", text: `gcc-checkout failed: ${String(err)}` }] };
        }
    });
    server.registerTool("gcc-commit", {
        title: "GCC Commit",
        description: "Create a milestone commit entry in .GCC/branches/<branch>.",
        inputSchema: {
            summary: z.string().describe("Commit summary"),
            details: z.string().optional().describe("Optional longer details"),
            branch: z.string().optional().describe("Branch name (defaults to current)"),
            maxInlineChars: z.number().optional().default(4000).describe("Max inline chars before truncation"),
        },
    }, async ({ summary, details, branch, maxInlineChars }) => {
        try {
            const b = branch ? String(branch) : undefined;
            if (b && !isSafeName(b))
                throw new Error(`Invalid branch: ${b}`);
            const branchName = b || currentBranch(process.cwd());
            const record = commitMilestone({
                cwd: process.cwd(),
                branch: branchName,
                summary,
                details,
                maxInlineChars,
            });
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            ok: true,
                            commit: record,
                            resources: {
                                commitById: `onecontext://gcc/commit/${record.id}`,
                                commitMd: `onecontext://gcc/branch/${branchName}/commit`,
                                commits: `onecontext://gcc/branch/${branchName}/commits`,
                                logTail: `onecontext://gcc/branch/${branchName}/log/200`,
                                metadata: `onecontext://gcc/branch/${branchName}/metadata`,
                            },
                        }, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            return { content: [{ type: "text", text: `gcc-commit failed: ${String(err)}` }] };
        }
    });
    server.registerTool("gcc-merge", {
        title: "GCC Merge",
        description: "Merge one branch into another (records a merge commit).",
        inputSchema: {
            fromBranch: z.string().describe("Source branch"),
            intoBranch: z.string().optional().default("main").describe("Target branch"),
            summary: z.string().optional().describe("Merge summary"),
            includeLogTail: z.number().optional().default(0).describe("Include tail of source log in details"),
            maxInlineChars: z.number().optional().default(4000).describe("Max inline chars before truncation"),
            updateMain: z.boolean().optional().default(true).describe("Append an update line to main.md"),
        },
    }, async ({ fromBranch, intoBranch, summary, includeLogTail, maxInlineChars, updateMain }) => {
        try {
            if (!isSafeName(fromBranch))
                throw new Error(`Invalid fromBranch: ${fromBranch}`);
            if (!isSafeName(intoBranch))
                throw new Error(`Invalid intoBranch: ${intoBranch}`);
            const record = mergeBranch({
                cwd: process.cwd(),
                fromBranch,
                intoBranch,
                summary,
                includeLogTail,
                maxInlineChars,
                updateMain,
            });
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            ok: true,
                            mergeCommit: record,
                            resources: {
                                main: "onecontext://gcc/main",
                                targetCommitMd: `onecontext://gcc/branch/${intoBranch}/commit`,
                            },
                        }, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            return { content: [{ type: "text", text: `gcc-merge failed: ${String(err)}` }] };
        }
    });
    server.registerTool("gcc-context", {
        title: "GCC Context",
        description: "Retrieve GCC context at multiple granularities.",
        inputSchema: {
            scope: z
                .enum([
                "status",
                "main",
                "branches",
                "branch_head",
                "branch_commits",
                "commit_record",
                "commit_md",
                "log_tail",
                "metadata",
            ])
                .optional()
                .default("status"),
            branch: z.string().optional().describe("Branch name (optional)"),
            commitId: z.string().optional().describe("Commit id (for commit_record)"),
            tail: z.number().optional().default(50).describe("Tail line count (for log_tail)"),
        },
    }, async ({ scope, branch, commitId, tail }) => {
        try {
            if (branch && !isSafeName(branch))
                throw new Error(`Invalid branch: ${branch}`);
            if (commitId && !isSafeName(commitId))
                throw new Error(`Invalid commitId: ${commitId}`);
            const result = getContext({
                cwd: process.cwd(),
                scope,
                branch,
                commitId,
                tail,
            });
            const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
            return { content: [{ type: "text", text }] };
        }
        catch (err) {
            return { content: [{ type: "text", text: `gcc-context failed: ${String(err)}` }] };
        }
    });
    server.registerTool("gcc-list-commits", {
        title: "GCC List Commits",
        description: "List commits in a branch with pagination.",
        inputSchema: {
            branch: z.string().optional().describe("Branch name (defaults to current)"),
            limit: z.number().optional().default(20).describe("Max items to return"),
            offset: z.number().optional().default(0).describe("Offset (0-based)"),
            includeDetails: z.boolean().optional().default(false).describe("Include truncated details field"),
            maxDetailChars: z.number().optional().default(500).describe("Max chars for details when includeDetails=true"),
        },
    }, async ({ branch, limit, offset, includeDetails, maxDetailChars }) => {
        try {
            const b = branch ? String(branch) : undefined;
            if (b && !isSafeName(b))
                throw new Error(`Invalid branch: ${b}`);
            const branchName = b || currentBranch(process.cwd());
            const items = listCommitRecords(process.cwd(), branchName, limit, offset).map((rec) => {
                const base = {
                    id: rec.id,
                    ts: rec.ts,
                    kind: rec.kind,
                    branch: rec.branch,
                    summary: rec.summary,
                    git: rec.git?.insideWorkTree ? { branch: rec.git.branch, commitSha: rec.git.commitSha } : null,
                };
                if (includeDetails && rec.details) {
                    base.details = truncateEnd(rec.details, maxDetailChars).text;
                }
                return base;
            });
            return { content: [{ type: "text", text: JSON.stringify({ branch: branchName, items }, null, 2) }] };
        }
        catch (err) {
            return { content: [{ type: "text", text: `gcc-list-commits failed: ${String(err)}` }] };
        }
    });
    server.registerTool("gcc-search-commits", {
        title: "GCC Search Commits",
        description: "Search commits by keyword over summary/details (simple substring match).",
        inputSchema: {
            query: z.string().describe("Search query (non-empty)"),
            branch: z.string().optional().describe("Branch name (defaults to current)"),
            limit: z.number().optional().default(10).describe("Max items to return"),
            maxDetailChars: z.number().optional().default(500).describe("Max chars for details snippet"),
        },
    }, async ({ query, branch, limit, maxDetailChars }) => {
        try {
            const q = String(query || "").trim();
            if (!q)
                throw new Error("query must be non-empty");
            const b = branch ? String(branch) : undefined;
            if (b && !isSafeName(b))
                throw new Error(`Invalid branch: ${b}`);
            const branchName = b || currentBranch(process.cwd());
            const hits = searchCommitRecords(process.cwd(), branchName, q, limit).map((rec) => ({
                id: rec.id,
                ts: rec.ts,
                kind: rec.kind,
                branch: rec.branch,
                summary: rec.summary,
                detailsSnippet: rec.details ? truncateEnd(rec.details, maxDetailChars).text : null,
            }));
            return { content: [{ type: "text", text: JSON.stringify({ branch: branchName, query: q, hits }, null, 2) }] };
        }
        catch (err) {
            return { content: [{ type: "text", text: `gcc-search-commits failed: ${String(err)}` }] };
        }
    });
    server.registerTool("gcc-export", {
        title: "GCC Export",
        description: "Export a bounded commit range into a shareable segment (transcript + events). Use lastN or fromCommitId/toCommitId.",
        inputSchema: {
            branch: z.string().optional().describe("Branch name (defaults to current)"),
            lastN: z.number().optional().describe("Export the last N commits"),
            fromCommitId: z.string().optional().describe("Start commit id (inclusive)"),
            toCommitId: z.string().optional().describe("End commit id (inclusive)"),
            includeMerges: z.boolean().optional().default(true).describe("Include merge commits"),
            includeGitDiffStat: z.boolean().optional().default(true).describe("Include git diff --stat between range endpoints"),
            includeGitPatch: z.boolean().optional().default(false).describe("Include full git diff patch between endpoints (may be large)"),
            maxInlineChars: z.number().optional().default(4000).describe("Max inline chars before blob spill"),
            attachToBranchLog: z.boolean().optional().default(true).describe("Append an export pointer to branch log"),
        },
    }, async ({ branch, lastN, fromCommitId, toCommitId, includeMerges, includeGitDiffStat, includeGitPatch, maxInlineChars, attachToBranchLog, }) => {
        try {
            const b = branch ? String(branch) : undefined;
            if (b && !isSafeName(b))
                throw new Error(`Invalid branch: ${b}`);
            const branchName = b || currentBranch(process.cwd());
            if (lastN === undefined && !fromCommitId && !toCommitId) {
                throw new Error("Provide lastN or fromCommitId/toCommitId");
            }
            if (fromCommitId && !isSafeName(fromCommitId))
                throw new Error(`Invalid fromCommitId: ${fromCommitId}`);
            if (toCommitId && !isSafeName(toCommitId))
                throw new Error(`Invalid toCommitId: ${toCommitId}`);
            // Ensure .GCC exists, because segment storage lives there.
            ensureDir(gccRootDir(process.cwd()));
            ensureDir(gccSegmentsDir(process.cwd()));
            const { segmentId, meta } = await exportCommitRange({
                cwd: process.cwd(),
                branch: branchName,
                fromCommitId: fromCommitId || undefined,
                toCommitId: toCommitId || undefined,
                lastN: lastN || undefined,
                includeMerges,
                includeGitDiffStat,
                includeGitPatch,
                maxInlineChars,
                attachToBranchLog,
            });
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            ok: true,
                            segmentId,
                            resources: {
                                meta: `onecontext://segment/${segmentId}/meta`,
                                transcript: `onecontext://segment/${segmentId}/transcript`,
                                events: `onecontext://segment/${segmentId}/events`,
                            },
                            meta,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            return { content: [{ type: "text", text: `gcc-export failed: ${String(err)}` }] };
        }
    });
    server.registerTool("forward-codex-session-segment", {
        title: "Forward Codex Session Segment",
        description: "Export a slice of a Codex session *.jsonl file into a structured segment (events + transcript).",
        inputSchema: {
            sessionPath: z.string().describe("Absolute path to the Codex session .jsonl file"),
            startLine: z.number().describe("1-based start line"),
            endLine: z.number().describe("1-based end line (inclusive)"),
            mode: z.enum(["chat", "replay", "raw"]).optional().default("chat"),
            maxInlineChars: z.number().optional().default(4000),
            storeImages: z.boolean().optional().default(false),
            attachToBranch: z.string().optional().describe("If set, append an import pointer to branch log"),
        },
    }, async ({ sessionPath, startLine, endLine, mode, maxInlineChars, storeImages, attachToBranch }) => {
        try {
            if (attachToBranch && !isSafeName(attachToBranch)) {
                throw new Error(`Invalid branch: ${attachToBranch}`);
            }
            // Ensure .GCC exists, because segment storage lives there.
            ensureDir(gccRootDir(process.cwd()));
            ensureDir(gccSegmentsDir(process.cwd()));
            ensureDir(gccBranchesDir(process.cwd()));
            const branchExists = attachToBranch && isSafeName(attachToBranch)
                ? listDirNames(gccBranchesDir(process.cwd())).includes(attachToBranch)
                : false;
            const { segmentId, meta } = await forwardCodexSessionSegment({
                cwd: process.cwd(),
                sessionPath,
                startLine,
                endLine,
                mode,
                maxInlineChars,
                storeImages,
                attachToBranch: attachToBranch && branchExists ? attachToBranch : undefined,
            });
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            ok: true,
                            segmentId,
                            resources: {
                                meta: `onecontext://segment/${segmentId}/meta`,
                                transcript: `onecontext://segment/${segmentId}/transcript`,
                                events: `onecontext://segment/${segmentId}/events`,
                            },
                            meta,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            return { content: [{ type: "text", text: `forward-codex-session-segment failed: ${String(err)}` }] };
        }
    });
    return server;
}
//# sourceMappingURL=server.js.map