import { createWriteStream } from "fs";
import { relative } from "path";
import { gccSegmentBlobsDir, gccSegmentBlobPath, gccSegmentDir, gccSegmentEventsPath, gccSegmentMetaPath, gccSegmentTranscriptPath, } from "../gcc/paths.js";
import { ensureDir, writeJson, writeText } from "../util/fs.js";
import { sha256Hex } from "../util/hash.js";
import { truncateEnd } from "../util/text.js";
function nowIso() {
    return new Date().toISOString();
}
export function createSegmentStore(opts) {
    const { cwd, segmentId, maxInlineChars, storeImages } = opts;
    const dir = gccSegmentDir(cwd, segmentId);
    ensureDir(dir);
    ensureDir(gccSegmentBlobsDir(cwd, segmentId));
    const eventsPath = gccSegmentEventsPath(cwd, segmentId);
    const transcriptPath = gccSegmentTranscriptPath(cwd, segmentId);
    // Initialize transcript with header.
    writeText(transcriptPath, `# Transcript\n\nGenerated: ${nowIso()}\n\n`);
    const eventsStream = createWriteStream(eventsPath, { encoding: "utf-8" });
    const transcriptStream = createWriteStream(transcriptPath, { flags: "a", encoding: "utf-8" });
    const store = {
        cwd,
        segmentId,
        maxInlineChars,
        storeImages,
        blobsWritten: 0,
        blobs: [],
        writeEventLine: (line) => {
            eventsStream.write(line);
            if (!line.endsWith("\n"))
                eventsStream.write("\n");
        },
        writeTranscript: (text) => {
            transcriptStream.write(text);
            if (!text.endsWith("\n"))
                transcriptStream.write("\n");
        },
        close: async () => {
            await Promise.all([
                new Promise((resolve) => eventsStream.end(() => resolve())),
                new Promise((resolve) => transcriptStream.end(() => resolve())),
            ]);
        },
        maybeStoreLargeText: (label, text) => {
            const trimmed = text || "";
            const truncated = truncateEnd(trimmed, maxInlineChars);
            if (!truncated.truncated) {
                return { inline: truncated.text };
            }
            const sha = sha256Hex(trimmed);
            const blobPath = gccSegmentBlobPath(cwd, segmentId, sha);
            const relPath = relative(gccSegmentDir(cwd, segmentId), blobPath);
            const sizeBytes = Buffer.byteLength(trimmed, "utf-8");
            writeText(blobPath, trimmed);
            store.blobsWritten += 1;
            store.blobs.push({ sha256: sha, relPath, sizeBytes });
            return { inline: `${truncated.text}\n[blob ${label} sha256=${sha} bytes=${sizeBytes}]`, blobSha256: sha };
        },
        redactImageUrl: (imageUrl) => {
            // Default: do not store base64 image data.
            const sizeBytes = Buffer.byteLength(imageUrl, "utf-8");
            const sha = sha256Hex(imageUrl);
            if (storeImages) {
                const blobPath = gccSegmentBlobPath(cwd, segmentId, sha);
                const relPath = relative(gccSegmentDir(cwd, segmentId), blobPath);
                writeText(blobPath, imageUrl);
                store.blobsWritten += 1;
                store.blobs.push({ sha256: sha, relPath, sizeBytes });
            }
            return `[image redacted sha256=${sha} bytes=${sizeBytes}${storeImages ? " stored" : ""}]`;
        },
    };
    return store;
}
export function finalizeSegmentMeta(cwd, segmentId, meta) {
    writeJson(gccSegmentMetaPath(cwd, segmentId), meta);
}
//# sourceMappingURL=store.js.map