import { gccBranchesDir, gccBranchCommitsJsonlPath } from "./paths.js";
import { listDirNames, pathExists, readText } from "../util/fs.js";
export function findCommitRecord(cwd, commitId) {
    const branches = listDirNames(gccBranchesDir(cwd));
    for (const branch of branches) {
        const path = gccBranchCommitsJsonlPath(cwd, branch);
        if (!pathExists(path))
            continue;
        const lines = readText(path)
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
        for (const line of lines) {
            let obj;
            try {
                obj = JSON.parse(line);
            }
            catch {
                continue;
            }
            if (!obj || typeof obj !== "object")
                continue;
            const rec = obj;
            if (rec.id === commitId) {
                return { branch, record: rec };
            }
        }
    }
    return null;
}
//# sourceMappingURL=lookup.js.map