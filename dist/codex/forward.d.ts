import { SegmentMeta, SegmentMode } from "../segments/types.js";
export type ForwardCodexOptions = {
    cwd: string;
    sessionPath: string;
    startLine: number;
    endLine: number;
    mode: SegmentMode;
    maxInlineChars: number;
    storeImages: boolean;
    attachToBranch?: string;
};
export declare function forwardCodexSessionSegment(opts: ForwardCodexOptions): Promise<{
    segmentId: string;
    meta: SegmentMeta;
}>;
//# sourceMappingURL=forward.d.ts.map