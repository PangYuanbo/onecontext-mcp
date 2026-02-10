import { SegmentMeta } from "../segments/types.js";
export type ExportCommitsOptions = {
    cwd: string;
    branch: string;
    fromCommitId?: string;
    toCommitId?: string;
    lastN?: number;
    includeMerges?: boolean;
    includeGitDiffStat?: boolean;
    includeGitPatch?: boolean;
    maxInlineChars: number;
    attachToBranchLog?: boolean;
};
export declare function exportCommitRange(opts: ExportCommitsOptions): Promise<{
    segmentId: string;
    meta: SegmentMeta;
}>;
//# sourceMappingURL=export.d.ts.map