class Logger {
    level = 'info';
    productionWarningsLogged = new Set();
    auditLogs = [];
    setLevel(level) {
        this.level = level;
    }
    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        const currentLevelIndex = levels.indexOf(this.level);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex >= currentLevelIndex;
    }
    formatEntry(entry) {
        const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
        return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${contextStr}`;
    }
    log(level, message, context) {
        if (!this.shouldLog(level)) {
            return;
        }
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context: this.sanitizeContext(context),
        };
        const formatted = this.formatEntry(entry);
        if (level === 'error') {
            console.error(formatted);
        }
        else if (level === 'warn') {
            console.warn(formatted);
        }
        else {
            console.log(formatted);
        }
    }
    sanitizeContext(context) {
        if (!context)
            return undefined;
        const sanitized = {};
        const sensitiveKeys = ['password', 'securityToken', 'sessionId', 'accessToken', 'consumerSecret', 'confirmationToken', 'token'];
        for (const [key, value] of Object.entries(context)) {
            const lowerKey = key.toLowerCase();
            if (sensitiveKeys.some(sk => lowerKey.includes(sk.toLowerCase()))) {
                sanitized[key] = '[REDACTED]';
            }
            else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    logToAudit(entry) {
        this.auditLogs.push(entry);
        // Keep only last 1000 entries
        if (this.auditLogs.length > 1000) {
            this.auditLogs.shift();
        }
    }
    audit(params) {
        const entry = {
            timestamp: new Date().toISOString(),
            ...params,
        };
        this.logToAudit(entry);
        // Also log as regular log
        const logLevel = params.status === 'error' ? 'error' : params.status === 'blocked' ? 'warn' : 'info';
        this.log(logLevel, `Audit: ${params.tool} on ${params.orgAlias}`, {
            orgAlias: params.orgAlias,
            environment: params.environment,
            tool: params.tool,
            status: params.status,
            durationMs: params.durationMs,
            recordCount: params.recordCount,
            querySanitized: params.querySanitized,
            requiresConfirmation: params.requiresConfirmation,
            wasConfirmed: params.wasConfirmed,
        });
    }
    debug(message, context) {
        this.log('debug', message, context);
    }
    info(message, context) {
        this.log('info', message, context);
    }
    warn(message, context) {
        this.log('warn', message, context);
    }
    error(message, context) {
        this.log('error', message, context);
    }
    logProductionWarning(orgAlias, message) {
        const key = `${orgAlias}:${message}`;
        if (!this.productionWarningsLogged.has(key)) {
            this.warn(message, { orgAlias, environment: 'production' });
            this.productionWarningsLogged.add(key);
        }
    }
    resetProductionWarnings() {
        this.productionWarningsLogged.clear();
    }
    getAuditLogs() {
        return [...this.auditLogs];
    }
}
export const logger = new Logger();
//# sourceMappingURL=index.js.map