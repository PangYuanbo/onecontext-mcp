#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readFileSync } from "fs";
import { createServerInstance } from "./mcp/server.js";
const pkgJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf-8"));
async function main() {
    const server = createServerInstance(pkgJson.version);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("OneContext MCP Server running on stdio");
    console.error(`Version: ${pkgJson.version}`);
    console.error(`CWD: ${process.cwd()}`);
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map