import { CommitRecord } from "./commit.js";
export type MergeOptions = {
    cwd: string;
    fromBranch: string;
    intoBranch: string;
    summary?: string;
    includeLogTail?: number;
    maxInlineChars?: number;
    updateMain?: boolean;
};
export declare function mergeBranch(opts: MergeOptions): CommitRecord;
//# sourceMappingURL=merge.d.ts.map