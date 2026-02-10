export type InitOptions = {
    cwd: string;
    projectGoal: string;
    initialPlan?: string;
    overwrite?: boolean;
};
export declare function initGcc(opts: InitOptions): {
    rootDir: string;
    mainPath: string;
};
//# sourceMappingURL=init.d.ts.map