export type GccState = {
    version: 1;
    currentBranch: string;
};
export declare function defaultState(): GccState;
export declare function loadState(cwd: string): GccState;
export declare function saveState(cwd: string, state: GccState): void;
//# sourceMappingURL=state.d.ts.map