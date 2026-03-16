import { EnrichedObject, EnrichedField } from '../config/types.js';
export declare function enrichObject(describe: any): EnrichedObject;
export declare function compareFieldDifferences(sourceField: EnrichedField, targetField: EnrichedField | undefined): {
    typeChanged: boolean;
    formulaChanged: boolean;
    picklistChanged: boolean;
    referenceChanged: boolean;
};
export declare function assessImpact(objectName: string, differences: ReturnType<typeof compareFieldDifferences>, fieldsOnlyInSource: EnrichedField[]): 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
//# sourceMappingURL=object.d.ts.map