type LogLevel = 'debug' | 'info' | 'warn' | 'error';
declare class Logger {
    private level;
    private productionWarningsLogged;
    setLevel(level: LogLevel): void;
    private shouldLog;
    private formatEntry;
    private log;
    private sanitizeContext;
    debug(message: string, context?: Record<string, unknown>): void;
    info(message: string, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
    error(message: string, context?: Record<string, unknown>): void;
    logProductionWarning(orgAlias: string, message: string): void;
    resetProductionWarnings(): void;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=index.d.ts.map