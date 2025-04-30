const winston = require('winston');

   const logger = winston.createLogger({
     level: process.env.LOG_LEVEL || 'info', // Default to 'info', override with env variable
     format: winston.format.combine(
       winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
       winston.format.json() // JSON format for structured logging
     ),
     transports: [
       // Console transport for real-time logs
       new winston.transports.Console({
         format: winston.format.combine(
           winston.format.colorize(), // Colorize logs for console readability
           winston.format.printf(({ timestamp, level, message, ...metadata }) => {
             return `${timestamp} [${level}]: ${message} ${Object.keys(metadata).length ? JSON.stringify(metadata) : ''}`;
           })
         ),
       }),
       // File transport for persistent logs
       new winston.transports.File({
         filename: 'logs/combined.log',
         maxsize: 5242880, // 5MB max file size
         maxFiles: 5, // Keep up to 5 rotated log files
       }),
     ],
   });

   // Handle exceptions and rejections
   logger.exceptions.handle(
     new winston.transports.File({ filename: 'logs/exceptions.log' })
   );

   logger.rejections.handle(
     new winston.transports.File({ filename: 'logs/rejections.log' })
   );

   module.exports = { logger };