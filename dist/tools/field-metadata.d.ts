import { z } from 'zod';
import { EnrichedField } from '../config/types.js';
export declare const fieldMetadataParams: z.ZodObject<{
    orgAlias: z.ZodString;
    objectApiName: z.ZodString;
    fieldApiName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    orgAlias: string;
    objectApiName: string;
    fieldApiName: string;
}, {
    orgAlias: string;
    objectApiName: string;
    fieldApiName: string;
}>;
export type FieldMetadataParams = z.infer<typeof fieldMetadataParams>;
export declare function fieldMetadata(params: FieldMetadataParams): Promise<{
    field: EnrichedField;
    objectApiName: string;
    orgAlias: string;
    environment: string;
}>;
//# sourceMappingURL=field-metadata.d.ts.map