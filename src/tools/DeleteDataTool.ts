import { CallToolRequest, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, Tool } from './BaseTool.js';

export class DeleteDataTool extends BaseTool {
  getTool(): Tool {
    const prefix = this.config.getPrefix();
    
    return {
      name: `${prefix}_delete_data`,
      description: "Delete data from a table. Specify the table name and WHERE conditions. WARNING: This permanently removes data.",
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
          where: {
            type: "object",
            description: "WHERE conditions as column-value pairs. All conditions are combined with AND. Required to prevent accidental deletion of all data.",
            additionalProperties: true
          }
        },
        required: ["table", "where"]
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
      const where = args.where;

      if (!where || typeof where !== 'object' || Object.keys(where).length === 0) {
        throw new Error('WHERE conditions are required to prevent accidental deletion of all data');
      }

      this.logger.info('DeleteDataTool({}, {}, {}, {} conditions)', 
        catalog || 'null', schema || 'null', table, Object.keys(where).length);

      const rowsAffected = await this.deleteData(catalog, schema, table, where);
      
      return this.createSuccessResult([
        this.createTextContent(`Successfully deleted ${rowsAffected} row(s) from ${this.getFullTableName(catalog, schema, table)}`)
      ]);
    } catch (error) {
      this.logger.error('DeleteDataTool failed: {}', (error as Error).message);
      return this.createErrorResult((error as Error).message);
    }
  }

  private async deleteData(catalog?: string, schema?: string, table?: string, where?: any): Promise<number> {
    if (!table || !where) {
      throw new Error('Table name and where conditions are required');
    }

    const fullTableName = this.getFullTableName(catalog, schema, table);
    
    // Build WHERE clause
    const whereColumns = Object.keys(where);
    const whereValues = Object.values(where);
    
    if (whereColumns.length === 0) {
      throw new Error('WHERE conditions are required to prevent accidental deletion of all data');
    }

    const wherePairs = whereColumns.map((col, index) => {
      const quotedColumn = this.config.quoteIdentifier(col);
      const quotedValue = this.quoteValue(whereValues[index]);
      return `${quotedColumn} = ${quotedValue}`;
    });

    const sql = `DELETE FROM ${fullTableName} WHERE ${wherePairs.join(' AND ')}`;

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