import { IConnectionAdapter, ConnectionOptions } from './interfaces.js';
export declare function createConnection(orgAlias: string, options?: ConnectionOptions): Promise<IConnectionAdapter>;
export declare function getConnection(orgAlias: string): IConnectionAdapter;
export declare function closeConnection(orgAlias: string): Promise<void>;
export declare function closeAllConnections(): Promise<void>;
export declare function hasConnection(orgAlias: string): boolean;
export declare function getActiveConnections(): string[];
//# sourceMappingURL=factory.d.ts.map