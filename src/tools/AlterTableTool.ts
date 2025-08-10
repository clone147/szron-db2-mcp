import { CallToolRequest, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, Tool } from './BaseTool.js';

export interface AlterTableOperation {
  operation: 'ADD_COLUMN' | 'DROP_COLUMN' | 'MODIFY_COLUMN' | 'RENAME_COLUMN' | 'ADD_CONSTRAINT' | 'DROP_CONSTRAINT';
  columnName?: string;
  newColumnName?: string;
  dataType?: string;
  nullable?: boolean;
  defaultValue?: string;
  constraintName?: string;
  constraintType?: 'PRIMARY_KEY' | 'UNIQUE' | 'CHECK' | 'FOREIGN_KEY';
  constraintDefinition?: string;
  referencedTable?: string;
  referencedColumns?: string[];
}

export class AlterTableTool extends BaseTool {
  getTool(): Tool {
    return {
      name: `${this.config.getPrefix()}_alter_table`,
      description: `Alters an existing table structure by adding/dropping columns, modifying column definitions, or adding/dropping constraints.`,
      inputSchema: {
        type: "object",
        properties: {
          table: {
            type: "string",
            description: "The table name to alter"
          },
          schema: {
            type: "string",
            description: "The schema name (optional, defaults to current schema)"
          },
          operation: {
            type: "string",
            enum: ["ADD_COLUMN", "DROP_COLUMN", "MODIFY_COLUMN", "RENAME_COLUMN", "ADD_CONSTRAINT", "DROP_CONSTRAINT"],
            description: "The type of alteration to perform"
          },
          columnName: {
            type: "string",
            description: "Column name (required for column operations)"
          },
          newColumnName: {
            type: "string",
            description: "New column name (for RENAME_COLUMN operation)"
          },
          dataType: {
            type: "string",
            description: "Data type (for ADD_COLUMN and MODIFY_COLUMN operations)"
          },
          nullable: {
            type: "boolean",
            description: "Whether column allows NULL values (for ADD_COLUMN and MODIFY_COLUMN)"
          },
          defaultValue: {
            type: "string",
            description: "Default value for the column (for ADD_COLUMN and MODIFY_COLUMN)"
          },
          constraintName: {
            type: "string",
            description: "Constraint name (for constraint operations)"
          },
          constraintType: {
            type: "string",
            enum: ["PRIMARY_KEY", "UNIQUE", "CHECK", "FOREIGN_KEY"],
            description: "Type of constraint (for ADD_CONSTRAINT operation)"
          },
          constraintDefinition: {
            type: "string",
            description: "Constraint definition (for ADD_CONSTRAINT operation with CHECK constraints)"
          },
          referencedTable: {
            type: "string",
            description: "Referenced table (for FOREIGN_KEY constraints)"
          },
          referencedColumns: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Referenced columns (for FOREIGN_KEY constraints)"
          }
        },
        required: ["table", "operation"]
      },
      handler: this.handleRequest.bind(this)
    };
  }

  private async handleRequest(request: CallToolRequest): Promise<CallToolResult> {
    try {
      const args = request.params.arguments || {};
      
      const tableName = this.validateRequired(args, 'table');
      const schema = this.validateOptional(args, 'schema');
      const operation = this.validateRequired(args, 'operation') as AlterTableOperation['operation'];

      this.logger.info('AlterTableTool: {} on table {}.{}', operation, schema || 'default', tableName);

      // Validate table exists
      const tableExists = await this.checkTableExists(tableName, schema);
      if (!tableExists) {
        throw new Error(`Table '${schema ? schema + '.' : ''}${tableName}' does not exist`);
      }

      // Generate and execute ALTER TABLE statement
      const sql = this.generateAlterTableSQL(tableName, schema, operation, args);
      this.logger.debug('Generated SQL: {}', sql);

      await this.executeNonQuery(sql);

      const fullTableName = schema ? `${schema}.${tableName}` : tableName;
      const message = `Table '${fullTableName}' altered successfully: ${operation}`;
      
      return this.createSuccessResult([this.createTextContent(message)]);

    } catch (error) {
      this.logger.error('AlterTableTool failed: {}', (error as Error).message);
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

  private generateAlterTableSQL(tableName: string, schema: string | undefined, operation: AlterTableOperation['operation'], args: any): string {
    const fullTableName = schema ? `${schema}.${tableName}` : tableName;
    let sql = `ALTER TABLE ${fullTableName}`;

    switch (operation) {
      case 'ADD_COLUMN':
        sql += this.generateAddColumnSQL(args);
        break;
      case 'DROP_COLUMN':
        sql += this.generateDropColumnSQL(args);
        break;
      case 'MODIFY_COLUMN':
        sql += this.generateModifyColumnSQL(args);
        break;
      case 'RENAME_COLUMN':
        sql += this.generateRenameColumnSQL(args);
        break;
      case 'ADD_CONSTRAINT':
        sql += this.generateAddConstraintSQL(args);
        break;
      case 'DROP_CONSTRAINT':
        sql += this.generateDropConstraintSQL(args);
        break;
      default:
        throw new Error(`Unsupported ALTER TABLE operation: ${operation}`);
    }

    return sql;
  }

  private generateAddColumnSQL(args: any): string {
    const columnName = this.validateRequired(args, 'columnName');
    const dataType = this.validateRequired(args, 'dataType');
    
    this.validateColumnType(dataType);
    
    let columnDef = ` ADD COLUMN ${columnName} ${dataType}`;
    
    // Handle nullable
    if (args.nullable === false) {
      columnDef += ' NOT NULL';
    }
    
    // Handle default value
    if (args.defaultValue !== undefined) {
      if (args.defaultValue.toUpperCase() === 'CURRENT_TIMESTAMP' || 
          args.defaultValue.toUpperCase() === 'CURRENT_DATE' ||
          args.defaultValue.toUpperCase() === 'CURRENT_TIME') {
        columnDef += ` DEFAULT ${args.defaultValue}`;
      } else if (typeof args.defaultValue === 'string' && isNaN(Number(args.defaultValue))) {
        columnDef += ` DEFAULT '${args.defaultValue.replace(/'/g, "''")}'`;
      } else {
        columnDef += ` DEFAULT ${args.defaultValue}`;
      }
    }
    
    return columnDef;
  }

  private generateDropColumnSQL(args: any): string {
    const columnName = this.validateRequired(args, 'columnName');
    return ` DROP COLUMN ${columnName}`;
  }

  private generateModifyColumnSQL(args: any): string {
    const columnName = this.validateRequired(args, 'columnName');
    
    // In DB2, we use ALTER COLUMN for modifying column properties
    let sql = ` ALTER COLUMN ${columnName}`;
    
    if (args.dataType) {
      this.validateColumnType(args.dataType);
      sql += ` SET DATA TYPE ${args.dataType}`;
    }
    
    // Note: DB2 has specific syntax for modifying nullability and defaults
    // These might need separate ALTER statements
    if (args.nullable !== undefined) {
      if (args.nullable) {
        sql += ` DROP NOT NULL`;
      } else {
        sql += ` SET NOT NULL`;
      }
    }
    
    if (args.defaultValue !== undefined) {
      if (args.defaultValue.toUpperCase() === 'CURRENT_TIMESTAMP' || 
          args.defaultValue.toUpperCase() === 'CURRENT_DATE' ||
          args.defaultValue.toUpperCase() === 'CURRENT_TIME') {
        sql += ` SET DEFAULT ${args.defaultValue}`;
      } else if (typeof args.defaultValue === 'string' && isNaN(Number(args.defaultValue))) {
        sql += ` SET DEFAULT '${args.defaultValue.replace(/'/g, "''")}'`;
      } else {
        sql += ` SET DEFAULT ${args.defaultValue}`;
      }
    }
    
    return sql;
  }

  private generateRenameColumnSQL(args: any): string {
    const columnName = this.validateRequired(args, 'columnName');
    const newColumnName = this.validateRequired(args, 'newColumnName');
    
    // DB2 syntax for renaming column
    return ` RENAME COLUMN ${columnName} TO ${newColumnName}`;
  }

  private generateAddConstraintSQL(args: any): string {
    const constraintType = this.validateRequired(args, 'constraintType');
    const constraintName = args.constraintName;
    
    let sql = ' ADD';
    
    if (constraintName) {
      sql += ` CONSTRAINT ${constraintName}`;
    }
    
    switch (constraintType) {
      case 'PRIMARY_KEY':
        const pkColumns = args.columnName ? [args.columnName] : args.referencedColumns || [];
        if (pkColumns.length === 0) {
          throw new Error('PRIMARY_KEY constraint requires column name(s)');
        }
        sql += ` PRIMARY KEY (${pkColumns.join(', ')})`;
        break;
        
      case 'UNIQUE':
        const uniqueColumns = args.columnName ? [args.columnName] : args.referencedColumns || [];
        if (uniqueColumns.length === 0) {
          throw new Error('UNIQUE constraint requires column name(s)');
        }
        sql += ` UNIQUE (${uniqueColumns.join(', ')})`;
        break;
        
      case 'CHECK':
        const checkExpression = this.validateRequired(args, 'constraintDefinition');
        sql += ` CHECK (${checkExpression})`;
        break;
        
      case 'FOREIGN_KEY':
        const fkColumns = args.columnName ? [args.columnName] : args.referencedColumns || [];
        const refTable = this.validateRequired(args, 'referencedTable');
        const refColumns = args.referencedColumns || fkColumns;
        
        if (fkColumns.length === 0 || refColumns.length === 0) {
          throw new Error('FOREIGN_KEY constraint requires column specifications');
        }
        
        sql += ` FOREIGN KEY (${fkColumns.join(', ')}) REFERENCES ${refTable} (${refColumns.join(', ')})`;
        break;
        
      default:
        throw new Error(`Unsupported constraint type: ${constraintType}`);
    }
    
    return sql;
  }

  private generateDropConstraintSQL(args: any): string {
    const constraintName = this.validateRequired(args, 'constraintName');
    return ` DROP CONSTRAINT ${constraintName}`;
  }

  private validateColumnType(type: string): void {
    const upperType = type.toUpperCase();
    const validTypes = [
      'INTEGER', 'INT', 'SMALLINT', 'BIGINT',
      'DECIMAL', 'NUMERIC', 'REAL', 'DOUBLE', 'FLOAT',
      'CHAR', 'VARCHAR', 'CLOB', 'GRAPHIC', 'VARGRAPHIC', 'DBCLOB',
      'DATE', 'TIME', 'TIMESTAMP',
      'BLOB', 'BINARY', 'VARBINARY',
      'BOOLEAN', 'XML'
    ];
    
    const isValid = validTypes.some(validType => 
      upperType.startsWith(validType) || 
      upperType.includes(validType)
    );
    
    if (!isValid) {
      throw new Error(`Invalid column type: ${type}. Common types: INTEGER, VARCHAR(n), DECIMAL(p,s), TIMESTAMP, etc.`);
    }
  }
}