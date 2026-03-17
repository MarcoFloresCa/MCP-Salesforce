import { OrgConfig } from '../config/types.js';
import { IConnectionAdapter, ConnectionOptions } from './interfaces.js';
export declare class PasswordAuthAdapter implements IConnectionAdapter {
    private connection;
    private orgConfig;
    private connected;
    constructor(orgConfig: OrgConfig, options?: ConnectionOptions);
    connect(): Promise<void>;
    getConnection(): any;
    getOrgAlias(): string;
    isProduction(): boolean;
    close(): Promise<void>;
}
//# sourceMappingURL=password-auth.d.ts.map