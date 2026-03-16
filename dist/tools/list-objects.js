import { z } from 'zod';
import { createConnection } from '../auth/factory.js';
import { validateOrgAccess } from '../policies/guard.js';
import { logger } from '../logging/index.js';
export const listObjectsParams = z.object({
    orgAlias: z.string().describe('Alias of the Salesforce org to query'),
});
export async function listObjects(params) {
    logger.info(`Listing objects for org '${params.orgAlias}'`, {
        tool: 'list_objects',
        orgAlias: params.orgAlias,
    });
    const access = validateOrgAccess(params.orgAlias);
    if (!access.allowed) {
        throw new Error(access.error);
    }
    if (access.warning) {
        logger.warn(access.warning, { tool: 'list_objects' });
    }
    const connection = await createConnection(params.orgAlias);
    const conn = connection.getConnection();
    const describeResult = await conn.describeGlobal();
    const objects = (describeResult.sobjects || [])
        .filter((sobject) => sobject.name)
        .map((sobject) => ({
        apiName: sobject.name || '',
        label: sobject.label || '',
        isCustom: sobject.custom || false,
        createable: sobject.createable || false,
        queryable: sobject.queryable || false,
        description: sobject.label,
    }))
        .sort((a, b) => a.apiName.localeCompare(b.apiName));
    logger.info(`Found ${objects.length} objects in org '${params.orgAlias}'`, {
        tool: 'list_objects',
        orgAlias: params.orgAlias,
        count: objects.length,
    });
    return {
        objects,
        orgAlias: params.orgAlias,
        environment: connection.isProduction() ? 'production' : 'sandbox',
        count: objects.length,
    };
}
//# sourceMappingURL=list-objects.js.map