export function truncateEnd(value, maxChars) {
    if (maxChars <= 0) {
        return { text: "", truncated: value.length > 0 };
    }
    if (value.length <= maxChars) {
        return { text: value, truncated: false };
    }
    const omitted = value.length - maxChars;
    const text = `${value.slice(0, maxChars)}\n...[truncated ${omitted} chars]`;
    return { text, truncated: true };
}
export function toSafeText(value) {
    if (value === null || value === undefined)
        return "";
    if (typeof value === "string")
        return value;
    try {
        return JSON.stringify(value, null, 2);
    }
    catch {
        return String(value);
    }
}
//# sourceMappingURL=text.js.map