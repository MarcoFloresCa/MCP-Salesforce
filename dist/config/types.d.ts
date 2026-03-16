export type Environment = 'sandbox' | 'production';
export interface OrgConfig {
    alias: string;
    environment: Environment;
    loginUrl: string;
    username: string;
    password: string;
    securityToken: string;
}
export interface ServerConfig {
    orgs: OrgConfig[];
    defaultOrgAlias: string;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    productionConfirmationToken?: string;
}
export interface OrgAccessResult {
    allowed: boolean;
    mode: 'read-only' | 'read-write';
    requiresConfirmation: boolean;
    confirmed: boolean;
    warning?: string;
    error?: string;
}
export interface SessionConfirmation {
    orgAlias: string;
    confirmedAt: Date;
}
export interface AuditLogEntry {
    timestamp: string;
    orgAlias: string;
    environment: Environment;
    tool: string;
    status: 'success' | 'error' | 'blocked';
    durationMs?: number;
    recordCount?: number;
    querySanitized?: string;
    error?: string;
    requiresConfirmation: boolean;
    wasConfirmed: boolean;
}
export interface EnrichedField {
    apiName: string;
    label: string;
    type: string;
    isCustom: boolean;
    isFormula: boolean;
    formula?: string;
    calculatedFormula?: string;
    formulaReturnType?: string;
    formulaTreatNullAsBlank?: boolean;
    referenceTo?: string[];
    referenceNameField?: string;
    relationshipName?: string;
    picklistValues?: Array<{
        value: string;
        label: string;
        default: boolean;
        active: boolean;
    }>;
    createable: boolean;
    updateable: boolean;
    nillable: boolean;
    defaultValue?: unknown;
    helpText?: string;
    description?: string;
    length?: number;
    precision?: number;
    scale?: number;
    formulaReferences?: string[];
    formulaComplexity?: 'simple' | 'medium' | 'complex';
}
export interface EnrichedObject {
    apiName: string;
    label: string;
    isCustom: boolean;
    createable: boolean;
    updateable: boolean;
    deleteable: boolean;
    queryable: boolean;
    retrieveable: boolean;
    fields: EnrichedField[];
    recordTypeInfo?: Array<{
        recordTypeId: string;
        name: string;
        developerName: string;
        active: boolean;
        defaultRecordTypeMapping: boolean;
    }>;
    childRelationships?: Array<{
        childSObject: string;
        relationshipName: string;
        cascadeDelete: boolean;
    }>;
}
export interface SchemaComparisonResult {
    sourceOrg: string;
    targetOrg: string;
    comparedAt: string;
    summary: {
        sourceObjectCount: number;
        targetObjectCount: number;
        objectsOnlyInSource: string[];
        objectsOnlyInTarget: string[];
        objectsWithDiffs: number;
    };
    differences: Array<{
        objectApiName: string;
        objectLabel: string;
        differences: {
            fieldsOnlyInSource: EnrichedField[];
            fieldsOnlyInTarget: EnrichedField[];
            typeChanges: Array<{
                field: string;
                sourceType: string;
                targetType: string;
            }>;
            formulaChanges: Array<{
                field: string;
                sourceFormula: string;
                targetFormula: string;
            }>;
        };
        impactAssessment: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
        likelyIssues: string[];
    }>;
}
//# sourceMappingURL=types.d.ts.map