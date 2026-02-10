import { getGitSnapshot } from "../util/git.js";
export type CommitOptions = {
    cwd: string;
    branch: string;
    summary: string;
    details?: string;
    updateMain?: boolean;
    maxInlineChars?: number;
};
export type CommitRecord = {
    id: string;
    ts: string;
    kind: "commit" | "merge";
    branch: string;
    summary: string;
    details?: string;
    git: ReturnType<typeof getGitSnapshot>;
};
export declare function commitMilestone(opts: CommitOptions): CommitRecord;
//# sourceMappingURL=commit.d.ts.map