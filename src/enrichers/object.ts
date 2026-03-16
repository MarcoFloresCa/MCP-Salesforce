import { EnrichedObject, EnrichedField } from '../config/types.js';
import { enrichField } from './field.js';

export function enrichObject(describe: any): EnrichedObject {
  const enriched: EnrichedObject = {
    apiName: describe.name || '',
    label: describe.label || '',
    isCustom: describe.custom || false,
    createable: describe.createable || false,
    updateable: describe.updateable || false,
    deleteable: describe.deletable || false,
    queryable: describe.queryable || false,
    retrieveable: describe.retrieveable || false,
    fields: (describe.fields || []).map((f: any) => enrichField(f)),
  };

  if (describe.recordTypeInfos && describe.recordTypeInfos.length > 0) {
    enriched.recordTypeInfo = describe.recordTypeInfos.map((rt: any) => ({
      recordTypeId: rt.recordTypeId || '',
      name: rt.name || '',
      developerName: rt.developerName || '',
      active: rt.active || false,
      defaultRecordTypeMapping: rt.defaultRecordTypeMapping || false,
    }));
  }

  if (describe.childRelationships && describe.childRelationships.length > 0) {
    enriched.childRelationships = describe.childRelationships.map((cr: any) => ({
      childSObject: cr.childSObject || '',
      relationshipName: cr.relationshipName || '',
      cascadeDelete: cr.cascadeDelete || false,
    }));
  }

  return enriched;
}

export function compareFieldDifferences(
  sourceField: EnrichedField,
  targetField: EnrichedField | undefined
): {
  typeChanged: boolean;
  formulaChanged: boolean;
  picklistChanged: boolean;
  referenceChanged: boolean;
} {
  if (!targetField) {
    return {
      typeChanged: false,
      formulaChanged: false,
      picklistChanged: false,
      referenceChanged: false,
    };
  }

  return {
    typeChanged: sourceField.type !== targetField.type,
    formulaChanged: sourceField.formula !== targetField.formula,
    picklistChanged: JSON.stringify(sourceField.picklistValues) !== JSON.stringify(targetField.picklistValues),
    referenceChanged: JSON.stringify(sourceField.referenceTo) !== JSON.stringify(targetField.referenceTo),
  };
}

export function assessImpact(
  objectName: string,
  differences: ReturnType<typeof compareFieldDifferences>,
  fieldsOnlyInSource: EnrichedField[]
): 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' {
  if (fieldsOnlyInSource.length === 0 && 
      !differences.typeChanged && 
      !differences.formulaChanged) {
    return 'NONE';
  }

  const highImpactTypes = ['formula', 'master-detail', 'roll-up summary'];
  const hasHighImpactFields = fieldsOnlyInSource.some(f => 
    highImpactTypes.includes(f.type) || f.isFormula
  );

  if (hasHighImpactFields || differences.formulaChanged) {
    return 'HIGH';
  }

  const mediumImpactTypes = ['picklist', 'reference', 'number', 'currency'];
  const hasMediumImpactFields = fieldsOnlyInSource.some(f =>
    mediumImpactTypes.includes(f.type)
  );

  if (hasMediumImpactFields || differences.typeChanged) {
    return 'MEDIUM';
  }

  return 'LOW';
}
