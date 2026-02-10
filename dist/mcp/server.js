import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { gccBranchCommitMdPath, gccBranchCommitsJsonlPath, gccBranchLogJsonlPath, gccBranchMetadataPath, gccMainPath, gccSegmentBlobPath, gccSegmentEventsPath, gccSegmentMetaPath, gccSegmentTranscriptPath, gccBranchesDir, gccRootDir, gccSegmentsDir, } from "../gcc/paths.js";
import { initGcc } from "../gcc/init.js";
import { createBranch } from "../gcc/branch.js";
import { checkoutBranch } from "../gcc/checkout.js";
import { commitMilestone } from "../gcc/commit.js";
import { mergeBranch } from "../gcc/merge.js";
import { getContext } from "../gcc/context.js";
import { ensureDir, listDirNames, pathExists, readText } from "../util/fs.js";
import { forwardCodexSessionSegment } from "../codex/forward.js";
function buildAboutText() {
    return [
        "OneContext MCP provides Git-style context control for LLM agents (GCC).",
        "It also supports forwarding slices of Codex session *.jsonl files into shareable segments.",
        "",
        "Core actions: gcc-init / gcc-branch / gcc-checkout / gcc-commit / gcc-merge / gcc-context",
        "Sharing: forward-codex-session-segment + segment resources",
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
        "Forward a Codex session slice:",
        "- callTool forward-codex-session-segment with sessionPath + startLine/endLine",
        "- then read onecontext://segment/{id}/transcript or /events",
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
            const statePath = `${gccRootDir(process.cwd())}/state.json`;
            const current = pathExists(statePath)
                ? JSON.parse(readText(statePath)).currentBranch || "main"
                : "main";
            const branchName = b || current;
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
                "commit_md",
                "log_tail",
                "metadata",
            ])
                .optional()
                .default("status"),
            branch: z.string().optional().describe("Branch name (optional)"),
            tail: z.number().optional().default(50).describe("Tail line count (for log_tail)"),
        },
    }, async ({ scope, branch, tail }) => {
        try {
            if (branch && !isSafeName(branch))
                throw new Error(`Invalid branch: ${branch}`);
            const result = getContext({
                cwd: process.cwd(),
                scope,
                branch,
                tail,
            });
            const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
            return { content: [{ type: "text", text }] };
        }
        catch (err) {
            return { content: [{ type: "text", text: `gcc-context failed: ${String(err)}` }] };
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