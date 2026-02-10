import YAML from "yaml";
import { gccBranchMetadataPath } from "./paths.js";
import { pathExists, readText, writeText } from "../util/fs.js";

export type BranchMetadata = {
  version: number;
  branch: string;
  purpose?: string;
  createdAt?: string;
  updatedAt?: string;
  cwd?: string;
  git?: unknown;
  lastCommit?: unknown;
  [key: string]: unknown;
};

export function loadBranchMetadata(cwd: string, branch: string): BranchMetadata {
  const path = gccBranchMetadataPath(cwd, branch);
  if (!pathExists(path)) {
    return { version: 1, branch };
  }
  try {
    const doc = YAML.parse(readText(path)) as BranchMetadata;
    if (doc && typeof doc === "object") return doc;
    return { version: 1, branch };
  } catch {
    return { version: 1, branch };
  }
}

export function saveBranchMetadata(cwd: string, branch: string, doc: BranchMetadata): void {
  const path = gccBranchMetadataPath(cwd, branch);
  writeText(path, YAML.stringify(doc));
}
