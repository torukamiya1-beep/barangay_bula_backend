const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta
    };
    return JSON.stringify(logEntry) + '\n';
  }

  writeToFile(filename, content) {
    const filePath = path.join(this.logDir, filename);
    fs.appendFileSync(filePath, content);
  }

  info(message, meta = {}) {
    const logMessage = this.formatMessage('INFO', message, meta);
    console.log(`ℹ️  ${message}`);
    this.writeToFile('app.log', logMessage);
  }

  error(message, meta = {}) {
    const logMessage = this.formatMessage('ERROR', message, meta);
    console.error(`❌ ${message}`);
    this.writeToFile('error.log', logMessage);
  }

  warn(message, meta = {}) {
    const logMessage = this.formatMessage('WARN', message, meta);
    console.warn(`⚠️  ${message}`);
    this.writeToFile('app.log', logMessage);
  }

  debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      const logMessage = this.formatMessage('DEBUG', message, meta);
      console.log(`🐛 ${message}`);
      this.writeToFile('debug.log', logMessage);
    }
  }

  http(req, res, responseTime) {
    const message = `${req.method} ${req.originalUrl} - ${res.statusCode} - ${responseTime}ms`;
    const meta = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    };
    
    this.info(message, meta);
  }
}

module.exports = new Logger();
