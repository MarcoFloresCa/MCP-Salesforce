import { z } from 'zod';
import { createConnection } from '../auth/factory.js';
import { validateOrgAccess } from '../policies/guard.js';
import { logger } from '../logging/index.js';
import { EnrichedObject } from '../config/types.js';
import { enrichObject } from '../enrichers/object.js';

export const describeObjectParams = z.object({
  orgAlias: z.string().describe('Alias of the Salesforce org to query'),
  objectApiName: z.string().describe('API name of the object (e.g., "Account", "CustomObject__c")'),
});

export type DescribeObjectParams = z.infer<typeof describeObjectParams>;

export async function describeObject(
  params: DescribeObjectParams
): Promise<{
  object: EnrichedObject;
  orgAlias: string;
  environment: string;
}> {
  logger.info(`Describing object '${params.objectApiName}' in org '${params.orgAlias}'`, {
    tool: 'describe_object',
    orgAlias: params.orgAlias,
    objectApiName: params.objectApiName,
  });

  const access = validateOrgAccess(params.orgAlias);
  
  if (!access.allowed) {
    throw new Error(access.error);
  }

  if (access.warning) {
    logger.warn(access.warning, { tool: 'describe_object' });
  }

  const connection = await createConnection(params.orgAlias);
  const conn = connection.getConnection();

  const describeResult: any = await conn.describe(params.objectApiName);
  const enriched = enrichObject(describeResult);

  logger.info(`Successfully described object '${params.objectApiName}'`, {
    tool: 'describe_object',
    orgAlias: params.orgAlias,
    objectApiName: params.objectApiName,
    fieldCount: enriched.fields.length,
  });

  return {
    object: enriched,
    orgAlias: params.orgAlias,
    environment: connection.isProduction() ? 'production' : 'sandbox',
  };
}
