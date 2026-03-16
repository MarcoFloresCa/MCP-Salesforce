import { z } from 'zod';
export declare const queryToolingParams: z.ZodObject<{
    orgAlias: z.ZodString;
    query: z.ZodString;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    orgAlias: string;
    query: string;
    limit?: number | undefined;
}, {
    orgAlias: string;
    query: string;
    limit?: number | undefined;
}>;
export type QueryToolingParams = z.infer<typeof queryToolingParams>;
interface ToolingQueryResult {
    totalSize: number;
    done: boolean;
    records: Record<string, unknown>[];
}
export declare function queryTooling(params: QueryToolingParams): Promise<{
    result: ToolingQueryResult;
    query: string;
    orgAlias: string;
    environment: string;
    executionTime: number;
}>;
export {};
//# sourceMappingURL=query-tooling.d.ts.map