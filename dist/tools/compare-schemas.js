import { z } from 'zod';
import { createConnection } from '../auth/factory.js';
import { validateOrgAccess } from '../policies/guard.js';
import { logger } from '../logging/index.js';
import { enrichField } from '../enrichers/field.js';
import { compareFieldDifferences, assessImpact } from '../enrichers/object.js';
export const compareSchemasParams = z.object({
    orgAlias: z.string().describe('Source org alias (typically production or source environment)'),
    targetOrgAlias: z.string().describe('Target org alias to compare against'),
    objectApiNames: z.array(z.string()).optional().describe('Specific objects to compare (optional, compares all if not provided)'),
    includeFields: z.boolean().optional().default(true).describe('Include field-level differences'),
});
export async function compareSchemas(params) {
    logger.info(`Comparing schemas between '${params.orgAlias}' and '${params.targetOrgAlias}'`, {
        tool: 'compare_schemas',
        sourceOrg: params.orgAlias,
        targetOrg: params.targetOrgAlias,
        objectCount: params.objectApiNames?.length || 'all',
    });
    const sourceAccess = validateOrgAccess(params.orgAlias);
    const targetAccess = validateOrgAccess(params.targetOrgAlias);
    if (!sourceAccess.allowed) {
        throw new Error(sourceAccess.error);
    }
    if (!targetAccess.allowed) {
        throw new Error(targetAccess.error);
    }
    const sourceConnection = await createConnection(params.orgAlias);
    const targetConnection = await createConnection(params.targetOrgAlias);
    const sourceConn = sourceConnection.getConnection();
    const targetConn = targetConnection.getConnection();
    const sourceDescribe = await sourceConn.describeGlobal();
    const targetDescribe = await targetConn.describeGlobal();
    const sourceObjects = new Map((sourceDescribe.sobjects || []).map((s) => [s.name || '', s]));
    const targetObjects = new Map((targetDescribe.sobjects || []).map((s) => [s.name || '', s]));
    const sourceOnly = [...sourceObjects.keys()].filter(k => !targetObjects.has(k));
    const targetOnly = [...targetObjects.keys()].filter(k => !sourceObjects.has(k));
    const common = [...sourceObjects.keys()].filter(k => targetObjects.has(k));
    const differences = [];
    const objectsToCompare = params.objectApiNames || common;
    for (const objectName of objectsToCompare) {
        if (!sourceObjects.has(objectName) || !targetObjects.has(objectName)) {
            continue;
        }
        if (!params.includeFields) {
            continue;
        }
        const sourceDescribeResult = await sourceConn.describe(objectName);
        const targetDescribeResult = await targetConn.describe(objectName);
        const sourceFields = new Map((sourceDescribeResult.fields || []).map((f) => [f.name || '', enrichField(f)]));
        const targetFields = new Map((targetDescribeResult.fields || []).map((f) => [f.name || '', enrichField(f)]));
        const fieldsOnlyInSource = [...sourceFields.keys()].filter(k => !targetFields.has(k)).map(k => sourceFields.get(k));
        const fieldsOnlyInTarget = [...targetFields.keys()].filter(k => !sourceFields.has(k)).map(k => targetFields.get(k));
        const typeChanges = [];
        const formulaChanges = [];
        for (const [fieldName, sourceField] of sourceFields) {
            const targetField = targetFields.get(fieldName);
            if (!targetField)
                continue;
            const diffs = compareFieldDifferences(sourceField, targetField);
            if (diffs.typeChanged) {
                typeChanges.push({
                    field: fieldName,
                    sourceType: sourceField.type,
                    targetType: targetField.type,
                });
            }
            if (diffs.formulaChanged) {
                formulaChanges.push({
                    field: fieldName,
                    sourceFormula: sourceField.formula || '',
                    targetFormula: targetField.formula || '',
                });
            }
        }
        if (fieldsOnlyInSource.length > 0 ||
            fieldsOnlyInTarget.length > 0 ||
            typeChanges.length > 0 ||
            formulaChanges.length > 0) {
            const impact = assessImpact(objectName, { typeChanged: typeChanges.length > 0, formulaChanged: formulaChanges.length > 0, picklistChanged: false, referenceChanged: false }, fieldsOnlyInSource);
            const likelyIssues = generateLikelyIssues(objectName, fieldsOnlyInSource, typeChanges, formulaChanges);
            differences.push({
                objectApiName: objectName,
                objectLabel: sourceDescribeResult.label || objectName,
                differences: {
                    fieldsOnlyInSource,
                    fieldsOnlyInTarget,
                    typeChanges,
                    formulaChanges,
                },
                impactAssessment: impact,
                likelyIssues,
            });
        }
    }
    const comparison = {
        sourceOrg: params.orgAlias,
        targetOrg: params.targetOrgAlias,
        comparedAt: new Date().toISOString(),
        summary: {
            sourceObjectCount: sourceObjects.size,
            targetObjectCount: targetObjects.size,
            objectsOnlyInSource: sourceOnly,
            objectsOnlyInTarget: targetOnly,
            objectsWithDiffs: differences.length,
        },
        differences: differences.sort((a, b) => {
            const impactOrder = { HIGH: 0, MEDIUM: 1, LOW: 2, NONE: 3 };
            return impactOrder[a.impactAssessment] - impactOrder[b.impactAssessment];
        }),
    };
    logger.info(`Schema comparison completed: ${differences.length} objects with differences`, {
        tool: 'compare_schemas',
        sourceOrg: params.orgAlias,
        targetOrg: params.targetOrgAlias,
        diffCount: differences.length,
    });
    return { comparison };
}
function generateLikelyIssues(objectName, fieldsOnlyInSource, typeChanges, formulaChanges) {
    const issues = [];
    for (const field of fieldsOnlyInSource) {
        if (field.isFormula) {
            issues.push(`Formula field '${field.apiName}' exists in source but not in target - Apex references will fail`);
        }
        else if (field.type === 'reference') {
            issues.push(`Custom lookup field '${field.apiName}' missing in target - may break Flows and Apex`);
        }
        else if (field.type === 'picklist') {
            issues.push(`Picklist field '${field.apiName}' missing in target - validation rules may fail`);
        }
        else {
            issues.push(`Field '${field.apiName}' (${field.type}) missing in target - may break ${field.isCustom ? 'custom' : 'standard'} logic`);
        }
    }
    for (const change of typeChanges) {
        issues.push(`Field '${change.field}' type changed from '${change.sourceType}' to '${change.targetType}' - may break Apex and Flows`);
    }
    for (const change of formulaChanges) {
        issues.push(`Formula '${change.field}' has been modified - existing calculations may produce different results`);
    }
    return issues;
}
//# sourceMappingURL=compare-schemas.js.map