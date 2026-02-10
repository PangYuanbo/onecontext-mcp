import YAML from "yaml";
import { gccBranchMetadataPath } from "./paths.js";
import { pathExists, readText, writeText } from "../util/fs.js";
export function loadBranchMetadata(cwd, branch) {
    const path = gccBranchMetadataPath(cwd, branch);
    if (!pathExists(path)) {
        return { version: 1, branch };
    }
    try {
        const doc = YAML.parse(readText(path));
        if (doc && typeof doc === "object")
            return doc;
        return { version: 1, branch };
    }
    catch {
        return { version: 1, branch };
    }
}
export function saveBranchMetadata(cwd, branch, doc) {
    const path = gccBranchMetadataPath(cwd, branch);
    writeText(path, YAML.stringify(doc));
}
//# sourceMappingURL=metadata.js.map