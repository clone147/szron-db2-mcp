import { CallToolRequest, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, Tool } from './BaseTool.js';

export class DropTableTool extends BaseTool {
  getTool(): Tool {
    return {
      name: `${this.config.getPrefix()}_drop_table`,
      description: `Drops (deletes) an existing table from the database. This operation is irreversible and will delete all data in the table.`,
      inputSchema: {
        type: "object",
        properties: {
          table: {
            type: "string",
            description: "The table name to drop"
          },
          schema: {
            type: "string",
            description: "The schema name (optional, defaults to current schema)"
          },
          cascade: {
            type: "boolean",
            description: "Whether to cascade drop (drop dependent objects). Default: false"
          },
          ifExists: {
            type: "boolean", 
            description: "Whether to use IF EXISTS clause to avoid error if table doesn't exist. Default: false"
          },
          confirm: {
            type: "boolean",
            description: "Confirmation flag - must be set to true to proceed with drop operation"
          }
        },
        required: ["table", "confirm"]
      },
      handler: this.handleRequest.bind(this)
    };
  }

  private async handleRequest(request: CallToolRequest): Promise<CallToolResult> {
    try {
      const args = request.params.arguments || {};
      
      const tableName = this.validateRequired(args, 'table');
      const schema = this.validateOptional(args, 'schema');
      const cascade = args.cascade === true;
      const ifExists = args.ifExists === true;
      const confirm = args.confirm === true;

      if (!confirm) {
        throw new Error('DROP TABLE operation requires explicit confirmation. Set confirm=true to proceed.');
      }

      this.logger.info('DropTableTool: Dropping table {}.{}', schema || 'default', tableName);

      // Check if table exists first
      const tableExists = await this.checkTableExists(tableName, schema);
      
      if (!tableExists && !ifExists) {
        throw new Error(`Table '${schema ? schema + '.' : ''}${tableName}' does not exist`);
      }

      if (!tableExists && ifExists) {
        const fullTableName = schema ? `${schema}.${tableName}` : tableName;
        const message = `Table '${fullTableName}' does not exist (IF EXISTS specified)`;
        return this.createSuccessResult([this.createTextContent(message)]);
      }

      // Generate DROP TABLE SQL
      const sql = this.generateDropTableSQL(tableName, schema, cascade, ifExists);
      this.logger.debug('Generated SQL: {}', sql);

      await this.executeNonQuery(sql);

      const fullTableName = schema ? `${schema}.${tableName}` : tableName;
      const message = `Table '${fullTableName}' dropped successfully`;
      
      return this.createSuccessResult([this.createTextContent(message)]);

    } catch (error) {
      this.logger.error('DropTableTool failed: {}', (error as Error).message);
      return this.createErrorResult((error as Error).message);
    }
  }

  private async checkTableExists(tableName: string, schema?: string): Promise<boolean> {
    let sql = `
      SELECT COUNT(*) as TABLE_COUNT
      FROM SYSCAT.TABLES 
      WHERE TABNAME = '${tableName.toUpperCase()}'
    `;
    
    if (schema) {
      sql += ` AND TABSCHEMA = '${schema.toUpperCase()}'`;
    }

    try {
      const result = await this.executeQuery(sql);
      return result.length > 0 && result[0].TABLE_COUNT > 0;
    } catch (error) {
      this.logger.warn('Error checking table existence: {}', (error as Error).message);
      return false;
    }
  }

  private generateDropTableSQL(tableName: string, schema?: string, cascade: boolean = false, ifExists: boolean = false): string {
    const fullTableName = schema ? `${schema}.${tableName}` : tableName;
    
    let sql = 'DROP TABLE ';
    
    // Note: DB2 doesn't support IF EXISTS in DROP TABLE, but we can simulate it
    // by checking existence first (which we do above)
    
    sql += fullTableName;
    
    // Add CASCADE if specified
    if (cascade) {
      sql += ' CASCADE';
    }
    
    return sql;
  }

  // Method to get dependent objects (for information purposes)
  private async getDependentObjects(tableName: string, schema?: string): Promise<any[]> {
    let sql = `
      SELECT 
        BTYPE as OBJECT_TYPE,
        BNAME as OBJECT_NAME,
        BSCHEMA as OBJECT_SCHEMA
      FROM SYSCAT.TABDEP 
      WHERE TABNAME = '${tableName.toUpperCase()}'
    `;
    
    if (schema) {
      sql += ` AND TABSCHEMA = '${schema.toUpperCase()}'`;
    }

    try {
      return await this.executeQuery(sql);
    } catch (error) {
      this.logger.warn('Error getting dependent objects: {}', (error as Error).message);
      return [];
    }
  }

  // Method to get table information before dropping (for logging/confirmation)
  private async getTableInfo(tableName: string, schema?: string): Promise<any> {
    let sql = `
      SELECT 
        TABSCHEMA,
        TABNAME,
        TYPE,
        STATUS,
        CREATE_TIME,
        CARD as ROW_COUNT
      FROM SYSCAT.TABLES 
      WHERE TABNAME = '${tableName.toUpperCase()}'
    `;
    
    if (schema) {
      sql += ` AND TABSCHEMA = '${schema.toUpperCase()}'`;
    }

    try {
      const result = await this.executeQuery(sql);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      this.logger.warn('Error getting table info: {}', (error as Error).message);
      return null;
    }
  }
}