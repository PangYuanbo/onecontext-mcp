import YAML from "yaml";
import {
  gccBranchCommitMdPath,
  gccBranchCommitsJsonlPath,
  gccBranchDir,
  gccBranchLogJsonlPath,
  gccBranchMetadataPath,
} from "./paths.js";
import { ensureDir, pathExists, writeText } from "../util/fs.js";
import { getGitSnapshot } from "../util/git.js";

export type CreateBranchOptions = {
  cwd: string;
  branch: string;
  purpose: string;
  overwrite?: boolean;
};

function nowIso(): string {
  return new Date().toISOString();
}

export function createBranch(opts: CreateBranchOptions): {
  created: boolean;
  branchDir: string;
} {
  const { cwd, branch, purpose, overwrite } = opts;
  const dir = gccBranchDir(cwd, branch);
  ensureDir(dir);

  const commitMd = gccBranchCommitMdPath(cwd, branch);
  const commitsJsonl = gccBranchCommitsJsonlPath(cwd, branch);
  const logJsonl = gccBranchLogJsonlPath(cwd, branch);
  const metadata = gccBranchMetadataPath(cwd, branch);

  const created =
    !pathExists(commitMd) && !pathExists(commitsJsonl) && !pathExists(logJsonl) && !pathExists(metadata);

  if (overwrite || !pathExists(commitMd)) {
    const text = [
      "# Branch Purpose",
      purpose.trim() || "(empty)",
      "",
      "# Commits",
      "",
    ].join("\n");
    writeText(commitMd, text);
  }

  if (overwrite || !pathExists(commitsJsonl)) {
    writeText(commitsJsonl, "");
  }

  if (overwrite || !pathExists(logJsonl)) {
    writeText(logJsonl, "");
  }

  if (overwrite || !pathExists(metadata)) {
    const git = getGitSnapshot(cwd);
    const doc = {
      version: 1,
      branch,
      purpose,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      cwd,
      git,
      lastCommit: null,
    };
    writeText(metadata, YAML.stringify(doc));
  }

  return { created, branchDir: dir };
}
