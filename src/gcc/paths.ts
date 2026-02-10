import { join } from "path";

export function gccRootDir(cwd: string): string {
  return join(cwd, ".GCC");
}

export function gccMainPath(cwd: string): string {
  return join(gccRootDir(cwd), "main.md");
}

export function gccStatePath(cwd: string): string {
  return join(gccRootDir(cwd), "state.json");
}

export function gccBranchesDir(cwd: string): string {
  return join(gccRootDir(cwd), "branches");
}

export function gccBranchDir(cwd: string, branch: string): string {
  return join(gccBranchesDir(cwd), branch);
}

export function gccBranchCommitMdPath(cwd: string, branch: string): string {
  return join(gccBranchDir(cwd, branch), "commit.md");
}

export function gccBranchCommitsJsonlPath(cwd: string, branch: string): string {
  return join(gccBranchDir(cwd, branch), "commits.jsonl");
}

export function gccBranchLogJsonlPath(cwd: string, branch: string): string {
  return join(gccBranchDir(cwd, branch), "log.jsonl");
}

export function gccBranchMetadataPath(cwd: string, branch: string): string {
  return join(gccBranchDir(cwd, branch), "metadata.yaml");
}

export function gccSegmentsDir(cwd: string): string {
  return join(gccRootDir(cwd), "segments");
}

export function gccSegmentDir(cwd: string, segmentId: string): string {
  return join(gccSegmentsDir(cwd), segmentId);
}

export function gccSegmentMetaPath(cwd: string, segmentId: string): string {
  return join(gccSegmentDir(cwd, segmentId), "meta.json");
}

export function gccSegmentTranscriptPath(cwd: string, segmentId: string): string {
  return join(gccSegmentDir(cwd, segmentId), "transcript.md");
}

export function gccSegmentEventsPath(cwd: string, segmentId: string): string {
  return join(gccSegmentDir(cwd, segmentId), "events.jsonl");
}

export function gccSegmentBlobsDir(cwd: string, segmentId: string): string {
  return join(gccSegmentDir(cwd, segmentId), "blobs");
}

export function gccSegmentBlobPath(cwd: string, segmentId: string, sha256: string): string {
  return join(gccSegmentBlobsDir(cwd, segmentId), `${sha256}.txt`);
}
