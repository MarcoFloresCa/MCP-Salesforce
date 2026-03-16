import { z } from 'zod';
import { OrgConfig, ServerConfig } from './types.js';
import { logger } from '../logging/index.js';

const orgSchema = z.object({
  alias: z.string().min(1),
  environment: z.enum(['sandbox', 'production']),
  loginUrl: z.string().url(),
  username: z.string().email(),
  password: z.string().min(1),
  securityToken: z.string().min(1),
});

const configSchema = z.object({
  orgs: z.array(orgSchema),
  defaultOrgAlias: z.string(),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

let cachedConfig: ServerConfig | null = null;

export function loadConfig(): ServerConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const orgsJson = process.env.SALESFORCE_ORGS_JSON;
  const defaultOrgAlias = process.env.DEFAULT_ORG_ALIAS || 'dev';
  const logLevel = (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info';

  if (!orgsJson) {
    throw new Error(
      'SALESFORCE_ORGS_JSON environment variable is required. ' +
      'See .env.example for configuration format.'
    );
  }

  let parsedOrgs: unknown;
  try {
    parsedOrgs = JSON.parse(orgsJson);
  } catch (e) {
    throw new Error(`Failed to parse SALESFORCE_ORGS_JSON: ${e}`);
  }

  const validationResult = configSchema.safeParse({
    orgs: parsedOrgs,
    defaultOrgAlias,
    logLevel,
  });

  if (!validationResult.success) {
    const errors = validationResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid configuration: ${errors.join('; ')}`);
  }

  cachedConfig = validationResult.data;
  
  logger.info(`Configuration loaded: ${cachedConfig.orgs.length} orgs configured`);
  logger.debug(`Configured orgs: ${cachedConfig.orgs.map(o => o.alias).join(', ')}`);

  return cachedConfig;
}

export function getOrgConfig(alias: string): OrgConfig | undefined {
  const config = loadConfig();
  return config.orgs.find(org => org.alias === alias);
}

export function getDefaultOrg(): OrgConfig {
  const config = loadConfig();
  const defaultOrg = config.orgs.find(org => org.alias === config.defaultOrgAlias);
  
  if (!defaultOrg) {
    throw new Error(`Default org '${config.defaultOrgAlias}' not found in configuration`);
  }
  
  return defaultOrg;
}

export function getAllOrgAliases(): string[] {
  const config = loadConfig();
  return config.orgs.map(org => org.alias);
}

export function isProductionOrg(alias: string): boolean {
  const org = getOrgConfig(alias);
  return org?.environment === 'production';
}
