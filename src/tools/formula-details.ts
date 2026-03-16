import { z } from 'zod';
import { createConnection } from '../auth/factory.js';
import { validateOrgAccess } from '../policies/guard.js';
import { isProductionOrg } from '../config/loader.js';
import { logger } from '../logging/index.js';
import { EnrichedField } from '../config/types.js';
import { enrichField } from '../enrichers/field.js';

export const formulaDetailsParams = z.object({
  orgAlias: z.string().describe('Alias of the Salesforce org to query'),
  objectApiName: z.string().describe('API name of the object'),
  fieldApiName: z.string().describe('API name of the formula field'),
});

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

export async function formulaDetails(
  params: FormulaDetailsParams
): Promise<{
  formula: FormulaAnalysis;
  objectApiName: string;
  orgAlias: string;
  environment: string;
}> {
  const startTime = Date.now();
  const orgAlias = params.orgAlias;
  const objectApiName = params.objectApiName;
  const fieldApiName = params.fieldApiName;
  
  logger.info(`Analyzing formula field '${fieldApiName}' on '${objectApiName}' in org '${orgAlias}'`, {
    tool: 'formula_details',
    orgAlias,
    objectApiName,
    fieldApiName,
  });

  const access = validateOrgAccess(orgAlias);
  const environment = isProductionOrg(orgAlias) ? 'production' : 'sandbox';
  
  if (!access.allowed) {
    const duration = Date.now() - startTime;
    logger.audit({
      orgAlias,
      environment,
      tool: 'get_formula_field_details',
      status: 'blocked',
      durationMs: duration,
      requiresConfirmation: access.requiresConfirmation,
      wasConfirmed: access.confirmed,
      error: access.error,
    });
    throw new Error(access.error);
  }

  if (access.warning) {
    logger.warn(access.warning, { tool: 'formula_details' });
  }

  const connection = await createConnection(orgAlias);
  const conn = connection.getConnection();

  let describeResult: any;
  try {
    describeResult = await conn.describe(objectApiName);
  } catch (e) {
    const duration = Date.now() - startTime;
    logger.audit({
      orgAlias,
      environment,
      tool: 'get_formula_field_details',
      status: 'error',
      durationMs: duration,
      requiresConfirmation: access.requiresConfirmation,
      wasConfirmed: access.confirmed,
      error: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
  
  const field: any = describeResult.fields?.find(
    (f: any) => f.name === fieldApiName
  );

  if (!field) {
    const duration = Date.now() - startTime;
    const error = `Field '${fieldApiName}' not found on object '${objectApiName}' in org '${orgAlias}'`;
    logger.audit({
      orgAlias,
      environment,
      tool: 'get_formula_field_details',
      status: 'error',
      durationMs: duration,
      requiresConfirmation: access.requiresConfirmation,
      wasConfirmed: access.confirmed,
      error,
    });
    throw new Error(error);
  }

  if (!field.calculated) {
    const duration = Date.now() - startTime;
    const error = `Field '${fieldApiName}' is not a formula field`;
    logger.audit({
      orgAlias,
      environment,
      tool: 'get_formula_field_details',
      status: 'error',
      durationMs: duration,
      requiresConfirmation: access.requiresConfirmation,
      wasConfirmed: access.confirmed,
      error,
    });
    throw new Error(error);
  }

  const enriched = enrichField(field);
  const formulaText = field.calculatedFormula || '';

  const references = extractFormulaReferences(formulaText);
  const standardFields = references.filter(r => !r.endsWith('__c') && !r.includes('__'));
  const customFields = references.filter(r => r.endsWith('__c') || r.includes('__'));

  const impactAreas = analyzeImpactAreas(field.type, enriched.formulaReturnType || '', references);

  const analysis = {
    formulaText,
    returnType: enriched.formulaReturnType || field.type,
    references,
    complexity: enriched.formulaComplexity || 'simple',
    referencesStandardFields: standardFields,
    referencesCustomFields: customFields,
    likelyImpactAreas: impactAreas,
  };

  const duration = Date.now() - startTime;

  logger.info(`Successfully analyzed formula field '${fieldApiName}'`, {
    tool: 'formula_details',
    orgAlias,
    objectApiName,
    fieldApiName,
    complexity: analysis.complexity,
    referenceCount: references.length,
    durationMs: duration,
  });

  logger.audit({
    orgAlias,
    environment,
    tool: 'get_formula_field_details',
    status: 'success',
    durationMs: duration,
    requiresConfirmation: access.requiresConfirmation,
    wasConfirmed: access.confirmed,
  });

  return {
    formula: {
      field: enriched,
      analysis,
    },
    objectApiName,
    orgAlias,
    environment,
  };
}

function extractFormulaReferences(formula: string): string[] {
  if (!formula) return [];

  const references: string[] = [];
  const pattern = /{(\w+(?:\.\w+)*(?:__c)?)}/g;
  
  let match;
  while ((match = pattern.exec(formula)) !== null) {
    const ref = match[1];
    if (!references.includes(ref)) {
      references.push(ref);
    }
  }

  const namePattern = /(\w+(?:\.\w+)?)\.(\w+)/g;
  while ((match = namePattern.exec(formula)) !== null) {
    const ref = match[0];
    if (!references.includes(ref)) {
      references.push(ref);
    }
  }

  return references;
}

function analyzeImpactAreas(
  formulaType: string,
  returnType: string,
  references: string[]
): string[] {
  const impactAreas: string[] = [];

  if (references.some(r => r.includes('Owner') || r.includes('OwnerId'))) {
    impactAreas.push('Ownership-based automation');
  }

  if (references.some(r => r.includes('Date'))) {
    impactAreas.push('Date-based validation rules');
  }

  if (references.some(r => r.toLowerCase().includes('price') || r.toLowerCase().includes('amount'))) {
    impactAreas.push('Financial calculations in Flows/Apex');
  }

  if (returnType === 'Boolean') {
    impactAreas.push('Criteria in Flows and Validation Rules');
  }

  if (formulaType === 'rollup' || formulaType === 'summary') {
    impactAreas.push('Roll-up summary changes can break subordinate record validations');
  }

  return impactAreas;
}
