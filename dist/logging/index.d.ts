import { Environment, AuditLogEntry } from '../config/types.js';
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
declare class Logger {
    private level;
    private productionWarningsLogged;
    private auditLogs;
    setLevel(level: LogLevel): void;
    private shouldLog;
    private formatEntry;
    private log;
    private sanitizeContext;
    private logToAudit;
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
    }): void;
    debug(message: string, context?: Record<string, unknown>): void;
    info(message: string, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
    error(message: string, context?: Record<string, unknown>): void;
    logProductionWarning(orgAlias: string, message: string): void;
    resetProductionWarnings(): void;
    getAuditLogs(): AuditLogEntry[];
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=index.d.ts.map