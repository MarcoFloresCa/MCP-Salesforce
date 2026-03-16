import { z } from 'zod';
import { SchemaComparisonResult } from '../config/types.js';
export declare const compareSchemasParams: z.ZodObject<{
    orgAlias: z.ZodString;
    targetOrgAlias: z.ZodString;
    objectApiNames: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    includeFields: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    orgAlias: string;
    targetOrgAlias: string;
    includeFields: boolean;
    objectApiNames?: string[] | undefined;
}, {
    orgAlias: string;
    targetOrgAlias: string;
    objectApiNames?: string[] | undefined;
    includeFields?: boolean | undefined;
}>;
export type CompareSchemasParams = z.infer<typeof compareSchemasParams>;
export declare function compareSchemas(params: CompareSchemasParams): Promise<{
    comparison: SchemaComparisonResult;
}>;
//# sourceMappingURL=compare-schemas.d.ts.map