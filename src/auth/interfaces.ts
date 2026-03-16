import { Connection } from 'jsforce';
import { OrgConfig } from '../config/types.js';

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
