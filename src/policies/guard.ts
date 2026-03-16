import { isProductionOrg } from '../config/loader.js';
import { OrgAccessResult } from '../config/types.js';
import { logger } from '../logging/index.js';

export function validateOrgAccess(orgAlias: string): OrgAccessResult {
  const isProduction = isProductionOrg(orgAlias);

  if (isProduction) {
    logger.warn(`Accessing production org '${orgAlias}' - read-only mode enforced`, {
      alias: orgAlias,
      environment: 'production',
    });

    return {
      allowed: true,
      mode: 'read-only',
      warning: `Connected to PRODUCTION org '${orgAlias}' - all operations are READ-ONLY`,
    };
  }

  return {
    allowed: true,
    mode: 'read-write',
  };
}

export function validateLoginUrl(orgAlias: string, loginUrl: string): boolean {
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

export function checkOperationSafety(
  orgAlias: string,
  operation: string
): { safe: boolean; warning?: string } {
  const isProduction = isProductionOrg(orgAlias);

  if (isProduction) {
    return {
      safe: false,
      warning: `Operation '${operation}' is not allowed in production org '${orgAlias}'. This org is in read-only mode.`,
    };
  }

  return { safe: true };
}
