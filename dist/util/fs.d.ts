export declare function ensureDir(path: string): void;
export declare function ensureParentDir(path: string): void;
export declare function readText(path: string): string;
export declare function writeText(path: string, text: string): void;
export declare function appendText(path: string, text: string): void;
export declare function writeJson(path: string, value: unknown): void;
export declare function readJson<T>(path: string): T;
export declare function pathExists(path: string): boolean;
export declare function listDirNames(path: string): string[];
export declare function listFileNames(path: string): string[];
//# sourceMappingURL=fs.d.ts.map