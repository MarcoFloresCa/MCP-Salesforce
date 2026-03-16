import { PasswordAuthAdapter } from './password-auth.js';
import { getOrgConfig } from '../config/loader.js';
import { logger } from '../logging/index.js';
const connectionCache = new Map();
export async function createConnection(orgAlias, options) {
    const cached = connectionCache.get(orgAlias);
    if (cached) {
        logger.debug(`Reusing cached connection for org '${orgAlias}'`);
        return cached;
    }
    const orgConfig = getOrgConfig(orgAlias);
    if (!orgConfig) {
        const availableOrgs = Array.from(connectionCache.keys()).join(', ') || 'none';
        throw new Error(`Org '${orgAlias}' not found in configuration. ` +
            `Available orgs: ${availableOrgs || 'none configured'}`);
    }
    const adapter = new PasswordAuthAdapter(orgConfig, options);
    await adapter.connect();
    connectionCache.set(orgAlias, adapter);
    return adapter;
}
export function getConnection(orgAlias) {
    const cached = connectionCache.get(orgAlias);
    if (!cached) {
        throw new Error(`No active connection to org '${orgAlias}'. ` +
            `Call createConnection('${orgAlias}') first.`);
    }
    return cached;
}
export async function closeConnection(orgAlias) {
    const cached = connectionCache.get(orgAlias);
    if (cached) {
        await cached.close();
        connectionCache.delete(orgAlias);
        logger.debug(`Connection to org '${orgAlias}' closed`);
    }
}
export async function closeAllConnections() {
    const closePromises = Array.from(connectionCache.entries()).map(async ([alias, conn]) => {
        await conn.close();
        logger.debug(`Connection to org '${alias}' closed`);
    });
    await Promise.all(closePromises);
    connectionCache.clear();
    logger.info('All connections closed');
}
export function hasConnection(orgAlias) {
    return connectionCache.has(orgAlias);
}
export function getActiveConnections() {
    return Array.from(connectionCache.keys());
}
//# sourceMappingURL=factory.js.map