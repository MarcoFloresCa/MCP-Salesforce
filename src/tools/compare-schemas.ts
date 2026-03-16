import { z } from 'zod';
import { createConnection } from '../auth/factory.js';
import { validateOrgAccess } from '../policies/guard.js';
import { isProductionOrg } from '../config/loader.js';
import { logger } from '../logging/index.js';
import { SchemaComparisonResult, EnrichedField } from '../config/types.js';
import { enrichField } from '../enrichers/field.js';
import { compareFieldDifferences, assessImpact } from '../enrichers/object.js';

export const compareSchemasParams = z.object({
  orgAlias: z.string().describe('Source org alias (typically production or source environment)'),
  targetOrgAlias: z.string().describe('Target org alias to compare against'),
  objectApiNames: z.array(z.string()).optional().describe('Specific objects to compare (optional, compares all if not provided)'),
  includeFields: z.boolean().optional().default(true).describe('Include field-level differences'),
});

export type CompareSchemasParams = z.infer<typeof compareSchemasParams>;

export async function compareSchemas(
  params: CompareSchemasParams
): Promise<{
  comparison: SchemaComparisonResult;
}> {
  const startTime = Date.now();
  const orgAlias = params.orgAlias;
  const targetOrgAlias = params.targetOrgAlias;
  
  logger.info(`Comparing schemas between '${orgAlias}' and '${targetOrgAlias}'`, {
    tool: 'compare_schemas',
    sourceOrg: orgAlias,
    targetOrg: targetOrgAlias,
    objectCount: params.objectApiNames?.length || 'all',
  });

  const sourceAccess = validateOrgAccess(orgAlias);
  const targetAccess = validateOrgAccess(targetOrgAlias);
  const sourceEnvironment = isProductionOrg(orgAlias) ? 'production' : 'sandbox';
  const targetEnvironment = isProductionOrg(targetOrgAlias) ? 'production' : 'sandbox';
  
  if (!sourceAccess.allowed) {
    const duration = Date.now() - startTime;
    logger.audit({
      orgAlias,
      environment: sourceEnvironment,
      tool: 'compare_schemas',
      status: 'blocked',
      durationMs: duration,
      requiresConfirmation: sourceAccess.requiresConfirmation,
      wasConfirmed: sourceAccess.confirmed,
      error: sourceAccess.error,
    });
    throw new Error(sourceAccess.error);
  }
  
  if (!targetAccess.allowed) {
    const duration = Date.now() - startTime;
    logger.audit({
      orgAlias: targetOrgAlias,
      environment: targetEnvironment,
      tool: 'compare_schemas',
      status: 'blocked',
      durationMs: duration,
      requiresConfirmation: targetAccess.requiresConfirmation,
      wasConfirmed: targetAccess.confirmed,
      error: targetAccess.error,
    });
    throw new Error(targetAccess.error);
  }

  if (sourceAccess.warning) {
    logger.warn(sourceAccess.warning, { tool: 'compare_schemas' });
  }
  if (targetAccess.warning) {
    logger.warn(targetAccess.warning, { tool: 'compare_schemas' });
  }

  const sourceConnection = await createConnection(orgAlias);
  const targetConnection = await createConnection(targetOrgAlias);

  const sourceConn = sourceConnection.getConnection();
  const targetConn = targetConnection.getConnection();

  let sourceDescribe: any;
  let targetDescribe: any;
  
  try {
    sourceDescribe = await sourceConn.describeGlobal();
    targetDescribe = await targetConn.describeGlobal();
  } catch (e) {
    const duration = Date.now() - startTime;
    logger.audit({
      orgAlias,
      environment: sourceEnvironment,
      tool: 'compare_schemas',
      status: 'error',
      durationMs: duration,
      requiresConfirmation: sourceAccess.requiresConfirmation || targetAccess.requiresConfirmation,
      wasConfirmed: sourceAccess.confirmed && targetAccess.confirmed,
      error: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }

  const sourceObjects = new Map<string, any>(
    (sourceDescribe.sobjects || []).map((s: any) => [s.name || '', s])
  );
  const targetObjects = new Map<string, any>(
    (targetDescribe.sobjects || []).map((s: any) => [s.name || '', s])
  );

  const sourceOnly = [...sourceObjects.keys()].filter(
    k => !targetObjects.has(k)
  );
  const targetOnly = [...targetObjects.keys()].filter(
    k => !sourceObjects.has(k)
  );
  const common = [...sourceObjects.keys()].filter(
    k => targetObjects.has(k)
  );

  const differences: SchemaComparisonResult['differences'] = [];

  const objectsToCompare = params.objectApiNames || common;

  for (const objectName of objectsToCompare) {
    if (!sourceObjects.has(objectName) || !targetObjects.has(objectName)) {
      continue;
    }

    if (!params.includeFields) {
      continue;
    }

    const sourceDescribeResult: any = await sourceConn.describe(objectName);
    const targetDescribeResult: any = await targetConn.describe(objectName);

    const sourceFields = new Map<string, EnrichedField>(
      (sourceDescribeResult.fields || []).map((f: any) => [f.name || '', enrichField(f)])
    );
    const targetFields = new Map<string, EnrichedField>(
      (targetDescribeResult.fields || []).map((f: any) => [f.name || '', enrichField(f)])
    );

    const fieldsOnlyInSource: EnrichedField[] = [...sourceFields.keys()].filter(
      k => !targetFields.has(k)
    ).map(k => sourceFields.get(k)!);

    const fieldsOnlyInTarget: EnrichedField[] = [...targetFields.keys()].filter(
      k => !sourceFields.has(k)
    ).map(k => targetFields.get(k)!);

    const typeChanges: Array<{ field: string; sourceType: string; targetType: string }> = [];
    const formulaChanges: Array<{ field: string; sourceFormula: string; targetFormula: string }> = [];

    for (const [fieldName, sourceField] of sourceFields) {
      const targetField = targetFields.get(fieldName);
      if (!targetField) continue;

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
      
      const impact = assessImpact(objectName, 
        { typeChanged: typeChanges.length > 0, formulaChanged: formulaChanges.length > 0, picklistChanged: false, referenceChanged: false },
        fieldsOnlyInSource
      );

      const likelyIssues = generateLikelyIssues(
        objectName,
        fieldsOnlyInSource,
        typeChanges,
        formulaChanges
      );

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

  const comparison: SchemaComparisonResult = {
    sourceOrg: orgAlias,
    targetOrg: targetOrgAlias,
    comparedAt: new Date().toISOString(),
    summary: {
      sourceObjectCount: sourceObjects.size,
      targetObjectCount: targetObjects.size,
      objectsOnlyInSource: sourceOnly,
      objectsOnlyInTarget: targetOnly,
      objectsWithDiffs: differences.length,
    },
    differences: differences.sort((a, b) => {
      const impactOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2, NONE: 3 };
      return impactOrder[a.impactAssessment] - impactOrder[b.impactAssessment];
    }),
  };

  const duration = Date.now() - startTime;

  logger.info(`Schema comparison completed: ${differences.length} objects with differences`, {
    tool: 'compare_schemas',
    sourceOrg: orgAlias,
    targetOrg: targetOrgAlias,
    diffCount: differences.length,
    durationMs: duration,
  });

  logger.audit({
    orgAlias,
    environment: sourceEnvironment,
    tool: 'compare_schemas',
    status: 'success',
    durationMs: duration,
    recordCount: differences.length,
    requiresConfirmation: sourceAccess.requiresConfirmation || targetAccess.requiresConfirmation,
    wasConfirmed: sourceAccess.confirmed && targetAccess.confirmed,
  });

  return { comparison };
}

function generateLikelyIssues(
  objectName: string,
  fieldsOnlyInSource: EnrichedField[],
  typeChanges: Array<{ field: string; sourceType: string; targetType: string }>,
  formulaChanges: Array<{ field: string; sourceFormula: string; targetFormula: string }>
): string[] {
  const issues: string[] = [];

  for (const field of fieldsOnlyInSource) {
    if (field.isFormula) {
      issues.push(`Formula field '${field.apiName}' exists in source but not in target - Apex references will fail`);
    } else if (field.type === 'reference') {
      issues.push(`Custom lookup field '${field.apiName}' missing in target - may break Flows and Apex`);
    } else if (field.type === 'picklist') {
      issues.push(`Picklist field '${field.apiName}' missing in target - validation rules may fail`);
    } else {
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
