import { CallToolRequest, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, Tool } from './BaseTool.js';
import { CsvUtils } from '../utils/csvUtils.js';

export class GetTablesTool extends BaseTool {
  getTool(): Tool {
    const formatDesc = "The output of the tool will be returned in CSV format, with the first line containing column headers.";
    
    return {
      name: `${this.config.getPrefix()}_get_tables`,
      description: `Retrieves a list of objects, entities, collections, etc. (as tables) available in the data source. Use the '${this.config.getPrefix()}_get_columns' tool to list available columns on a table. Both 'catalog' and 'schema' are optional parameters. ${formatDesc}`,
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
          }
        }
      },
      handler: this.handleRequest.bind(this)
    };
  }

  private async handleRequest(request: CallToolRequest): Promise<CallToolResult> {
    try {
      const args = request.params.arguments || {};
      const catalog = this.validateOptional(args, 'catalog');
      const schema = this.validateOptional(args, 'schema');

      this.logger.info('GetTablesTool({}, {})', catalog || 'null', schema || 'null');

      const tables = await this.getTables(catalog, schema);
      const csv = this.tablesToCsv(tables);

      const content = [this.createTextContent(csv)];

      // Add additional info about default catalog/schema if not supported
      if (!this.config.supportsMultipleCatalogs() && this.config.getDefaultCatalog()) {
        content.push(this.createTextContent(`Default Catalog: ${this.config.getDefaultCatalog()}`));
      }
      if (!this.config.supportsMultipleSchemas() && this.config.getDefaultSchema()) {
        content.push(this.createTextContent(`Default Schema: ${this.config.getDefaultSchema()}`));
      }

      return this.createSuccessResult(content);
    } catch (error) {
      this.logger.error('GetTablesTool failed: {}', (error as Error).message);
      return this.createErrorResult((error as Error).message);
    }
  }

  private async getTables(catalog?: string, schema?: string): Promise<any[]> {
    let sql = `
      SELECT 
        TABSCHEMA as TABLE_SCHEM,
        TABNAME as TABLE_NAME,
        TYPE as TABLE_TYPE,
        REMARKS
      FROM SYSCAT.TABLES
      WHERE 1=1
    `;

    if (catalog) {
      // In DB2, catalog is typically the database name
      // For simplicity, we'll ignore catalog filtering in this basic implementation
      // as DB2 table metadata queries don't typically filter by database
    }

    if (schema) {
      sql += ` AND TABSCHEMA = '${schema.toUpperCase()}'`;
    }

    // Filter out system tables by default
    sql += ` AND TYPE IN ('T', 'V')`;
    
    // If no schema specified, exclude DB2 system schemas to keep results relevant
    if (!schema) {
      sql += ` AND TABSCHEMA NOT LIKE 'SYS%'`;
    }
    
    sql += ` ORDER BY TABSCHEMA, TABNAME`;
    
    // Limit results for performance (remove if needed)
    sql += ` FETCH FIRST 500 ROWS ONLY`;

    return await this.executeQuery(sql);
  }

  private tablesToCsv(tables: any[]): string {
    const columns = [];
    
    if (this.config.supportsMultipleCatalogs()) {
      columns.push({ source: 'TABLE_CAT', target: 'Catalog' });
    }
    if (this.config.supportsMultipleSchemas()) {
      columns.push({ source: 'TABLE_SCHEM', target: 'Schema' });
    }
    columns.push({ source: 'TABLE_NAME', target: 'Table' });
    columns.push({ source: 'REMARKS', target: 'Description' });

    return CsvUtils.metadataToCsv(tables, columns);
  }
}