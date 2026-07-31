import config from '../config/env.js';

export class StructuredLogger {
  constructor(context = 'Global') {
    this.context = context;
  }

  log(level, message, meta = {}) {
    const logObj = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      context: this.context,
      message,
      ...meta
    };
    
    // In test environment, keep it cleaner or output plain string
    if (config.nodeEnv === 'test') {
      console.log(`[${logObj.level}] [${logObj.context}] ${message}`);
    } else {
      console.log(JSON.stringify(logObj));
    }
  }

  info(message, meta = {}) {
    this.log('INFO', message, meta);
  }

  warn(message, meta = {}) {
    this.log('WARN', message, meta);
  }

  error(message, meta = {}) {
    this.log('ERROR', message, meta);
  }

  debug(message, meta = {}) {
    if (config.nodeEnv !== 'production') {
      this.log('DEBUG', message, meta);
    }
  }
}

export const logger = new StructuredLogger('Gateway');
export default logger;
