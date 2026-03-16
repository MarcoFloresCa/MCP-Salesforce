import { z } from 'zod';
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
    productionConfirmationToken: z.string().optional(),
});
let cachedConfig = null;
function parseOrgsFromEnv() {
    const orgs = [];
    const envVars = Object.keys(process.env);
    // Buscar variables que terminen en _ALIAS y empiecen con SALESFORCE_
    const aliasVars = envVars.filter(v => v.startsWith('SALESFORCE_') && v.endsWith('_ALIAS'));
    for (const aliasVar of aliasVars) {
        // Extraer prefijo (ej: "BANAGRO_DEV" de "SALESFORCE_BANAGRO_DEV_ALIAS")
        const prefix = aliasVar.replace('SALESFORCE_', '').replace('_ALIAS', '');
        const alias = process.env[aliasVar];
        if (!alias)
            continue;
        const getEnv = (suffix) => {
            return process.env[`SALESFORCE_${prefix}_${suffix}`];
        };
        const environment = getEnv('ENVIRONMENT');
        const loginUrl = getEnv('LOGIN_URL');
        const username = getEnv('USERNAME');
        const password = getEnv('PASSWORD');
        const securityToken = getEnv('SECURITY_TOKEN');
        // Validar que tenga los campos requeridos
        if (!alias || !environment || !loginUrl || !username || !password || !securityToken) {
            logger.warn(`Org config incomplete for prefix ${prefix}, skipping`, {
                prefix,
                hasAlias: !!alias,
                hasEnvironment: !!environment,
                hasLoginUrl: !!loginUrl,
                hasUsername: !!username,
                hasPassword: !!password,
                hasSecurityToken: !!securityToken,
            });
            continue;
        }
        try {
            const org = orgSchema.parse({
                alias,
                environment,
                loginUrl,
                username,
                password,
                securityToken,
            });
            orgs.push(org);
        }
        catch (e) {
            logger.warn(`Invalid org config for prefix ${prefix}: ${e}`);
        }
    }
    return orgs;
}
export function loadConfig() {
    if (cachedConfig) {
        return cachedConfig;
    }
    const orgs = parseOrgsFromEnv();
    if (orgs.length === 0) {
        throw new Error('No orgs configured. Set SALESFORCE_<ALIAS>_ALIAS and related environment variables. ' +
            'See .env.example for configuration format.\n' +
            'Example:\n' +
            '  SALESFORCE_MYORG_ALIAS=myorg\n' +
            '  SALESFORCE_MYORG_ENVIRONMENT=sandbox\n' +
            '  SALESFORCE_MYORG_LOGIN_URL=https://test.salesforce.com\n' +
            '  SALESFORCE_MYORG_USERNAME=user@org.com\n' +
            '  SALESFORCE_MYORG_PASSWORD=xxx\n' +
            '  SALESFORCE_MYORG_SECURITY_TOKEN=xxx');
    }
    const defaultOrgAlias = process.env.DEFAULT_ORG_ALIAS || orgs[0].alias;
    const logLevel = process.env.LOG_LEVEL || 'info';
    const productionConfirmationToken = process.env.PRODUCTION_CONFIRMATION_TOKEN;
    const validationResult = configSchema.safeParse({
        orgs,
        defaultOrgAlias,
        logLevel,
        productionConfirmationToken,
    });
    if (!validationResult.success) {
        const errors = validationResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
        throw new Error(`Invalid configuration: ${errors.join('; ')}`);
    }
    cachedConfig = validationResult.data;
    logger.info(`Configuration loaded: ${cachedConfig.orgs.length} orgs configured`);
    logger.debug(`Configured orgs: ${cachedConfig.orgs.map(o => `${o.alias} (${o.environment})`).join(', ')}`);
    return cachedConfig;
}
export function getOrgConfig(alias) {
    const config = loadConfig();
    return config.orgs.find(org => org.alias === alias);
}
export function getDefaultOrg() {
    const config = loadConfig();
    const defaultOrg = config.orgs.find(org => org.alias === config.defaultOrgAlias);
    if (!defaultOrg) {
        throw new Error(`Default org '${config.defaultOrgAlias}' not found in configuration`);
    }
    return defaultOrg;
}
export function getAllOrgAliases() {
    const config = loadConfig();
    return config.orgs.map(org => org.alias);
}
export function isProductionOrg(alias) {
    const org = getOrgConfig(alias);
    return org?.environment === 'production';
}
export function getProductionConfirmationToken() {
    const config = loadConfig();
    return config.productionConfirmationToken;
}
export function resetConfigCache() {
    cachedConfig = null;
}
//# sourceMappingURL=loader.js.map