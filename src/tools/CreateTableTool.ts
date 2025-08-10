import { CallToolRequest, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, Tool } from './BaseTool.js';

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable?: boolean;
  defaultValue?: string;
  primaryKey?: boolean;
  unique?: boolean;
  check?: string;
}

export interface TableDefinition {
  name: string;
  schema?: string;
  columns: ColumnDefinition[];
  primaryKeys?: string[];
  uniqueConstraints?: string[][];
  checkConstraints?: { name?: string; expression: string }[];
}

export class CreateTableTool extends BaseTool {
  getTool(): Tool {
    return {
      name: `${this.config.getPrefix()}_create_table`,
      description: `Creates a new table in the database with specified columns and constraints. Supports primary keys, unique constraints, and check constraints.`,
      inputSchema: {
        type: "object",
        properties: {
          table: {
            type: "string",
            description: "The table name to create"
          },
          schema: {
            type: "string",
            description: "The schema name (optional, defaults to current schema)"
          },
          columns: {
            type: "array",
            description: "Array of column definitions",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Column name"
                },
                type: {
                  type: "string", 
                  description: "Column data type (e.g., 'INTEGER', 'VARCHAR(50)', 'TIMESTAMP', 'DECIMAL(10,2)')"
                },
                nullable: {
                  type: "boolean",
                  description: "Whether column allows NULL values (default: true)"
                },
                defaultValue: {
                  type: "string",
                  description: "Default value for the column"
                },
                primaryKey: {
                  type: "boolean", 
                  description: "Whether this column is part of primary key"
                },
                unique: {
                  type: "boolean",
                  description: "Whether this column has unique constraint"
                },
                check: {
                  type: "string",
                  description: "Check constraint expression"
                }
              },
              required: ["name", "type"]
            }
          },
          primaryKeys: {
            type: "array",
            description: "Array of column names that form the primary key (alternative to primaryKey in columns)",
            items: {
              type: "string"
            }
          },
          uniqueConstraints: {
            type: "array",
            description: "Array of unique constraint definitions (each is array of column names)",
            items: {
              type: "array",
              items: {
                type: "string"
              }
            }
          },
          checkConstraints: {
            type: "array",
            description: "Array of table-level check constraints",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Constraint name (optional)"
                },
                expression: {
                  type: "string",
                  description: "Check constraint expression"
                }
              },
              required: ["expression"]
            }
          }
        },
        required: ["table", "columns"]
      },
      handler: this.handleRequest.bind(this)
    };
  }

  private async handleRequest(request: CallToolRequest): Promise<CallToolResult> {
    try {
      const args = request.params.arguments || {};
      
      const tableName = this.validateRequired(args, 'table');
      const schema = this.validateOptional(args, 'schema');
      const columns = args.columns;
      
      if (!Array.isArray(columns) || columns.length === 0) {
        throw new Error('At least one column must be specified');
      }

      // Validate columns
      for (const col of columns) {
        if (!col.name || !col.type) {
          throw new Error('Each column must have name and type');
        }
        this.validateColumnType(col.type);
      }

      const tableDefinition: TableDefinition = {
        name: tableName,
        schema: schema,
        columns: columns,
        primaryKeys: args.primaryKeys as string[] | undefined,
        uniqueConstraints: args.uniqueConstraints as string[][] | undefined,
        checkConstraints: args.checkConstraints as { name?: string; expression: string }[] | undefined
      };

      this.logger.info('CreateTableTool: Creating table {}.{}', schema || 'default', tableName);

      const sql = this.generateCreateTableSQL(tableDefinition);
      this.logger.debug('Generated SQL: {}', sql);

      await this.executeNonQuery(sql);

      const fullTableName = schema ? `${schema}.${tableName}` : tableName;
      const message = `Table '${fullTableName}' created successfully with ${columns.length} column(s)`;
      
      return this.createSuccessResult([this.createTextContent(message)]);

    } catch (error) {
      this.logger.error('CreateTableTool failed: {}', (error as Error).message);
      return this.createErrorResult((error as Error).message);
    }
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
    
    // Check if type starts with any valid type
    const isValid = validTypes.some(validType => 
      upperType.startsWith(validType) || 
      upperType.includes(validType)
    );
    
    if (!isValid) {
      throw new Error(`Invalid column type: ${type}. Common types: INTEGER, VARCHAR(n), DECIMAL(p,s), TIMESTAMP, etc.`);
    }
  }

  private generateCreateTableSQL(tableDefinition: TableDefinition): string {
    const { name, schema, columns, primaryKeys, uniqueConstraints, checkConstraints } = tableDefinition;
    
    const fullTableName = schema ? `${schema}.${name}` : name;
    let sql = `CREATE TABLE ${fullTableName} (\n`;
    
    // Column definitions
    const columnDefs = columns.map(col => this.generateColumnDefinition(col));
    
    // Collect constraints
    const constraints: string[] = [];
    
    // Primary key constraint
    const pkColumns = primaryKeys || columns.filter(col => col.primaryKey).map(col => col.name);
    if (pkColumns.length > 0) {
      constraints.push(`PRIMARY KEY (${pkColumns.join(', ')})`);
    }
    
    // Unique constraints from columns
    columns.forEach(col => {
      if (col.unique && !col.primaryKey) {
        constraints.push(`UNIQUE (${col.name})`);
      }
    });
    
    // Table-level unique constraints
    if (uniqueConstraints) {
      uniqueConstraints.forEach(uc => {
        constraints.push(`UNIQUE (${uc.join(', ')})`);
      });
    }
    
    // Check constraints from columns
    columns.forEach(col => {
      if (col.check) {
        constraints.push(`CHECK (${col.check})`);
      }
    });
    
    // Table-level check constraints
    if (checkConstraints) {
      checkConstraints.forEach(cc => {
        if (cc.name) {
          constraints.push(`CONSTRAINT ${cc.name} CHECK (${cc.expression})`);
        } else {
          constraints.push(`CHECK (${cc.expression})`);
        }
      });
    }
    
    // Combine columns and constraints
    const allDefinitions = [...columnDefs, ...constraints];
    sql += '  ' + allDefinitions.join(',\n  ');
    sql += '\n)';
    
    return sql;
  }

  private generateColumnDefinition(column: ColumnDefinition): string {
    let def = `${column.name} ${column.type}`;
    
    // NOT NULL
    if (column.nullable === false || column.primaryKey) {
      def += ' NOT NULL';
    }
    
    // Default value
    if (column.defaultValue !== undefined) {
      if (column.defaultValue.toUpperCase() === 'CURRENT_TIMESTAMP' || 
          column.defaultValue.toUpperCase() === 'CURRENT_DATE' ||
          column.defaultValue.toUpperCase() === 'CURRENT_TIME') {
        def += ` DEFAULT ${column.defaultValue}`;
      } else if (typeof column.defaultValue === 'string' && isNaN(Number(column.defaultValue))) {
        def += ` DEFAULT '${column.defaultValue.replace(/'/g, "''")}'`;
      } else {
        def += ` DEFAULT ${column.defaultValue}`;
      }
    }
    
    return def;
  }
}