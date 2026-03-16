import { OrgConfig, ServerConfig } from './types.js';
export declare function loadConfig(): ServerConfig;
export declare function getOrgConfig(alias: string): OrgConfig | undefined;
export declare function getDefaultOrg(): OrgConfig;
export declare function getAllOrgAliases(): string[];
export declare function isProductionOrg(alias: string): boolean;
export declare function getProductionConfirmationToken(): string | undefined;
export declare function resetConfigCache(): void;
//# sourceMappingURL=loader.d.ts.map