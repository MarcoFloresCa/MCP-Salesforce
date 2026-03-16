import { z } from 'zod';
import { createConnection } from '../auth/factory.js';
import { validateOrgAccess } from '../policies/guard.js';
import { isProductionOrg } from '../config/loader.js';
import { logger } from '../logging/index.js';
import { enrichObject } from '../enrichers/object.js';
export const describeObjectParams = z.object({
    orgAlias: z.string().describe('Alias of the Salesforce org to query'),
    objectApiName: z.string().describe('API name of the object (e.g., "Account", "CustomObject__c")'),
});
export async function describeObject(params) {
    const startTime = Date.now();
    const orgAlias = params.orgAlias;
    const objectApiName = params.objectApiName;
    logger.info(`Describing object '${objectApiName}' in org '${orgAlias}'`, {
        tool: 'describe_object',
        orgAlias,
        objectApiName,
    });
    const access = validateOrgAccess(orgAlias);
    const environment = isProductionOrg(orgAlias) ? 'production' : 'sandbox';
    if (!access.allowed) {
        const duration = Date.now() - startTime;
        logger.audit({
            orgAlias,
            environment,
            tool: 'describe_object',
            status: 'blocked',
            durationMs: duration,
            requiresConfirmation: access.requiresConfirmation,
            wasConfirmed: access.confirmed,
            error: access.error,
        });
        throw new Error(access.error);
    }
    if (access.warning) {
        logger.warn(access.warning, { tool: 'describe_object' });
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
            tool: 'describe_object',
            status: 'error',
            durationMs: duration,
            requiresConfirmation: access.requiresConfirmation,
            wasConfirmed: access.confirmed,
            error: e instanceof Error ? e.message : String(e),
        });
        throw e;
    }
    const enriched = enrichObject(describeResult);
    const duration = Date.now() - startTime;
    logger.info(`Successfully described object '${objectApiName}'`, {
        tool: 'describe_object',
        orgAlias,
        objectApiName,
        fieldCount: enriched.fields.length,
        durationMs: duration,
    });
    logger.audit({
        orgAlias,
        environment,
        tool: 'describe_object',
        status: 'success',
        durationMs: duration,
        recordCount: enriched.fields.length,
        requiresConfirmation: access.requiresConfirmation,
        wasConfirmed: access.confirmed,
    });
    return {
        object: enriched,
        orgAlias,
        environment,
    };
}
//# sourceMappingURL=describe-object.js.map