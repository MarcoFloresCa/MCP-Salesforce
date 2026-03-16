import { z } from 'zod';
import { createConnection } from '../auth/factory.js';
import { validateOrgAccess, sanitizeQueryForLogging } from '../policies/guard.js';
import { isProductionOrg } from '../config/loader.js';
import { logger } from '../logging/index.js';
export const querySoqlParams = z.object({
    orgAlias: z.string().describe('Alias of the Salesforce org to query'),
    query: z.string().describe('SOQL query to execute (SELECT only)'),
    limit: z.number().optional().describe('Maximum number of records to return'),
});
function sanitizeQuery(query, environment) {
    const upper = query.toUpperCase().trim();
    // 1. Solo SELECT - bloquear todo lo demás
    if (!upper.startsWith('SELECT')) {
        throw new Error("Only SELECT queries are allowed. Query must start with SELECT.");
    }
    // 2. Bloquear SOSL
    if (upper.includes('FIND') || upper.includes('SOSL')) {
        throw new Error("SOSL queries are not allowed in this tool. Use query_soql_readonly for SOQL only.");
    }
    // 3. Bloquear ALL ROWS
    if (upper.includes('ALL ROWS')) {
        throw new Error("ALL ROWS is not allowed. This could return deleted records.");
    }
    // 4. Forzar LIMIT si no existe
    if (!upper.includes('LIMIT')) {
        const defaultLimit = environment === 'production' ? 100 : 1000;
        return `${query.trim()} LIMIT ${defaultLimit}`;
    }
    // 5. Validar LIMIT en producción
    if (environment === 'production') {
        const limitMatch = upper.match(/LIMIT\s+(\d+)/);
        if (limitMatch) {
            const limit = parseInt(limitMatch[1], 10);
            if (limit > 1000) {
                throw new Error("Production queries are limited to 1000 records max. Add LIMIT 1000 or less.");
            }
        }
    }
    return query.trim();
}
export async function querySoql(params) {
    const startTime = Date.now();
    const orgAlias = params.orgAlias;
    logger.info(`Executing SOQL query on org '${orgAlias}'`, {
        tool: 'query_soql_readonly',
        orgAlias,
        query: sanitizeQueryForLogging(params.query),
    });
    const access = validateOrgAccess(orgAlias);
    if (!access.allowed) {
        const duration = Date.now() - startTime;
        logger.audit({
            orgAlias,
            environment: isProductionOrg(orgAlias) ? 'production' : 'sandbox',
            tool: 'query_soql_readonly',
            status: 'blocked',
            durationMs: duration,
            requiresConfirmation: access.requiresConfirmation,
            wasConfirmed: access.confirmed,
            error: access.error,
        });
        throw new Error(access.error);
    }
    const environment = isProductionOrg(orgAlias) ? 'production' : 'sandbox';
    if (access.warning) {
        logger.warn(access.warning, { tool: 'query_soql_readonly' });
    }
    // Sanitize query
    let sanitizedQuery;
    try {
        sanitizedQuery = sanitizeQuery(params.query, environment);
    }
    catch (e) {
        const duration = Date.now() - startTime;
        logger.audit({
            orgAlias,
            environment,
            tool: 'query_soql_readonly',
            status: 'error',
            durationMs: duration,
            querySanitized: sanitizeQueryForLogging(params.query),
            requiresConfirmation: access.requiresConfirmation,
            wasConfirmed: access.confirmed,
            error: e instanceof Error ? e.message : String(e),
        });
        throw e;
    }
    const connection = await createConnection(orgAlias);
    const conn = connection.getConnection();
    let queryText = sanitizedQuery;
    const defaultLimit = environment === 'production' ? 100 : 1000;
    if (!queryText.toLowerCase().includes('limit')) {
        queryText = `${queryText} LIMIT ${params.limit || defaultLimit}`;
    }
    const queryStartTime = Date.now();
    let result;
    try {
        result = await conn.query(queryText);
    }
    catch (e) {
        const duration = Date.now() - startTime;
        logger.audit({
            orgAlias,
            environment,
            tool: 'query_soql_readonly',
            status: 'error',
            durationMs: duration,
            querySanitized: sanitizeQueryForLogging(queryText),
            requiresConfirmation: access.requiresConfirmation,
            wasConfirmed: access.confirmed,
            error: e instanceof Error ? e.message : String(e),
        });
        throw e;
    }
    const executionTime = Date.now() - queryStartTime;
    const totalDuration = Date.now() - startTime;
    logger.info(`SOQL query completed in ${executionTime}ms`, {
        tool: 'query_soql_readonly',
        orgAlias,
        recordCount: result.totalSize,
        executionTime,
    });
    logger.audit({
        orgAlias,
        environment,
        tool: 'query_soql_readonly',
        status: 'success',
        durationMs: totalDuration,
        recordCount: result.totalSize,
        querySanitized: sanitizeQueryForLogging(queryText),
        requiresConfirmation: access.requiresConfirmation,
        wasConfirmed: access.confirmed,
    });
    return {
        result: {
            totalSize: result.totalSize,
            done: result.done,
            records: result.records,
            queryLocator: result.queryLocator,
        },
        query: queryText,
        orgAlias,
        environment,
        executionTime: totalDuration,
    };
}
//# sourceMappingURL=query-soql.js.map