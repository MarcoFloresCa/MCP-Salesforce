import { z } from 'zod';
import { EnrichedObject } from '../config/types.js';
export declare const describeObjectParams: z.ZodObject<{
    orgAlias: z.ZodString;
    objectApiName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    orgAlias: string;
    objectApiName: string;
}, {
    orgAlias: string;
    objectApiName: string;
}>;
export type DescribeObjectParams = z.infer<typeof describeObjectParams>;
export declare function describeObject(params: DescribeObjectParams): Promise<{
    object: EnrichedObject;
    orgAlias: string;
    environment: string;
}>;
//# sourceMappingURL=describe-object.d.ts.map