import { z } from 'zod';
import { EnrichedField } from '../config/types.js';
export declare const listFieldsParams: z.ZodObject<{
    orgAlias: z.ZodString;
    objectApiName: z.ZodString;
    includeFormulasOnly: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    orgAlias: string;
    objectApiName: string;
    includeFormulasOnly?: boolean | undefined;
}, {
    orgAlias: string;
    objectApiName: string;
    includeFormulasOnly?: boolean | undefined;
}>;
export type ListFieldsParams = z.infer<typeof listFieldsParams>;
export declare function listFields(params: ListFieldsParams): Promise<{
    fields: EnrichedField[];
    objectApiName: string;
    orgAlias: string;
    environment: string;
    count: number;
}>;
//# sourceMappingURL=list-fields.d.ts.map