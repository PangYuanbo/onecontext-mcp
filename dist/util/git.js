import { spawnSync } from "child_process";
function runGit(cwd, args) {
    const result = spawnSync("git", args, { cwd, encoding: "utf-8" });
    const stdout = (result.stdout || "").toString();
    const stderr = (result.stderr || "").toString();
    return { ok: result.status === 0, stdout, stderr };
}
export function getGitSnapshot(cwd) {
    const inside = runGit(cwd, ["rev-parse", "--is-inside-work-tree"]);
    if (!inside.ok || inside.stdout.trim() !== "true") {
        return {
            insideWorkTree: false,
            rootDir: null,
            branch: null,
            commitSha: null,
            statusPorcelain: [],
        };
    }
    const root = runGit(cwd, ["rev-parse", "--show-toplevel"]);
    const branch = runGit(cwd, ["branch", "--show-current"]);
    const sha = runGit(cwd, ["rev-parse", "HEAD"]);
    const status = runGit(cwd, ["status", "--porcelain=v1"]);
    return {
        insideWorkTree: true,
        rootDir: root.ok ? root.stdout.trim() : null,
        branch: branch.ok ? branch.stdout.trim() || null : null,
        commitSha: sha.ok ? sha.stdout.trim() : null,
        statusPorcelain: status.ok
            ? status.stdout
                .split("\n")
                .map((line) => line.trimEnd())
                .filter(Boolean)
            : [],
    };
}
//# sourceMappingURL=git.js.map