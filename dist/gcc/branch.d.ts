export type CreateBranchOptions = {
    cwd: string;
    branch: string;
    purpose: string;
    overwrite?: boolean;
};
export declare function createBranch(opts: CreateBranchOptions): {
    created: boolean;
    branchDir: string;
};
//# sourceMappingURL=branch.d.ts.map