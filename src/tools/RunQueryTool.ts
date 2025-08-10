import { CallToolRequest, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, Tool } from './BaseTool.js';
import { CsvUtils } from '../utils/csvUtils.js';

export class RunQueryTool extends BaseTool {
  getTool(): Tool {
    const quotes = this.config.getIdentifierQuoteChar();
    const prefix = this.config.getPrefix();
    const formatDesc = "The output of the tool will be returned in CSV format, with the first line containing column headers.";
    
    const description = `Execute a SQL SELECT query. Use the '${prefix}_get_tables' tool to get a list of available tables, ` +
      `and the '${prefix}_get_columns' tool to list table columns. ` +
      `The SQL dialect is DB2 SQL. Identifiers should be quoted using '${quotes}' characters. ` +
      `Valid clauses: FROM, INNER JOIN, LEFT JOIN, RIGHT JOIN, FULL OUTER JOIN, GROUP BY, ORDER BY, LIMIT/OFFSET. ${formatDesc}`;

    return {
      name: `${prefix}_run_query`,
      description: "Execute a SQL SELECT statement.",
      inputSchema: {
        type: "object",
        properties: {
          sql: {
            type: "string",
            description: description
          }
        },
        required: ["sql"]
      },
      handler: this.handleRequest.bind(this)
    };
  }

  private async handleRequest(request: CallToolRequest): Promise<CallToolResult> {
    try {
      const args = request.params.arguments || {};
      const sql = this.validateRequired(args, 'sql');

      this.logger.info('RunQueryTool: {}', sql);

      // Basic validation to ensure it's a SELECT query for security
      const trimmedSql = sql.trim().toUpperCase();
      if (!trimmedSql.startsWith('SELECT') && !trimmedSql.startsWith('WITH')) {
        throw new Error('Only SELECT and WITH statements are allowed');
      }

      // Check for potentially dangerous keywords
      const dangerousKeywords = [
        'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
        'TRUNCATE', 'GRANT', 'REVOKE', 'CALL', 'EXEC'
      ];
      
      for (const keyword of dangerousKeywords) {
        if (trimmedSql.includes(keyword)) {
          throw new Error(`The keyword '${keyword}' is not allowed in queries`);
        }
      }

      const result = await this.executeQuery(sql);
      const csv = CsvUtils.resultToCsv(result);

      return this.createSuccessResult([this.createTextContent(csv)]);
    } catch (error) {
      this.logger.error('RunQueryTool failed: {}', (error as Error).message);
      return this.createErrorResult((error as Error).message);
    }
  }
}