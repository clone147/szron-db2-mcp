import * as fs from 'fs';
import * as path from 'path';
import * as Database from 'ibm_db';

export interface ConfigProperties {
  Prefix: string;
  ServerName: string;
  ServerVersion: string;
  ConnectionString: string;
  Tables?: string;
  LogFile?: string;
}

export interface DatabaseInfo {
  identifierQuoteChar: string;
  supportsMultipleCatalogs: boolean;
  supportsMultipleSchemas: boolean;
  defaultCatalog?: string;
  defaultSchema?: string;
}

export class Config {
  private props: ConfigProperties = {} as ConfigProperties;
  private dbInfo: DatabaseInfo = {
    identifierQuoteChar: '"',
    supportsMultipleCatalogs: true,
    supportsMultipleSchemas: true
  };
  private connectionString: string = '';

  public async load(configPath: string): Promise<void> {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }

    const content = fs.readFileSync(configPath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=').trim();
        (this.props as any)[key.trim()] = value;
      }
    }

    await this.loadDatabaseInfo();
  }

  public validate(): string[] {
    const errors: string[] = [];

    if (!this.props.Prefix) {
      errors.push("The 'Prefix' option is missing");
    }

    if (!this.props.ServerName) {
      errors.push("The 'ServerName' option is missing");
    }

    if (!this.props.ConnectionString) {
      errors.push("The 'ConnectionString' option is missing");
    }

    return errors;
  }

  public getPrefix(): string {
    return this.props.Prefix;
  }

  public getServerName(): string {
    return this.props.ServerName;
  }

  public getServerVersion(): string {
    return this.props.ServerVersion || '1.0';
  }

  public getConnectionString(): string {
    return this.props.ConnectionString;
  }

  public getTables(): string[] {
    if (!this.props.Tables) {
      return [];
    }
    return this.props.Tables.split(',').map(t => t.trim()).filter(t => t);
  }

  public getLogFile(): string | undefined {
    return this.props.LogFile;
  }

  public getIdentifierQuoteChar(): string {
    return this.dbInfo.identifierQuoteChar;
  }

  public supportsMultipleCatalogs(): boolean {
    return this.dbInfo.supportsMultipleCatalogs;
  }

  public supportsMultipleSchemas(): boolean {
    return this.dbInfo.supportsMultipleSchemas;
  }

  public getDefaultCatalog(): string | undefined {
    return this.dbInfo.defaultCatalog;
  }

  public getDefaultSchema(): string | undefined {
    return this.dbInfo.defaultSchema;
  }

  public quoteIdentifier(identifier: string): string {
    const quote = this.dbInfo.identifierQuoteChar;
    // TODO: Properly escape quotes within the identifier
    return `${quote}${identifier}${quote}`;
  }

  public async createConnection(): Promise<Database.Database> {
    return new Promise((resolve, reject) => {
      Database.open(this.props.ConnectionString, (err, conn) => {
        if (err) {
          reject(new Error(`Failed to connect to database: ${err.message}`));
        } else {
          resolve(conn);
        }
      });
    });
  }

  private async loadDatabaseInfo(): Promise<void> {
    try {
      const conn = await this.createConnection();
      
      // Try to get database metadata
      try {
        // For DB2, we'll set some sensible defaults
        this.dbInfo = {
          identifierQuoteChar: '"',
          supportsMultipleCatalogs: true,
          supportsMultipleSchemas: true,
          defaultCatalog: undefined,
          defaultSchema: undefined
        };

        // Try to get current schema
        const schemaResult = await this.executeQuery(conn, 'SELECT CURRENT SCHEMA FROM SYSIBM.SYSDUMMY1');
        if (schemaResult && schemaResult.length > 0) {
          this.dbInfo.defaultSchema = schemaResult[0]['1'];
        }

        // Try to get current database
        const dbResult = await this.executeQuery(conn, 'SELECT CURRENT SERVER FROM SYSIBM.SYSDUMMY1');
        if (dbResult && dbResult.length > 0) {
          this.dbInfo.defaultCatalog = dbResult[0]['1'];
        }
      } catch (error) {
        console.warn('Could not retrieve database metadata:', error);
      }

      await this.closeConnection(conn);
    } catch (error) {
      console.warn('Could not connect to database during initialization:', error);
    }
  }

  private async executeQuery(conn: Database.Database, sql: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      conn.query(sql, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  private async closeConnection(conn: Database.Database): Promise<void> {
    return new Promise((resolve, reject) => {
      conn.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}