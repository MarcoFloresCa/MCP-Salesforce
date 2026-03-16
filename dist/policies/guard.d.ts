import { OrgAccessResult } from '../config/types.js';
export declare function validateOrgAccess(orgAlias: string): OrgAccessResult;
export declare function validateLoginUrl(orgAlias: string, loginUrl: string): boolean;
export declare function checkOperationSafety(orgAlias: string, operation: string): {
    safe: boolean;
    warning?: string;
};
//# sourceMappingURL=guard.d.ts.map