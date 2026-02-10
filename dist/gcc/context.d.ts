export type ContextScope = "status" | "main" | "branches" | "branch_head" | "branch_commits" | "commit_md" | "log_tail" | "metadata";
export type ContextRequest = {
    cwd: string;
    scope: ContextScope;
    branch?: string;
    tail?: number;
};
export declare function getContext(req: ContextRequest): unknown;
//# sourceMappingURL=context.d.ts.map