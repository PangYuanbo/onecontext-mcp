export type SegmentMode = "chat" | "replay" | "raw";

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

export type SegmentMeta = {
  id: string;
  createdAt: string;
  source: {
    type: "codex_session";
    sessionPath: string;
    startLine: number;
    endLine: number;
  };
  mode: SegmentMode;
  stats: {
    rawLines: number;
    parsedRecords: number;
    events: number;
    messages: number;
    toolCalls: number;
    toolResults: number;
    imagesRedacted: number;
    blobsWritten: number;
  };
  blobs: { sha256: string; relPath: string; sizeBytes: number }[];
};
