import { z } from 'zod';
export declare const listObjectsParams: z.ZodObject<{
    orgAlias: z.ZodString;
}, "strip", z.ZodTypeAny, {
    orgAlias: string;
}, {
    orgAlias: string;
}>;
export type ListObjectsParams = z.infer<typeof listObjectsParams>;
interface ObjectSummary {
    apiName: string;
    label: string;
    isCustom: boolean;
    createable: boolean;
    queryable: boolean;
    description?: string;
}
export declare function listObjects(params: ListObjectsParams): Promise<{
    objects: ObjectSummary[];
    orgAlias: string;
    environment: string;
    count: number;
}>;
export {};
//# sourceMappingURL=list-objects.d.ts.map