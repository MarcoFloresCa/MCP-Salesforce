import { z } from 'zod';
import { createConnection } from '../auth/factory.js';
import { validateOrgAccess } from '../policies/guard.js';
import { logger } from '../logging/index.js';
import { EnrichedField } from '../config/types.js';
import { enrichField } from '../enrichers/field.js';

export const fieldMetadataParams = z.object({
  orgAlias: z.string().describe('Alias of the Salesforce org to query'),
  objectApiName: z.string().describe('API name of the object'),
  fieldApiName: z.string().describe('API name of the field'),
});

export type FieldMetadataParams = z.infer<typeof fieldMetadataParams>;

export async function fieldMetadata(
  params: FieldMetadataParams
): Promise<{
  field: EnrichedField;
  objectApiName: string;
  orgAlias: string;
  environment: string;
}> {
  logger.info(`Getting metadata for field '${params.fieldApiName}' on '${params.objectApiName}' in org '${params.orgAlias}'`, {
    tool: 'field_metadata',
    orgAlias: params.orgAlias,
    objectApiName: params.objectApiName,
    fieldApiName: params.fieldApiName,
  });

  const access = validateOrgAccess(params.orgAlias);
  
  if (!access.allowed) {
    throw new Error(access.error);
  }

  if (access.warning) {
    logger.warn(access.warning, { tool: 'field_metadata' });
  }

  const connection = await createConnection(params.orgAlias);
  const conn = connection.getConnection();

  const describeResult: any = await conn.describe(params.objectApiName);
  
  const field: any = describeResult.fields?.find(
    (f: any) => f.name === params.fieldApiName
  );

  if (!field) {
    throw new Error(
      `Field '${params.fieldApiName}' not found on object '${params.objectApiName}' in org '${params.orgAlias}'`
    );
  }

  const enriched = enrichField(field);

  logger.info(`Successfully retrieved metadata for field '${params.fieldApiName}'`, {
    tool: 'field_metadata',
    orgAlias: params.orgAlias,
    objectApiName: params.objectApiName,
    fieldApiName: params.fieldApiName,
  });

  return {
    field: enriched,
    objectApiName: params.objectApiName,
    orgAlias: params.orgAlias,
    environment: connection.isProduction() ? 'production' : 'sandbox',
  };
}
