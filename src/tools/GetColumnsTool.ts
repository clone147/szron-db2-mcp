import { CallToolRequest, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, Tool } from './BaseTool.js';
import { CsvUtils } from '../utils/csvUtils.js';

export class GetColumnsTool extends BaseTool {
  getTool(): Tool {
    const formatDesc = "The output of the tool will be returned in CSV format, with the first line containing column headers.";
    
    return {
      name: `${this.config.getPrefix()}_get_columns`,
      description: `Retrieves a list of fields, dimensions, or measures (as columns) for an object, entity or collection (table). Use the '${this.config.getPrefix()}_get_tables' tool to get a list of available tables. ${formatDesc}`,
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
          }
        },
        required: ["table"]
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

      this.logger.info('GetColumnsTool({}, {}, {})', 
        catalog || 'null', schema || 'null', table);

      const columns = await this.getColumns(catalog, schema, table);
      const csv = this.columnsToCsv(columns);

      return this.createSuccessResult([this.createTextContent(csv)]);
    } catch (error) {
      this.logger.error('GetColumnsTool failed: {}', (error as Error).message);
      return this.createErrorResult((error as Error).message);
    }
  }

  private async getColumns(catalog?: string, schema?: string, table?: string): Promise<any[]> {
    if (!table) {
      throw new Error('Table name is required');
    }

    let sql = `
      SELECT 
        TABSCHEMA as TABLE_SCHEM,
        TABNAME as TABLE_NAME,
        COLNAME as COLUMN_NAME,
        TYPENAME as TYPE_NAME,
        LENGTH,
        SCALE,
        NULLS,
        DEFAULT,
        REMARKS
      FROM SYSCAT.COLUMNS
      WHERE TABNAME = '${table.toUpperCase()}'
    `;

    if (schema) {
      sql += ` AND TABSCHEMA = '${schema.toUpperCase()}'`;
    }

    sql += ` ORDER BY COLNO`;

    return await this.executeQuery(sql);
  }

  private columnsToCsv(columns: any[]): string {
    const columnMappings = [];
    
    if (this.config.supportsMultipleCatalogs()) {
      columnMappings.push({ source: 'TABLE_CAT', target: 'Catalog' });
    }
    if (this.config.supportsMultipleSchemas()) {
      columnMappings.push({ source: 'TABLE_SCHEM', target: 'Schema' });
    }
    columnMappings.push({ source: 'TABLE_NAME', target: 'Table' });
    columnMappings.push({ source: 'COLUMN_NAME', target: 'Column' });
    columnMappings.push({ source: 'TYPE_NAME', target: 'DataType' });
    columnMappings.push({ source: 'REMARKS', target: 'Remarks' });

    return CsvUtils.metadataToCsv(columns, columnMappings);
  }
}