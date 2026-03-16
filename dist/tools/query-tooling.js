import { z } from 'zod';
import { createConnection } from '../auth/factory.js';
import { validateOrgAccess } from '../policies/guard.js';
import { logger } from '../logging/index.js';
export const queryToolingParams = z.object({
    orgAlias: z.string().describe('Alias of the Salesforce org to query'),
    query: z.string().describe('Tooling API SOQL query to execute'),
    limit: z.number().optional().describe('Maximum number of records to return'),
});
export async function queryTooling(params) {
    logger.info(`Executing Tooling API query on org '${params.orgAlias}'`, {
        tool: 'query_tooling',
        orgAlias: params.orgAlias,
        query: params.query.substring(0, 200),
    });
    const access = validateOrgAccess(params.orgAlias);
    if (!access.allowed) {
        throw new Error(access.error);
    }
    if (access.warning) {
        logger.warn(access.warning, { tool: 'query_tooling' });
    }
    const connection = await createConnection(params.orgAlias);
    const conn = connection.getConnection();
    let queryText = params.query.trim();
    if (!queryText.toLowerCase().includes('limit')) {
        const defaultLimit = params.limit || 50;
        queryText = `${queryText} LIMIT ${defaultLimit}`;
    }
    const startTime = Date.now();
    const result = await conn.tooling.query(queryText);
    const executionTime = Date.now() - startTime;
    logger.info(`Tooling API query completed in ${executionTime}ms`, {
        tool: 'query_tooling',
        orgAlias: params.orgAlias,
        recordCount: result.totalSize,
        executionTime,
    });
    return {
        result: {
            totalSize: result.totalSize,
            done: result.done,
            records: result.records,
        },
        query: queryText,
        orgAlias: params.orgAlias,
        environment: connection.isProduction() ? 'production' : 'sandbox',
        executionTime,
    };
}
//# sourceMappingURL=query-tooling.js.map