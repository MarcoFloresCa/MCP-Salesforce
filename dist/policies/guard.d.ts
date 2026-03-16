import { OrgAccessResult } from '../config/types.js';
export declare function validateOrgAccess(orgAlias: string): OrgAccessResult;
export declare function isProductionConfirmed(orgAlias: string): boolean;
export declare function confirmProductionAccess(orgAlias: string, token: string): boolean;
export declare function clearConfirmations(): void;
export declare function validateLoginUrl(orgAlias: string, loginUrl: string): boolean;
export declare function sanitizeQueryForLogging(query: string): string;
//# sourceMappingURL=guard.d.ts.map