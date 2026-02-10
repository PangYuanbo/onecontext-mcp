import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, } from "fs";
import { dirname, join } from "path";
export function ensureDir(path) {
    mkdirSync(path, { recursive: true });
}
export function ensureParentDir(path) {
    ensureDir(dirname(path));
}
export function readText(path) {
    return readFileSync(path, "utf-8");
}
export function writeText(path, text) {
    ensureParentDir(path);
    writeFileSync(path, text, "utf-8");
}
export function appendText(path, text) {
    ensureParentDir(path);
    appendFileSync(path, text, "utf-8");
}
export function writeJson(path, value) {
    writeText(path, JSON.stringify(value, null, 2));
}
export function readJson(path) {
    return JSON.parse(readText(path));
}
export function pathExists(path) {
    return existsSync(path);
}
export function listDirNames(path) {
    if (!existsSync(path))
        return [];
    return readdirSync(path).filter((name) => {
        try {
            return statSync(join(path, name)).isDirectory();
        }
        catch {
            return false;
        }
    });
}
export function listFileNames(path) {
    if (!existsSync(path))
        return [];
    return readdirSync(path).filter((name) => {
        try {
            return statSync(join(path, name)).isFile();
        }
        catch {
            return false;
        }
    });
}
//# sourceMappingURL=fs.js.map