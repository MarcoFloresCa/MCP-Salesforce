import { z } from 'zod';
import { createConnection } from '../auth/factory.js';
import { validateOrgAccess } from '../policies/guard.js';
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

  const describeResult: any = await conn.describeGlobal();

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
