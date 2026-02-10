export type SegmentMode = "chat" | "replay" | "raw" | "gcc";

export type SegmentEvent = {
  ts?: string;
  kind: "message" | "tool_call" | "tool_result" | "meta";
  role?: "user" | "assistant" | "developer";
  text?: string;
  tool?: {
    name?: string;
    callId?: string;
    status?: string;
    input?: unknown;
    output?: unknown;
  };
  meta?: Record<string, unknown>;
};

export type SegmentSource =
  | {
      type: "codex_session";
      sessionPath: string;
      startLine: number;
      endLine: number;
    }
  | {
      type: "gcc_commits";
      branch: string;
      fromCommitId: string;
      toCommitId: string;
      commitIds: string[];
      includeMerges: boolean;
      gitDiff?: {
        fromSha: string;
        toSha: string;
        statBlobSha256?: string;
        patchBlobSha256?: string;
      };
    };

export type SegmentStats = {
  // codex_session
  rawLines?: number;
  parsedRecords?: number;
  events?: number;
  messages?: number;
  toolCalls?: number;
  toolResults?: number;
  imagesRedacted?: number;
  blobsWritten?: number;

  // gcc_commits
  commits?: number;
  merges?: number;
};

export type SegmentMeta = {
  id: string;
  createdAt: string;
  source: SegmentSource;
  mode: SegmentMode;
  stats: SegmentStats;
  blobs: { sha256: string; relPath: string; sizeBytes: number }[];
};
