export type SegmentStore = {
    cwd: string;
    segmentId: string;
    maxInlineChars: number;
    storeImages: boolean;
    blobsWritten: number;
    blobs: {
        sha256: string;
        relPath: string;
        sizeBytes: number;
    }[];
    writeEventLine: (line: string) => void;
    writeTranscript: (text: string) => void;
    close: () => Promise<void>;
    maybeStoreLargeText: (label: string, text: string) => {
        inline: string;
        blobSha256?: string;
    };
    redactImageUrl: (imageUrl: string) => string;
};
export declare function createSegmentStore(opts: {
    cwd: string;
    segmentId: string;
    maxInlineChars: number;
    storeImages: boolean;
}): SegmentStore;
export declare function finalizeSegmentMeta(cwd: string, segmentId: string, meta: unknown): void;
//# sourceMappingURL=store.d.ts.map