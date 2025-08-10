import { CallToolRequest, CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';
import { Config } from '../config/Config.js';
import { Logger } from '../utils/logger.js';
import * as Database from 'ibm_db';

export interface Tool {
  name: string;
  description: string;
  inputSchema: any;
  handler: (request: CallToolRequest) => Promise<CallToolResult>;
}

export abstract class BaseTool {
  protected config: Config;
  protected logger: Logger;

  constructor(config: Config) {
    this.config = config;
    this.logger = Logger.getInstance();
  }

  abstract getTool(): Tool;

  protected async executeQuery(sql: string): Promise<any[]> {
    const conn = await this.config.createConnection();
    try {
      return await this.queryDatabase(conn, sql);
    } finally {
      await this.closeConnection(conn);
    }
  }

  protected async executeNonQuery(sql: string): Promise<number> {
    const conn = await this.config.createConnection();
    try {
      return await this.executeNonQueryOnConnection(conn, sql);
    } finally {
      await this.closeConnection(conn);
    }
  }

  private async queryDatabase(conn: Database.Database, sql: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.logger.debug('Executing query: {}', sql);
      conn.query(sql, (err, data) => {
        if (err) {
          this.logger.error('Query failed: {}, Error: {}', sql, err.message);
          reject(new Error(`Query failed: ${err.message}`));
        } else {
          this.logger.debug('Query successful, returned {} rows', data?.length || 0);
          resolve(data || []);
        }
      });
    });
  }

  private async executeNonQueryOnConnection(conn: Database.Database, sql: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.logger.debug('Executing non-query: {}', sql);
      conn.query(sql, (err, result) => {
        if (err) {
          this.logger.error('Non-query failed: {}, Error: {}', sql, err.message);
          reject(new Error(`Non-query failed: ${err.message}`));
        } else {
          this.logger.debug('Non-query successful');
          // For IBM DB2, result might be different format, we'll return 1 for success
          resolve(1);
        }
      });
    });
  }

  private async closeConnection(conn: Database.Database): Promise<void> {
    return new Promise((resolve, reject) => {
      conn.close((err) => {
        if (err) {
          this.logger.warn('Failed to close connection: {}', err.message);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  protected createTextContent(text: string): TextContent {
    return {
      type: 'text',
      text: text
    };
  }

  protected createSuccessResult(content: TextContent[]): CallToolResult {
    return {
      content: content,
      isError: false
    };
  }

  protected createErrorResult(message: string): CallToolResult {
    return {
      content: [this.createTextContent(`ERROR: ${message}`)],
      isError: true
    };
  }

  protected validateRequired(args: any, field: string): string {
    if (!args[field]) {
      throw new Error(`Required field '${field}' is missing`);
    }
    return args[field];
  }

  protected validateOptional(args: any, field: string): string | undefined {
    return args[field] || undefined;
  }

  protected isNullOrEmpty(value: string | undefined | null): boolean {
    return !value || value.trim() === '';
  }

  protected emptyToNull(value: string | undefined): string | null {
    return this.isNullOrEmpty(value) ? null : value!;
  }
}