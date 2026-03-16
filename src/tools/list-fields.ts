import { z } from 'zod';
import { createConnection } from '../auth/factory.js';
import { validateOrgAccess } from '../policies/guard.js';
import { isProductionOrg } from '../config/loader.js';
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
  const startTime = Date.now();
  const orgAlias = params.orgAlias;
  const objectApiName = params.objectApiName;
  
  logger.info(`Listing fields for object '${objectApiName}' in org '${orgAlias}'`, {
    tool: 'list_fields',
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
      tool: 'list_fields',
      status: 'blocked',
      durationMs: duration,
      requiresConfirmation: access.requiresConfirmation,
      wasConfirmed: access.confirmed,
      error: access.error,
    });
    throw new Error(access.error);
  }

  if (access.warning) {
    logger.warn(access.warning, { tool: 'list_fields' });
  }

  const connection = await createConnection(orgAlias);
  const conn = connection.getConnection();

  let describeResult: any;
  try {
    describeResult = await conn.describe(objectApiName);
  } catch (e) {
    const duration = Date.now() - startTime;
    logger.audit({
      orgAlias,
      environment,
      tool: 'list_fields',
      status: 'error',
      durationMs: duration,
      requiresConfirmation: access.requiresConfirmation,
      wasConfirmed: access.confirmed,
      error: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
  
  let fields = (describeResult.fields || []).map((f: any) => enrichField(f));

  if (params.includeFormulasOnly) {
    fields = fields.filter((f: EnrichedField) => f.isFormula);
  }

  const duration = Date.now() - startTime;

  logger.info(`Found ${fields.length} fields for object '${objectApiName}'`, {
    tool: 'list_fields',
    orgAlias,
    objectApiName,
    fieldCount: fields.length,
    durationMs: duration,
  });

  logger.audit({
    orgAlias,
    environment,
    tool: 'list_fields',
    status: 'success',
    durationMs: duration,
    recordCount: fields.length,
    requiresConfirmation: access.requiresConfirmation,
    wasConfirmed: access.confirmed,
  });

  return {
    fields,
    objectApiName,
    orgAlias,
    environment,
    count: fields.length,
  };
}
