import { join } from "path";
export function gccRootDir(cwd) {
    return join(cwd, ".GCC");
}
export function gccMainPath(cwd) {
    return join(gccRootDir(cwd), "main.md");
}
export function gccStatePath(cwd) {
    return join(gccRootDir(cwd), "state.json");
}
export function gccBranchesDir(cwd) {
    return join(gccRootDir(cwd), "branches");
}
export function gccBranchDir(cwd, branch) {
    return join(gccBranchesDir(cwd), branch);
}
export function gccBranchCommitMdPath(cwd, branch) {
    return join(gccBranchDir(cwd, branch), "commit.md");
}
export function gccBranchCommitsJsonlPath(cwd, branch) {
    return join(gccBranchDir(cwd, branch), "commits.jsonl");
}
export function gccBranchLogJsonlPath(cwd, branch) {
    return join(gccBranchDir(cwd, branch), "log.jsonl");
}
export function gccBranchMetadataPath(cwd, branch) {
    return join(gccBranchDir(cwd, branch), "metadata.yaml");
}
export function gccSegmentsDir(cwd) {
    return join(gccRootDir(cwd), "segments");
}
export function gccSegmentDir(cwd, segmentId) {
    return join(gccSegmentsDir(cwd), segmentId);
}
export function gccSegmentMetaPath(cwd, segmentId) {
    return join(gccSegmentDir(cwd, segmentId), "meta.json");
}
export function gccSegmentTranscriptPath(cwd, segmentId) {
    return join(gccSegmentDir(cwd, segmentId), "transcript.md");
}
export function gccSegmentEventsPath(cwd, segmentId) {
    return join(gccSegmentDir(cwd, segmentId), "events.jsonl");
}
export function gccSegmentBlobsDir(cwd, segmentId) {
    return join(gccSegmentDir(cwd, segmentId), "blobs");
}
export function gccSegmentBlobPath(cwd, segmentId, sha256) {
    return join(gccSegmentBlobsDir(cwd, segmentId), `${sha256}.txt`);
}
//# sourceMappingURL=paths.js.map