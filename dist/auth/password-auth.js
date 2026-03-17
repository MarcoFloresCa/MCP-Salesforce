import jsforce from 'jsforce';
import { logger } from '../logging/index.js';
const Connection = jsforce.Connection;
export class PasswordAuthAdapter {
    connection;
    orgConfig;
    connected = false;
    constructor(orgConfig, options) {
        this.orgConfig = orgConfig;
        this.connection = new Connection({
            loginUrl: orgConfig.loginUrl,
        });
    }
    async connect() {
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
            await this.connection.login(this.orgConfig.username, this.orgConfig.password + this.orgConfig.securityToken);
            this.connected = true;
            logger.info(`Successfully connected to org '${this.orgConfig.alias}'`, {
                orgId: this.connection.instanceId,
                serverUrl: this.connection.serverUrl,
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`Failed to connect to org '${this.orgConfig.alias}'`, {
                alias: this.orgConfig.alias,
                error: errorMessage,
            });
            throw new Error(`Failed to connect to org '${this.orgConfig.alias}': ${errorMessage}`);
        }
    }
    getConnection() {
        if (!this.connected) {
            throw new Error(`Not connected to org '${this.orgConfig.alias}'. Call connect() first.`);
        }
        return this.connection;
    }
    getOrgAlias() {
        return this.orgConfig.alias;
    }
    isProduction() {
        return this.orgConfig.environment === 'production';
    }
    async close() {
        if (this.connected) {
            try {
                await this.connection.logout();
                logger.debug(`Logged out from org '${this.orgConfig.alias}'`);
            }
            catch (error) {
                logger.debug(`Error during logout from org '${this.orgConfig.alias}':`, error);
            }
            this.connected = false;
        }
    }
}
//# sourceMappingURL=password-auth.js.map