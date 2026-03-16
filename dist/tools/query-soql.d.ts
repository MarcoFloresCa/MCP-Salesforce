import { z } from 'zod';
export declare const querySoqlParams: z.ZodObject<{
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
export type QuerySoqlParams = z.infer<typeof querySoqlParams>;
interface QueryResult<T = Record<string, unknown>> {
    totalSize: number;
    done: boolean;
    records: T[];
    queryLocator?: string;
}
export declare function querySoql(params: QuerySoqlParams): Promise<{
    result: QueryResult;
    query: string;
    orgAlias: string;
    environment: string;
    executionTime: number;
}>;
export {};
//# sourceMappingURL=query-soql.d.ts.map