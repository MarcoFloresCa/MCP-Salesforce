import { isProductionOrg, getProductionConfirmationToken, getOrgConfig } from '../config/loader.js';
import { logger } from '../logging/index.js';
const confirmedOrgs = new Set();
export function validateOrgAccess(orgAlias) {
    const org = getOrgConfig(orgAlias);
    const isProduction = isProductionOrg(orgAlias);
    const confirmed = confirmedOrgs.has(orgAlias);
    if (isProduction) {
        logger.warn(`Accessing production org '${orgAlias}'`, {
            alias: orgAlias,
            environment: 'production',
            requiresConfirmation: true,
            wasConfirmed: confirmed,
        });
        if (!confirmed) {
            return {
                allowed: false,
                mode: 'read-only',
                requiresConfirmation: true,
                confirmed: false,
                error: `PRODUCTION ACCESS REQUIRES CONFIRMATION. 
        
To access org '${orgAlias}', you must first call:
  confirm_production_access({ orgAlias: '${orgAlias}', confirmationToken: 'YOUR_TOKEN' })

Get the token from PRODUCTION_CONFIRMATION_TOKEN environment variable.`,
            };
        }
        return {
            allowed: true,
            mode: 'read-only',
            requiresConfirmation: true,
            confirmed: true,
            warning: `Accessing PRODUCTION org '${orgAlias}' (confirmed for this session)`,
        };
    }
    return {
        allowed: true,
        mode: 'read-write',
        requiresConfirmation: false,
        confirmed: false,
    };
}
export function isProductionConfirmed(orgAlias) {
    return confirmedOrgs.has(orgAlias);
}
export function confirmProductionAccess(orgAlias, token) {
    const isProduction = isProductionOrg(orgAlias);
    if (!isProduction) {
        logger.info(`Confirmation requested for sandbox org '${orgAlias}' - not needed`, {
            alias: orgAlias,
        });
        return true;
    }
    const validToken = getProductionConfirmationToken();
    if (!validToken) {
        logger.error(`Production confirmation attempted but PRODUCTION_CONFIRMATION_TOKEN not configured`, {
            alias: orgAlias,
        });
        return false;
    }
    if (token !== validToken) {
        logger.warn(`Invalid production confirmation token for org '${orgAlias}'`, {
            alias: orgAlias,
        });
        return false;
    }
    confirmedOrgs.add(orgAlias);
    logger.warn(`PRODUCTION ACCESS CONFIRMED for org '${orgAlias}'`, {
        alias: orgAlias,
        confirmedAt: new Date().toISOString(),
    });
    return true;
}
export function clearConfirmations() {
    confirmedOrgs.clear();
    logger.debug('All production confirmations cleared');
}
export function validateLoginUrl(orgAlias, loginUrl) {
    const isProduction = isProductionOrg(orgAlias);
    const expectedProductionUrl = 'https://login.salesforce.com';
    const expectedSandboxUrl = 'https://test.salesforce.com';
    if (isProduction) {
        const isValid = loginUrl === expectedProductionUrl;
        if (!isValid) {
            logger.error(`Invalid login URL for production org '${orgAlias}': ${loginUrl}`, {
                alias: orgAlias,
                expected: expectedProductionUrl,
                actual: loginUrl,
            });
        }
        return isValid;
    }
    const isValid = loginUrl === expectedSandboxUrl || loginUrl === 'https://test.salesforce.com';
    if (!isValid) {
        logger.warn(`Non-standard sandbox login URL for org '${orgAlias}': ${loginUrl}`, {
            alias: orgAlias,
            expected: expectedSandboxUrl,
            actual: loginUrl,
        });
    }
    return true;
}
export function sanitizeQueryForLogging(query) {
    // Remove actual values but keep structure
    let sanitized = query;
    // Replace string literals with placeholder
    sanitized = sanitized.replace(/'[^']*'/g, "'xxx'");
    // Replace numbers with placeholder
    sanitized = sanitized.replace(/\d+/g, "N");
    // Truncate if too long
    if (sanitized.length > 200) {
        sanitized = sanitized.substring(0, 200) + '...';
    }
    return sanitized;
}
//# sourceMappingURL=guard.js.map