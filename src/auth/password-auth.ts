import { Connection } from 'jsforce';
import { OrgConfig } from '../config/types.js';
import { IConnectionAdapter, ConnectionOptions } from './interfaces.js';
import { logger } from '../logging/index.js';

export class PasswordAuthAdapter implements IConnectionAdapter {
  private connection: Connection;
  private orgConfig: OrgConfig;
  private connected: boolean = false;

  constructor(orgConfig: OrgConfig, options?: ConnectionOptions) {
    this.orgConfig = orgConfig;
    
    this.connection = new Connection({
      loginUrl: orgConfig.loginUrl,
    });
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    logger.info(`Connecting to org '${this.orgConfig.alias}'`, {
      alias: this.orgConfig.alias,
      environment: this.orgConfig.environment,
      loginUrl: this.orgConfig.loginUrl,
      username: this.orgConfig.username,
    });

    try {
      await this.connection.login(
        this.orgConfig.username,
        this.orgConfig.password + this.orgConfig.securityToken
      );

      this.connected = true;

      logger.info(`Successfully connected to org '${this.orgConfig.alias}'`, {
        orgId: (this.connection as any).instanceId,
        serverUrl: (this.connection as any).serverUrl,
      });

      if (this.orgConfig.environment === 'production') {
        logger.warn(`⚠️  CONNECTED TO PRODUCTION ORG '${this.orgConfig.alias}' - READ-ONLY MODE`, {
          alias: this.orgConfig.alias,
          environment: 'production',
        });
        logger.warn(`All operations in this org will be read-only. No modifications allowed.`, {
          alias: this.orgConfig.alias,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to connect to org '${this.orgConfig.alias}'`, {
        alias: this.orgConfig.alias,
        error: errorMessage,
      });
      throw new Error(`Failed to connect to org '${this.orgConfig.alias}': ${errorMessage}`);
    }
  }

  getConnection(): Connection {
    if (!this.connected) {
      throw new Error(`Not connected to org '${this.orgConfig.alias}'. Call connect() first.`);
    }
    return this.connection;
  }

  getOrgAlias(): string {
    return this.orgConfig.alias;
  }

  isProduction(): boolean {
    return this.orgConfig.environment === 'production';
  }

  async close(): Promise<void> {
    if (this.connected) {
      try {
        await this.connection.logout();
        logger.debug(`Logged out from org '${this.orgConfig.alias}'`);
      } catch (error) {
        logger.debug(`Error during logout from org '${this.orgConfig.alias}':`, error as Record<string, unknown>);
      }
      this.connected = false;
    }
  }
}
