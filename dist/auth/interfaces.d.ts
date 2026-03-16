import { Connection } from 'jsforce';
export interface IConnectionAdapter {
    getConnection(): Connection;
    getOrgAlias(): string;
    isProduction(): boolean;
    close(): Promise<void>;
}
export interface ConnectionOptions {
    loginTimeout?: number;
    requestTimeout?: number;
}
//# sourceMappingURL=interfaces.d.ts.map