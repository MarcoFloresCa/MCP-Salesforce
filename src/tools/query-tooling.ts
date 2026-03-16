import { z } from 'zod';
import { createConnection } from '../auth/factory.js';
import { validateOrgAccess, sanitizeQueryForLogging } from '../policies/guard.js';
import { isProductionOrg } from '../config/loader.js';
import { logger } from '../logging/index.js';

export const queryToolingParams = z.object({
  orgAlias: z.string().describe('Alias of the Salesforce org to query'),
  query: z.string().describe('Tooling API SOQL query to execute (SELECT only)'),
  limit: z.number().optional().describe('Maximum number of records to return'),
});

export type QueryToolingParams = z.infer<typeof queryToolingParams>;

interface ToolingQueryResult {
  totalSize: number;
  done: boolean;
  records: Record<string, unknown>[];
}

function sanitizeToolingQuery(query: string, environment: string): string {
  const upper = query.toUpperCase().trim();
  
  // 1. Solo SELECT
  if (!upper.startsWith('SELECT')) {
    throw new Error("Only SELECT queries are allowed in Tooling API");
  }
  
  // 2. Forzar LIMIT si no existe
  if (!upper.includes('LIMIT')) {
    const defaultLimit = environment === 'production' ? 50 : 100;
    return `${query.trim()} LIMIT ${defaultLimit}`;
  }
  
  // 3. Validar LIMIT en producción
  if (environment === 'production') {
    const limitMatch = upper.match(/LIMIT\s+(\d+)/);
    if (limitMatch) {
      const limit = parseInt(limitMatch[1], 10);
      if (limit > 500) {
        throw new Error("Production Tooling API queries limited to 500 records max");
      }
    }
  }
  
  return query.trim();
}

export async function queryTooling(
  params: QueryToolingParams
): Promise<{
  result: ToolingQueryResult;
  query: string;
  orgAlias: string;
  environment: string;
  executionTime: number;
}> {
  const startTime = Date.now();
  const orgAlias = params.orgAlias;
  
  logger.info(`Executing Tooling API query on org '${orgAlias}'`, {
    tool: 'query_tooling',
    orgAlias,
    query: sanitizeQueryForLogging(params.query),
  });

  const access = validateOrgAccess(orgAlias);
  const environment = isProductionOrg(orgAlias) ? 'production' : 'sandbox';
  
  if (!access.allowed) {
    const duration = Date.now() - startTime;
    logger.audit({
      orgAlias,
      environment,
      tool: 'query_tooling_readonly',
      status: 'blocked',
      durationMs: duration,
      requiresConfirmation: access.requiresConfirmation,
      wasConfirmed: access.confirmed,
      error: access.error,
    });
    throw new Error(access.error);
  }

  if (access.warning) {
    logger.warn(access.warning, { tool: 'query_tooling' });
  }

  // Sanitize query
  let sanitizedQuery: string;
  try {
    sanitizedQuery = sanitizeToolingQuery(params.query, environment);
  } catch (e) {
    const duration = Date.now() - startTime;
    logger.audit({
      orgAlias,
      environment,
      tool: 'query_tooling_readonly',
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
  
  const defaultLimit = environment === 'production' ? 50 : 100;
  if (!queryText.toLowerCase().includes('limit')) {
    queryText = `${queryText} LIMIT ${params.limit || defaultLimit}`;
  }

  const queryStartTime = Date.now();

  let result: any;
  try {
    result = await conn.tooling.query(queryText);
  } catch (e) {
    const duration = Date.now() - startTime;
    logger.audit({
      orgAlias,
      environment,
      tool: 'query_tooling_readonly',
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

  logger.info(`Tooling API query completed in ${executionTime}ms`, {
    tool: 'query_tooling',
    orgAlias,
    recordCount: result.totalSize,
    executionTime,
  });

  logger.audit({
    orgAlias,
    environment,
    tool: 'query_tooling_readonly',
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
      records: result.records as Record<string, unknown>[],
    },
    query: queryText,
    orgAlias,
    environment,
    executionTime: totalDuration,
  };
}
