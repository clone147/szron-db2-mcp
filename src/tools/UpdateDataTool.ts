import { CallToolRequest, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, Tool } from './BaseTool.js';

export class UpdateDataTool extends BaseTool {
  getTool(): Tool {
    const prefix = this.config.getPrefix();
    
    return {
      name: `${prefix}_update_data`,
      description: "Update existing data in a table. Specify the table name, column-value pairs to update, and WHERE conditions.",
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
            description: "Column-value pairs to update. Keys are column names, values are the new data.",
            additionalProperties: true
          },
          where: {
            type: "object",
            description: "WHERE conditions as column-value pairs. All conditions are combined with AND.",
            additionalProperties: true
          }
        },
        required: ["table", "data", "where"]
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
      const where = args.where;

      if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
        throw new Error('Data object is required and must contain at least one column-value pair');
      }

      if (!where || typeof where !== 'object' || Object.keys(where).length === 0) {
        throw new Error('WHERE conditions are required to prevent accidental updates to all rows');
      }

      this.logger.info('UpdateDataTool({}, {}, {}, {} columns, {} conditions)', 
        catalog || 'null', schema || 'null', table, 
        Object.keys(data).length, Object.keys(where).length);

      const rowsAffected = await this.updateData(catalog, schema, table, data, where);
      
      return this.createSuccessResult([
        this.createTextContent(`Successfully updated ${rowsAffected} row(s) in ${this.getFullTableName(catalog, schema, table)}`)
      ]);
    } catch (error) {
      this.logger.error('UpdateDataTool failed: {}', (error as Error).message);
      return this.createErrorResult((error as Error).message);
    }
  }

  private async updateData(catalog?: string, schema?: string, table?: string, data?: any, where?: any): Promise<number> {
    if (!table || !data || !where) {
      throw new Error('Table name, data, and where conditions are required');
    }

    const fullTableName = this.getFullTableName(catalog, schema, table);
    
    // Build SET clause
    const setColumns = Object.keys(data);
    const setValues = Object.values(data);
    
    if (setColumns.length === 0) {
      throw new Error('At least one column must be specified for update');
    }

    const setPairs = setColumns.map((col, index) => {
      const quotedColumn = this.config.quoteIdentifier(col);
      const quotedValue = this.quoteValue(setValues[index]);
      return `${quotedColumn} = ${quotedValue}`;
    });

    // Build WHERE clause
    const whereColumns = Object.keys(where);
    const whereValues = Object.values(where);
    
    if (whereColumns.length === 0) {
      throw new Error('WHERE conditions are required to prevent accidental updates to all rows');
    }

    const wherePairs = whereColumns.map((col, index) => {
      const quotedColumn = this.config.quoteIdentifier(col);
      const quotedValue = this.quoteValue(whereValues[index]);
      return `${quotedColumn} = ${quotedValue}`;
    });

    const sql = `UPDATE ${fullTableName} SET ${setPairs.join(', ')} WHERE ${wherePairs.join(' AND ')}`;

    return await this.executeNonQuery(sql);
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