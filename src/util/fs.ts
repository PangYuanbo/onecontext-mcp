import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "fs";
import { dirname, join } from "path";

export function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

export function ensureParentDir(path: string): void {
  ensureDir(dirname(path));
}

export function readText(path: string): string {
  return readFileSync(path, "utf-8");
}

export function writeText(path: string, text: string): void {
  ensureParentDir(path);
  writeFileSync(path, text, "utf-8");
}

export function appendText(path: string, text: string): void {
  ensureParentDir(path);
  appendFileSync(path, text, "utf-8");
}

export function writeJson(path: string, value: unknown): void {
  writeText(path, JSON.stringify(value, null, 2));
}

export function readJson<T>(path: string): T {
  return JSON.parse(readText(path)) as T;
}

export function pathExists(path: string): boolean {
  return existsSync(path);
}

export function listDirNames(path: string): string[] {
  if (!existsSync(path)) return [];
  return readdirSync(path).filter((name) => {
    try {
      return statSync(join(path, name)).isDirectory();
    } catch {
      return false;
    }
  });
}

export function listFileNames(path: string): string[] {
  if (!existsSync(path)) return [];
  return readdirSync(path).filter((name) => {
    try {
      return statSync(join(path, name)).isFile();
    } catch {
      return false;
    }
  });
}
