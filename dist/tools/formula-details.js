import { z } from 'zod';
import { createConnection } from '../auth/factory.js';
import { validateOrgAccess } from '../policies/guard.js';
import { logger } from '../logging/index.js';
import { enrichField } from '../enrichers/field.js';
export const formulaDetailsParams = z.object({
    orgAlias: z.string().describe('Alias of the Salesforce org to query'),
    objectApiName: z.string().describe('API name of the object'),
    fieldApiName: z.string().describe('API name of the formula field'),
});
export async function formulaDetails(params) {
    logger.info(`Analyzing formula field '${params.fieldApiName}' on '${params.objectApiName}' in org '${params.orgAlias}'`, {
        tool: 'formula_details',
        orgAlias: params.orgAlias,
        objectApiName: params.objectApiName,
        fieldApiName: params.fieldApiName,
    });
    const access = validateOrgAccess(params.orgAlias);
    if (!access.allowed) {
        throw new Error(access.error);
    }
    if (access.warning) {
        logger.warn(access.warning, { tool: 'formula_details' });
    }
    const connection = await createConnection(params.orgAlias);
    const conn = connection.getConnection();
    const describeResult = await conn.describe(params.objectApiName);
    const field = describeResult.fields?.find((f) => f.name === params.fieldApiName);
    if (!field) {
        throw new Error(`Field '${params.fieldApiName}' not found on object '${params.objectApiName}' in org '${params.orgAlias}'`);
    }
    if (!field.calculated) {
        throw new Error(`Field '${params.fieldApiName}' is not a formula field`);
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
    logger.info(`Successfully analyzed formula field '${params.fieldApiName}'`, {
        tool: 'formula_details',
        orgAlias: params.orgAlias,
        objectApiName: params.objectApiName,
        fieldApiName: params.fieldApiName,
        complexity: analysis.complexity,
        referenceCount: references.length,
    });
    return {
        formula: {
            field: enriched,
            analysis,
        },
        objectApiName: params.objectApiName,
        orgAlias: params.orgAlias,
        environment: connection.isProduction() ? 'production' : 'sandbox',
    };
}
function extractFormulaReferences(formula) {
    if (!formula)
        return [];
    const references = [];
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
function analyzeImpactAreas(formulaType, returnType, references) {
    const impactAreas = [];
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
//# sourceMappingURL=formula-details.js.map