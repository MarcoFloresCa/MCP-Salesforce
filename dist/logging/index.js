class Logger {
    level = 'info';
    productionWarningsLogged = new Set();
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
        const sensitiveKeys = ['password', 'securityToken', 'sessionId', 'accessToken', 'consumerSecret'];
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
}
export const logger = new Logger();
//# sourceMappingURL=index.js.map