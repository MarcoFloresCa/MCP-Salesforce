import { EnrichedField } from '../config/types.js';

export function enrichField(field: any): EnrichedField {
  const base: EnrichedField = {
    apiName: field.name || '',
    label: field.label || '',
    type: field.type || '',
    isCustom: field.custom || false,
    isFormula: field.calculated === true,
    createable: field.createable || false,
    updateable: field.updateable || false,
    nillable: field.nillable || false,
    defaultValue: field.defaultValue,
    helpText: field.inlineHelpText,
  };

  if (field.length) {
    base.length = field.length;
  }
  if (field.precision) {
    base.precision = field.precision;
  }
  if (field.scale) {
    base.scale = field.scale;
  }

  if (field.calculatedFormula) {
    base.formula = field.calculatedFormula;
    base.calculatedFormula = field.calculatedFormula;
    base.formulaReturnType = field.type;
    base.formulaTreatNullAsBlank = (field as any).formulaTreatNullAsBlank === 'Blank';

    const references = extractFieldReferences(field.calculatedFormula);
    base.formulaReferences = references;
    base.formulaComplexity = analyzeFormulaComplexity(field.calculatedFormula);
  }

  if (field.type === 'reference' && field.referenceTo) {
    base.referenceTo = field.referenceTo;
    base.relationshipName = field.relationshipName;
    base.referenceNameField = field.nameField;
  }

  if (field.type === 'picklist' || field.type === 'multipicklist') {
    base.picklistValues = (field.picklistValues || []).map((pv: any) => ({
      value: pv.value || '',
      label: pv.label || '',
      default: pv.defaultValue === true,
      active: pv.active || false,
    }));
  }

  return base;
}

function extractFieldReferences(formula: string): string[] {
  if (!formula) return [];

  const fieldMatches = new Set<string>();
  
  const customFieldPattern = /(\w+__c)/g;
  let match;
  while ((match = customFieldPattern.exec(formula)) !== null) {
    fieldMatches.add(match[1]);
  }

  const standardPattern = /{(\w+)}/g;
  while ((match = standardPattern.exec(formula)) !== null) {
    fieldMatches.add(match[1]);
  }

  return Array.from(fieldMatches);
}

function analyzeFormulaComplexity(formula: string): 'simple' | 'medium' | 'complex' {
  if (!formula) return 'simple';

  const functionCount = (formula.match(/\w+\(/g) || []).length;
  const operatorCount = (formula.match(/[+\-*/<>=!&|]+/g) || []).length;
  const referenceCount = (formula.match(/{[^}]+}/g) || []).length;

  const score = functionCount * 2 + operatorCount + referenceCount;

  if (score <= 3) return 'simple';
  if (score <= 8) return 'medium';
  return 'complex';
}

export function enrichObjectDescribe(describe: any) {
  return {
    apiName: describe.name || '',
    label: describe.label || '',
    isCustom: describe.custom || false,
    createable: describe.createable || false,
    updateable: describe.updateable || false,
    deleteable: describe.deletable || false,
    queryable: describe.queryable || false,
    retrieveable: describe.retrieveable || false,
    recordTypeInfo: describe.recordTypeInfos?.map((rt: any) => ({
      recordTypeId: rt.recordTypeId || '',
      name: rt.name || '',
      developerName: rt.developerName || '',
      active: rt.active || false,
      defaultRecordTypeMapping: rt.defaultRecordTypeMapping || false,
    })),
    childRelationships: describe.childRelationships?.map((cr: any) => ({
      childSObject: cr.childSObject || '',
      relationshipName: cr.relationshipName || '',
      cascadeDelete: cr.cascadeDelete || false,
    })),
  };
}
