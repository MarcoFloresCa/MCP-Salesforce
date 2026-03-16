import { z } from 'zod';
import { EnrichedField } from '../config/types.js';
export declare const formulaDetailsParams: z.ZodObject<{
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
export type FormulaDetailsParams = z.infer<typeof formulaDetailsParams>;
interface FormulaAnalysis {
    field: EnrichedField;
    analysis: {
        formulaText: string;
        returnType: string;
        references: string[];
        complexity: 'simple' | 'medium' | 'complex';
        referencesStandardFields: string[];
        referencesCustomFields: string[];
        likelyImpactAreas: string[];
    };
}
export declare function formulaDetails(params: FormulaDetailsParams): Promise<{
    formula: FormulaAnalysis;
    objectApiName: string;
    orgAlias: string;
    environment: string;
}>;
export {};
//# sourceMappingURL=formula-details.d.ts.map