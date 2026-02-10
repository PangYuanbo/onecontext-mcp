import { gccBranchesDir, gccBranchCommitsJsonlPath } from "./paths.js";
import { listDirNames, pathExists, readText } from "../util/fs.js";
import { CommitRecord } from "./commit.js";

export function findCommitRecord(
  cwd: string,
  commitId: string
): { branch: string; record: CommitRecord } | null {
  const branches = listDirNames(gccBranchesDir(cwd));
  for (const branch of branches) {
    const path = gccBranchCommitsJsonlPath(cwd, branch);
    if (!pathExists(path)) continue;

    const lines = readText(path)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      let obj: unknown;
      try {
        obj = JSON.parse(line) as unknown;
      } catch {
        continue;
      }
      if (!obj || typeof obj !== "object") continue;
      const rec = obj as Partial<CommitRecord>;
      if (rec.id === commitId) {
        return { branch, record: rec as CommitRecord };
      }
    }
  }
  return null;
}
