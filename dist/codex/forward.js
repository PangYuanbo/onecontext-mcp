import { createReadStream } from "fs";
import { createInterface } from "readline";
import { gccBranchLogJsonlPath, gccRootDir } from "../gcc/paths.js";
import { ensureDir, appendText } from "../util/fs.js";
import { createSegmentStore, finalizeSegmentMeta } from "../segments/store.js";
function nowIso() {
    return new Date().toISOString();
}
function makeSegmentId() {
    const ts = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "");
    const rand = Math.random().toString(16).slice(2, 10);
    return `seg_${ts}_${rand}`;
}
function isIgnorableImageWrapper(text) {
    const t = text.trim();
    return t === "<image>" || t === "</image>";
}
function writeMessage(store, ev) {
    store.writeEventLine(JSON.stringify(ev));
    const role = ev.role || "(unknown)";
    const text = ev.text || "";
    store.writeTranscript(`## ${role}\n\n${text}\n`);
}
function writeTool(store, ev) {
    store.writeEventLine(JSON.stringify(ev));
    const name = ev.tool?.name || "(tool)";
    const callId = ev.tool?.callId ? ` call_id=${ev.tool.callId}` : "";
    const status = ev.tool?.status ? ` status=${ev.tool.status}` : "";
    store.writeTranscript(`## tool:${name}${callId}${status}\n`);
    if (ev.tool?.input !== undefined) {
        store.writeTranscript("\ninput:\n\n```text\n");
        store.writeTranscript(String(ev.tool.input));
        store.writeTranscript("\n```\n");
    }
    if (ev.tool?.output !== undefined) {
        store.writeTranscript("\noutput:\n\n```text\n");
        store.writeTranscript(String(ev.tool.output));
        store.writeTranscript("\n```\n");
    }
    store.writeTranscript("\n");
}
function writeMeta(store, ev) {
    store.writeEventLine(JSON.stringify(ev));
}
export async function forwardCodexSessionSegment(opts) {
    const { cwd, sessionPath, startLine, endLine, mode, maxInlineChars, storeImages, attachToBranch, } = opts;
    if (startLine < 1 || endLine < startLine) {
        throw new Error(`Invalid line range: startLine=${startLine} endLine=${endLine}`);
    }
    // Ensure .GCC exists even if gcc-init was not called.
    ensureDir(gccRootDir(cwd));
    const segmentId = makeSegmentId();
    const store = createSegmentStore({ cwd, segmentId, maxInlineChars, storeImages });
    const stats = {
        rawLines: 0,
        parsedRecords: 0,
        events: 0,
        messages: 0,
        toolCalls: 0,
        toolResults: 0,
        imagesRedacted: 0,
        blobsWritten: 0,
    };
    const createdAt = nowIso();
    const input = createReadStream(sessionPath, { encoding: "utf-8" });
    const rl = createInterface({ input, crlfDelay: Infinity });
    let lineNo = 0;
    for await (const line of rl) {
        lineNo += 1;
        if (lineNo < startLine)
            continue;
        if (lineNo > endLine)
            break;
        stats.rawLines += 1;
        if (mode === "raw") {
            store.writeEventLine(line);
            stats.parsedRecords += 1;
            stats.events += 1;
            continue;
        }
        let parsed;
        try {
            parsed = JSON.parse(line);
        }
        catch {
            // Keep a record, but do not crash.
            writeMeta(store, { kind: "meta", meta: { parseError: true, lineNo } });
            stats.events += 1;
            continue;
        }
        stats.parsedRecords += 1;
        if (!parsed || typeof parsed !== "object") {
            writeMeta(store, {
                kind: "meta",
                meta: { parseError: false, nonObjectRecord: true, lineNo },
            });
            stats.events += 1;
            continue;
        }
        const obj = parsed;
        const ts = typeof obj.timestamp === "string" ? obj.timestamp : undefined;
        const recordType = typeof obj.type === "string" ? obj.type : undefined;
        const payload = obj.payload;
        if (recordType === "session_meta" && payload && typeof payload === "object") {
            const p = payload;
            writeMeta(store, {
                ts,
                kind: "meta",
                meta: {
                    session: {
                        id: p.id,
                        cwd: p.cwd,
                        originator: p.originator,
                        cliVersion: p.cli_version,
                        source: p.source,
                        modelProvider: p.model_provider,
                        git: p.git || null,
                    },
                },
            });
            stats.events += 1;
            continue;
        }
        if (recordType !== "response_item" || !payload || typeof payload !== "object") {
            continue;
        }
        const p = payload;
        const payloadType = typeof p.type === "string" ? p.type : undefined;
        if (payloadType === "message") {
            const roleRaw = typeof p.role === "string" ? p.role : undefined;
            const role = roleRaw === "user" || roleRaw === "assistant" || roleRaw === "developer" ? roleRaw : undefined;
            const content = Array.isArray(p.content) ? p.content : [];
            for (const part of content) {
                if (!part || typeof part !== "object")
                    continue;
                const partObj = part;
                const partType = typeof partObj.type === "string" ? partObj.type : undefined;
                if (partType === "input_text" || partType === "output_text") {
                    const text = typeof partObj.text === "string" ? partObj.text : "";
                    if (!text.trim())
                        continue;
                    if (isIgnorableImageWrapper(text))
                        continue;
                    writeMessage(store, { ts, kind: "message", role, text });
                    stats.events += 1;
                    stats.messages += 1;
                    continue;
                }
                if (partType === "input_image") {
                    const imageUrl = typeof partObj.image_url === "string" ? partObj.image_url : "";
                    const placeholder = store.redactImageUrl(imageUrl);
                    writeMessage(store, { ts, kind: "message", role, text: placeholder });
                    stats.events += 1;
                    stats.messages += 1;
                    stats.imagesRedacted += 1;
                    continue;
                }
            }
            continue;
        }
        if (mode !== "replay") {
            continue;
        }
        // Tool calls / outputs.
        if (payloadType === "function_call" || payloadType === "custom_tool_call") {
            const name = typeof p.name === "string" ? p.name : undefined;
            const callId = typeof p.call_id === "string" ? p.call_id : undefined;
            const status = typeof p.status === "string" ? p.status : undefined;
            const rawInput = typeof p.arguments === "string"
                ? p.arguments
                : typeof p.input === "string"
                    ? p.input
                    : (p.arguments ?? p.input);
            const inline = typeof rawInput === "string" ? store.maybeStoreLargeText("tool_input", rawInput).inline : rawInput;
            writeTool(store, {
                ts,
                kind: "tool_call",
                tool: {
                    name,
                    callId,
                    status,
                    input: inline,
                },
            });
            stats.events += 1;
            stats.toolCalls += 1;
            continue;
        }
        if (payloadType === "function_call_output" || payloadType === "custom_tool_call_output") {
            const callId = typeof p.call_id === "string" ? p.call_id : undefined;
            const rawOutput = p.output;
            const inline = typeof rawOutput === "string" ? store.maybeStoreLargeText("tool_output", rawOutput).inline : rawOutput;
            writeTool(store, {
                ts,
                kind: "tool_result",
                tool: {
                    callId,
                    output: inline,
                },
            });
            stats.events += 1;
            stats.toolResults += 1;
            continue;
        }
        if (payloadType === "ghost_snapshot") {
            writeMeta(store, { ts, kind: "meta", meta: { ghostSnapshot: p.ghost_commit || null } });
            stats.events += 1;
            continue;
        }
    }
    await store.close();
    stats.blobsWritten = store.blobsWritten;
    const meta = {
        id: segmentId,
        createdAt,
        source: {
            type: "codex_session",
            sessionPath,
            startLine,
            endLine,
        },
        mode,
        stats,
        blobs: store.blobs,
    };
    finalizeSegmentMeta(cwd, segmentId, meta);
    if (attachToBranch) {
        const branchLog = gccBranchLogJsonlPath(cwd, attachToBranch);
        appendText(branchLog, `${JSON.stringify({
            ts: nowIso(),
            kind: "import_segment",
            segmentId,
            source: meta.source,
            mode,
        })}\n`);
    }
    return { segmentId, meta };
}
//# sourceMappingURL=forward.js.map