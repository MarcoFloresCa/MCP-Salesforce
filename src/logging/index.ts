import { Environment, AuditLogEntry } from '../config/types.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

class Logger {
  private level: LogLevel = 'info';
  private productionWarningsLogged: Set<string> = new Set();
  private auditLogs: AuditLogEntry[] = [];

  setLevel(level: LogLevel) {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatEntry(entry: LogEntry): string {
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${contextStr}`;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.sanitizeContext(context),
    };

    const formatted = this.formatEntry(entry);
    
    if (level === 'error') {
      console.error(formatted);
    } else if (level === 'warn') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  private sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!context) return undefined;

    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = ['password', 'securityToken', 'sessionId', 'accessToken', 'consumerSecret', 'confirmationToken', 'token'];

    for (const [key, value] of Object.entries(context)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sk => lowerKey.includes(sk.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private logToAudit(entry: AuditLogEntry): void {
    this.auditLogs.push(entry);
    
    // Keep only last 1000 entries
    if (this.auditLogs.length > 1000) {
      this.auditLogs.shift();
    }
  }

  audit(params: {
    orgAlias: string;
    environment: Environment;
    tool: string;
    status: 'success' | 'error' | 'blocked';
    durationMs?: number;
    recordCount?: number;
    querySanitized?: string;
    error?: string;
    requiresConfirmation: boolean;
    wasConfirmed: boolean;
  }): void {
    const entry: AuditLogEntry = {
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

  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>) {
    this.log('error', message, context);
  }

  logProductionWarning(orgAlias: string, message: string) {
    const key = `${orgAlias}:${message}`;
    if (!this.productionWarningsLogged.has(key)) {
      this.warn(message, { orgAlias, environment: 'production' });
      this.productionWarningsLogged.add(key);
    }
  }

  resetProductionWarnings() {
    this.productionWarningsLogged.clear();
  }

  getAuditLogs(): AuditLogEntry[] {
    return [...this.auditLogs];
  }
}

export const logger = new Logger();
