import { enrichField } from './field.js';
export function enrichObject(describe) {
    const enriched = {
        apiName: describe.name || '',
        label: describe.label || '',
        isCustom: describe.custom || false,
        createable: describe.createable || false,
        updateable: describe.updateable || false,
        deleteable: describe.deletable || false,
        queryable: describe.queryable || false,
        retrieveable: describe.retrieveable || false,
        fields: (describe.fields || []).map((f) => enrichField(f)),
    };
    if (describe.recordTypeInfos && describe.recordTypeInfos.length > 0) {
        enriched.recordTypeInfo = describe.recordTypeInfos.map((rt) => ({
            recordTypeId: rt.recordTypeId || '',
            name: rt.name || '',
            developerName: rt.developerName || '',
            active: rt.active || false,
            defaultRecordTypeMapping: rt.defaultRecordTypeMapping || false,
        }));
    }
    if (describe.childRelationships && describe.childRelationships.length > 0) {
        enriched.childRelationships = describe.childRelationships.map((cr) => ({
            childSObject: cr.childSObject || '',
            relationshipName: cr.relationshipName || '',
            cascadeDelete: cr.cascadeDelete || false,
        }));
    }
    return enriched;
}
export function compareFieldDifferences(sourceField, targetField) {
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
export function assessImpact(objectName, differences, fieldsOnlyInSource) {
    if (fieldsOnlyInSource.length === 0 &&
        !differences.typeChanged &&
        !differences.formulaChanged) {
        return 'NONE';
    }
    const highImpactTypes = ['formula', 'master-detail', 'roll-up summary'];
    const hasHighImpactFields = fieldsOnlyInSource.some(f => highImpactTypes.includes(f.type) || f.isFormula);
    if (hasHighImpactFields || differences.formulaChanged) {
        return 'HIGH';
    }
    const mediumImpactTypes = ['picklist', 'reference', 'number', 'currency'];
    const hasMediumImpactFields = fieldsOnlyInSource.some(f => mediumImpactTypes.includes(f.type));
    if (hasMediumImpactFields || differences.typeChanged) {
        return 'MEDIUM';
    }
    return 'LOW';
}
//# sourceMappingURL=object.js.map