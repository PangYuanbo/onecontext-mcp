import { CommitRecord } from "./commit.js";
export declare function readCommitRecords(cwd: string, branch: string): CommitRecord[];
export declare function listCommitRecords(cwd: string, branch: string, limit: number, offset: number): CommitRecord[];
export declare function searchCommitRecords(cwd: string, branch: string, query: string, limit: number): CommitRecord[];
export declare function selectCommitRange(opts: {
    cwd: string;
    branch: string;
    fromCommitId?: string;
    toCommitId?: string;
    lastN?: number;
    includeMerges?: boolean;
}): {
    selected: CommitRecord[];
    fromId: string;
    toId: string;
};
//# sourceMappingURL=commits.d.ts.map