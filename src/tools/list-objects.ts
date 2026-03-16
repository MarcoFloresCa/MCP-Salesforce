import { z } from 'zod';
import { createConnection } from '../auth/factory.js';
import { validateOrgAccess } from '../policies/guard.js';
import { isProductionOrg } from '../config/loader.js';
import { logger } from '../logging/index.js';

export const listObjectsParams = z.object({
  orgAlias: z.string().describe('Alias of the Salesforce org to query'),
});

export type ListObjectsParams = z.infer<typeof listObjectsParams>;

interface ObjectSummary {
  apiName: string;
  label: string;
  isCustom: boolean;
  createable: boolean;
  queryable: boolean;
  description?: string;
}

export async function listObjects(params: ListObjectsParams): Promise<{
  objects: ObjectSummary[];
  orgAlias: string;
  environment: string;
  count: number;
}> {
  const startTime = Date.now();
  const orgAlias = params.orgAlias;
  
  logger.info(`Listing objects for org '${orgAlias}'`, {
    tool: 'list_objects',
    orgAlias,
  });

  const access = validateOrgAccess(orgAlias);
  const environment = isProductionOrg(orgAlias) ? 'production' : 'sandbox';
  
  if (!access.allowed) {
    const duration = Date.now() - startTime;
    logger.audit({
      orgAlias,
      environment,
      tool: 'list_objects',
      status: 'blocked',
      durationMs: duration,
      requiresConfirmation: access.requiresConfirmation,
      wasConfirmed: access.confirmed,
      error: access.error,
    });
    throw new Error(access.error);
  }

  if (access.warning) {
    logger.warn(access.warning, { tool: 'list_objects' });
  }

  const connection = await createConnection(orgAlias);
  const conn = connection.getConnection();

  let describeResult: any;
  try {
    describeResult = await conn.describeGlobal();
  } catch (e) {
    const duration = Date.now() - startTime;
    logger.audit({
      orgAlias,
      environment,
      tool: 'list_objects',
      status: 'error',
      durationMs: duration,
      requiresConfirmation: access.requiresConfirmation,
      wasConfirmed: access.confirmed,
      error: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }

  const objects: ObjectSummary[] = (describeResult.sobjects || [])
    .filter((sobject: any) => sobject.name)
    .map((sobject: any) => ({
      apiName: sobject.name || '',
      label: sobject.label || '',
      isCustom: sobject.custom || false,
      createable: sobject.createable || false,
      queryable: sobject.queryable || false,
      description: sobject.label,
    }))
    .sort((a: ObjectSummary, b: ObjectSummary) => a.apiName.localeCompare(b.apiName));

  const duration = Date.now() - startTime;
  
  logger.info(`Found ${objects.length} objects in org '${orgAlias}'`, {
    tool: 'list_objects',
    orgAlias,
    count: objects.length,
    durationMs: duration,
  });

  logger.audit({
    orgAlias,
    environment,
    tool: 'list_objects',
    status: 'success',
    durationMs: duration,
    recordCount: objects.length,
    requiresConfirmation: access.requiresConfirmation,
    wasConfirmed: access.confirmed,
  });

  return {
    objects,
    orgAlias,
    environment,
    count: objects.length,
  };
}
