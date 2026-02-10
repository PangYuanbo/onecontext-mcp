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
export declare function loadBranchMetadata(cwd: string, branch: string): BranchMetadata;
export declare function saveBranchMetadata(cwd: string, branch: string, doc: BranchMetadata): void;
//# sourceMappingURL=metadata.d.ts.map