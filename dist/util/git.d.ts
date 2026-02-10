export type GitSnapshot = {
    insideWorkTree: boolean;
    rootDir: string | null;
    branch: string | null;
    commitSha: string | null;
    statusPorcelain: string[];
};
export declare function getGitSnapshot(cwd: string): GitSnapshot;
//# sourceMappingURL=git.d.ts.map