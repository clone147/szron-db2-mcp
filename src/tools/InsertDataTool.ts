import { CallToolRequest, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, Tool } from './BaseTool.js';

export class InsertDataTool extends BaseTool {
  getTool(): Tool {
    const prefix = this.config.getPrefix();
    
    return {
      name: `${prefix}_insert_data`,
      description: "Insert new data into a table. Specify the table name and column-value pairs.",
      inputSchema: {
        type: "object",
        properties: {
          catalog: {
            type: "string",
            description: "The catalog name (optional)"
          },
          schema: {
            type: "string",
            description: "The schema name (optional)"
          },
          table: {
            type: "string",
            description: "The table name (required)"
          },
          data: {
            type: "object",
            description: "Column-value pairs to insert. Keys are column names, values are the data to insert.",
            additionalProperties: true
          }
        },
        required: ["table", "data"]
      },
      handler: this.handleRequest.bind(this)
    };
  }

  private async handleRequest(request: CallToolRequest): Promise<CallToolResult> {
    try {
      const args = request.params.arguments || {};
      const catalog = this.validateOptional(args, 'catalog');
      const schema = this.validateOptional(args, 'schema');
      const table = this.validateRequired(args, 'table');
      const data = args.data;

      if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
        throw new Error('Data object is required and must contain at least one column-value pair');
      }

      this.logger.info('InsertDataTool({}, {}, {}, {} columns)', 
        catalog || 'null', schema || 'null', table, Object.keys(data).length);

      const result = await this.insertData(catalog, schema, table, data);
      
      return this.createSuccessResult([
        this.createTextContent(`Successfully inserted 1 row into ${this.getFullTableName(catalog, schema, table)}`)
      ]);
    } catch (error) {
      this.logger.error('InsertDataTool failed: {}', (error as Error).message);
      return this.createErrorResult((error as Error).message);
    }
  }

  private async insertData(catalog?: string, schema?: string, table?: string, data?: any): Promise<number> {
    if (!table || !data) {
      throw new Error('Table name and data are required');
    }

    const fullTableName = this.getFullTableName(catalog, schema, table);
    const columns = Object.keys(data);
    const values = Object.values(data);

    if (columns.length === 0) {
      throw new Error('At least one column must be specified');
    }

    // Quote column names
    const quotedColumns = columns.map(col => this.config.quoteIdentifier(col));
    
    // Create parameter placeholders
    const placeholders = values.map(() => '?').join(', ');
    
    const sql = `INSERT INTO ${fullTableName} (${quotedColumns.join(', ')}) VALUES (${placeholders})`;
    
    // For now, we'll build the SQL with values directly embedded
    // In a production system, you'd want to use proper parameter binding
    const quotedValues = values.map(val => this.quoteValue(val));
    const finalSql = `INSERT INTO ${fullTableName} (${quotedColumns.join(', ')}) VALUES (${quotedValues.join(', ')})`;

    return await this.executeNonQuery(finalSql);
  }

  private getFullTableName(catalog?: string, schema?: string, table?: string): string {
    let parts: string[] = [];
    
    if (catalog && this.config.supportsMultipleCatalogs()) {
      parts.push(this.config.quoteIdentifier(catalog));
    }
    
    if (schema && this.config.supportsMultipleSchemas()) {
      parts.push(this.config.quoteIdentifier(schema));
    } else if (!schema && this.config.getDefaultSchema()) {
      parts.push(this.config.quoteIdentifier(this.config.getDefaultSchema()!));
    }
    
    if (table) {
      parts.push(this.config.quoteIdentifier(table));
    }
    
    return parts.join('.');
  }

  private quoteValue(value: any): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    
    if (typeof value === 'string') {
      // Escape single quotes in strings
      const escaped = value.replace(/'/g, "''");
      return `'${escaped}'`;
    }
    
    if (typeof value === 'number') {
      return String(value);
    }
    
    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }
    
    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }
    
    // For other types, convert to string and quote
    const escaped = String(value).replace(/'/g, "''");
    return `'${escaped}'`;
  }
}