import { z } from 'zod';
import { createConnection } from '../auth/factory.js';
import { validateOrgAccess } from '../policies/guard.js';
import { logger } from '../logging/index.js';
import { EnrichedField } from '../config/types.js';
import { enrichField } from '../enrichers/field.js';

export const listFieldsParams = z.object({
  orgAlias: z.string().describe('Alias of the Salesforce org to query'),
  objectApiName: z.string().describe('API name of the object'),
  includeFormulasOnly: z.boolean().optional().describe('Only return formula fields'),
});

export type ListFieldsParams = z.infer<typeof listFieldsParams>;

export async function listFields(
  params: ListFieldsParams
): Promise<{
  fields: EnrichedField[];
  objectApiName: string;
  orgAlias: string;
  environment: string;
  count: number;
}> {
  logger.info(`Listing fields for object '${params.objectApiName}' in org '${params.orgAlias}'`, {
    tool: 'list_fields',
    orgAlias: params.orgAlias,
    objectApiName: params.objectApiName,
  });

  const access = validateOrgAccess(params.orgAlias);
  
  if (!access.allowed) {
    throw new Error(access.error);
  }

  if (access.warning) {
    logger.warn(access.warning, { tool: 'list_fields' });
  }

  const connection = await createConnection(params.orgAlias);
  const conn = connection.getConnection();

  const describeResult: any = await conn.describe(params.objectApiName);
  
  let fields = (describeResult.fields || []).map((f: any) => enrichField(f));

  if (params.includeFormulasOnly) {
    fields = fields.filter((f: EnrichedField) => f.isFormula);
  }

  logger.info(`Found ${fields.length} fields for object '${params.objectApiName}'`, {
    tool: 'list_fields',
    orgAlias: params.orgAlias,
    objectApiName: params.objectApiName,
    fieldCount: fields.length,
  });

  return {
    fields,
    objectApiName: params.objectApiName,
    orgAlias: params.orgAlias,
    environment: connection.isProduction() ? 'production' : 'sandbox',
    count: fields.length,
  };
}
