import { randomUUID } from "crypto";
import {
  gccBranchCommitMdPath,
  gccBranchCommitsJsonlPath,
  gccBranchLogJsonlPath,
} from "./paths.js";
import { appendText, pathExists } from "../util/fs.js";
import { getGitSnapshot } from "../util/git.js";
import { truncateEnd } from "../util/text.js";
import { loadBranchMetadata, saveBranchMetadata } from "./metadata.js";

export type CommitOptions = {
  cwd: string;
  branch: string;
  summary: string;
  details?: string;
  updateMain?: boolean;
  maxInlineChars?: number;
};

export type CommitRecord = {
  id: string;
  ts: string;
  kind: "commit" | "merge";
  branch: string;
  summary: string;
  details?: string;
  git: ReturnType<typeof getGitSnapshot>;
};

function nowIso(): string {
  return new Date().toISOString();
}

function makeCommitId(): string {
  const ts = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "");
  return `c_${ts}_${randomUUID().slice(0, 8)}`;
}

export function commitMilestone(opts: CommitOptions): CommitRecord {
  const { cwd, branch, summary, details, maxInlineChars = 4000 } = opts;
  const id = makeCommitId();
  const ts = nowIso();
  const git = getGitSnapshot(cwd);

  const { text: detailsText } = truncateEnd(details ? details.trim() : "", maxInlineChars);

  const record: CommitRecord = {
    id,
    ts,
    kind: "commit",
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
  const mdLines: string[] = [];
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
  appendText(
    logPath,
    `${JSON.stringify({ ts, kind: "commit", id: record.id, summary: record.summary })}\n`
  );

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
