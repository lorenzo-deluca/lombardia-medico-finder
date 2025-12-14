import winston from 'winston';
import path from 'path';

export function createLogger(): winston.Logger {
    return winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.splat(),
            winston.format.json()
        ),
        defaultMeta: { service: 'medico-finder' },
        transports: [
            new winston.transports.File({ filename: path.join('logs', 'error.log'), level: 'error' }),
            new winston.transports.File({ filename: path.join('logs', 'combined.log') }),
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.printf(({ level, message, timestamp }) => `${timestamp} [${level}]: ${message}`)
                )
            })
        ]
    });
}
