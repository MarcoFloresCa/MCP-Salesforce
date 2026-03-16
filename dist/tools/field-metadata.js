import { z } from 'zod';
import { createConnection } from '../auth/factory.js';
import { validateOrgAccess } from '../policies/guard.js';
import { isProductionOrg } from '../config/loader.js';
import { logger } from '../logging/index.js';
import { enrichField } from '../enrichers/field.js';
export const fieldMetadataParams = z.object({
    orgAlias: z.string().describe('Alias of the Salesforce org to query'),
    objectApiName: z.string().describe('API name of the object'),
    fieldApiName: z.string().describe('API name of the field'),
});
export async function fieldMetadata(params) {
    const startTime = Date.now();
    const orgAlias = params.orgAlias;
    const objectApiName = params.objectApiName;
    const fieldApiName = params.fieldApiName;
    logger.info(`Getting metadata for field '${fieldApiName}' on '${objectApiName}' in org '${orgAlias}'`, {
        tool: 'field_metadata',
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
            tool: 'get_field_metadata',
            status: 'blocked',
            durationMs: duration,
            requiresConfirmation: access.requiresConfirmation,
            wasConfirmed: access.confirmed,
            error: access.error,
        });
        throw new Error(access.error);
    }
    if (access.warning) {
        logger.warn(access.warning, { tool: 'field_metadata' });
    }
    const connection = await createConnection(orgAlias);
    const conn = connection.getConnection();
    let describeResult;
    try {
        describeResult = await conn.describe(objectApiName);
    }
    catch (e) {
        const duration = Date.now() - startTime;
        logger.audit({
            orgAlias,
            environment,
            tool: 'get_field_metadata',
            status: 'error',
            durationMs: duration,
            requiresConfirmation: access.requiresConfirmation,
            wasConfirmed: access.confirmed,
            error: e instanceof Error ? e.message : String(e),
        });
        throw e;
    }
    const field = describeResult.fields?.find((f) => f.name === fieldApiName);
    if (!field) {
        const duration = Date.now() - startTime;
        const error = `Field '${fieldApiName}' not found on object '${objectApiName}' in org '${orgAlias}'`;
        logger.audit({
            orgAlias,
            environment,
            tool: 'get_field_metadata',
            status: 'error',
            durationMs: duration,
            requiresConfirmation: access.requiresConfirmation,
            wasConfirmed: access.confirmed,
            error,
        });
        throw new Error(error);
    }
    const enriched = enrichField(field);
    const duration = Date.now() - startTime;
    logger.info(`Successfully retrieved metadata for field '${fieldApiName}'`, {
        tool: 'field_metadata',
        orgAlias,
        objectApiName,
        fieldApiName,
        durationMs: duration,
    });
    logger.audit({
        orgAlias,
        environment,
        tool: 'get_field_metadata',
        status: 'success',
        durationMs: duration,
        requiresConfirmation: access.requiresConfirmation,
        wasConfirmed: access.confirmed,
    });
    return {
        field: enriched,
        objectApiName,
        orgAlias,
        environment,
    };
}
//# sourceMappingURL=field-metadata.js.map