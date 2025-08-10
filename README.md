# Szron DB2 MCP Server

A Node.js Model Context Protocol (MCP) server for IBM DB2 with full read-write capabilities. This server provides AI clients like Claude Desktop with comprehensive access to IBM DB2 databases.

## Features

- **Read Operations**: Query tables, get table/column metadata, execute SELECT statements
- **Write Operations**: Insert, update, and delete data with proper validation
- **DDL Operations**: Create, alter, and drop tables with comprehensive constraint support
- **Security**: SQL injection protection and query validation
- **TypeScript**: Full type safety and modern JavaScript features
- **Comprehensive Logging**: Detailed logging with configurable levels
- **Error Handling**: Robust error handling and user-friendly error messages

## Prerequisites

- Node.js 18.0.0 or higher
- IBM DB2 database access
- IBM DB2 client libraries installed

## Installation

1. Clone or download this repository
2. Navigate to the project directory:
   ```bash
   cd szron-db2-mcp
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Build the project:
   ```bash
   npm run build
   ```

## Configuration

1. Copy the example configuration file:
   ```bash
   cp db2.prp.example db2.prp
   ```

2. Edit `db2.prp` with your DB2 connection details:
   ```properties
   Prefix=db2
   ServerName=SzronDB2
   ServerVersion=1.0
   ConnectionString=DATABASE=sample;HOSTNAME=localhost;PORT=50000;PROTOCOL=TCPIP;UID=db2inst1;PWD=password
   # Optional: Tables=EMPLOYEE,DEPARTMENT
   # Optional: LogFile=szron-db2-mcp.log
   ```

### Connection String Parameters

The `ConnectionString` parameter supports various IBM DB2 connection options:

- `DATABASE`: Database name
- `HOSTNAME`: DB2 server hostname
- `PORT`: DB2 server port (default: 50000)
- `PROTOCOL`: Connection protocol (usually TCPIP)
- `UID`: Username
- `PWD`: Password
- `CURRENTSCHEMA`: Default schema (optional)
- `SECURITY`: SSL security (optional)
- `CONNECTTIMEOUT`: Connection timeout in seconds (optional)
- `AUTOCOMMIT`: Enable autocommit (optional)

## Running the Server

### Development Mode
```bash
npm run dev db2.prp
```

### Production Mode
```bash
npm start db2.prp
```

### Direct Execution
```bash
node dist/index.js db2.prp
```

## Available Tools

The server provides the following MCP tools (prefixed with your configured prefix, e.g., "db2"):

**Total: 9 tools available**

### Read Tools

1. **`{prefix}_get_tables`**
   - Retrieves list of available tables
   - Optional parameters: `catalog`, `schema`
   - Returns: CSV with table information

2. **`{prefix}_get_columns`**
   - Retrieves column information for a table
   - Required: `table`
   - Optional: `catalog`, `schema`
   - Returns: CSV with column details

3. **`{prefix}_run_query`**
   - Executes SELECT queries
   - Required: `sql`
   - Returns: CSV with query results
   - Security: Only SELECT and WITH statements allowed

### Write Tools

4. **`{prefix}_insert_data`**
   - Inserts new data into a table
   - Required: `table`, `data` (object with column-value pairs)
   - Optional: `catalog`, `schema`
   - Returns: Success message with row count

5. **`{prefix}_update_data`**
   - Updates existing data in a table
   - Required: `table`, `data` (new values), `where` (conditions)
   - Optional: `catalog`, `schema`
   - Returns: Success message with affected row count

6. **`{prefix}_delete_data`**
   - Deletes data from a table
   - Required: `table`, `where` (conditions)
   - Optional: `catalog`, `schema`
   - Returns: Success message with deleted row count
   - Security: WHERE conditions required to prevent accidental data loss

### DDL Tools

7. **`{prefix}_create_table`**
   - Creates new tables with comprehensive column and constraint definitions
   - Required: `table`, `columns` (array of column definitions)
   - Optional: `schema`, `primaryKeys`, `uniqueConstraints`, `checkConstraints`
   - Supports: Data types, NOT NULL, defaults, primary keys, unique constraints, check constraints
   - Returns: Success message with table creation confirmation

8. **`{prefix}_alter_table`**
   - Modifies existing table structure
   - Required: `table`, `operation`
   - Operations: ADD_COLUMN, DROP_COLUMN, MODIFY_COLUMN, RENAME_COLUMN, ADD_CONSTRAINT, DROP_CONSTRAINT
   - Supports: Column modifications, constraint management
   - Returns: Success message with alteration details

9. **`{prefix}_drop_table`**
   - Drops (deletes) existing tables
   - Required: `table`, `confirm` (must be true)
   - Optional: `schema`, `cascade`, `ifExists`
   - Security: Requires explicit confirmation to prevent accidental deletions
   - Returns: Success message with table deletion confirmation

## Using with Claude Desktop

1. Build the server:
   ```bash
   npm run build
   ```

2. Add to your Claude Desktop configuration (`claude_desktop_config.json`):

   **Windows:**
   ```json
   {
     "mcpServers": {
       "szron-db2": {
         "command": "node",
         "args": [
           "C:\\path\\to\\szron-db2-mcp\\dist\\index.js",
           "C:\\path\\to\\szron-db2-mcp\\db2.prp"
         ]
       }
     }
   }
   ```

   **macOS/Linux:**
   ```json
   {
     "mcpServers": {
       "szron-db2": {
         "command": "node",
         "args": [
           "/path/to/szron-db2-mcp/dist/index.js",
           "/path/to/szron-db2-mcp/db2.prp"
         ]
       }
     }
   }
   ```

3. Restart Claude Desktop

## Example Usage

Once configured with Claude Desktop, you can ask Claude to:

### Data Operations
- **"What tables are available in the database?"**
- **"Show me the structure of the EMPLOYEE table"**
- **"Find all employees with salary > 50000"**
- **"Add a new employee with name 'John Doe', department 'IT', salary 60000"**
- **"Update the salary of employee ID 123 to 65000"**
- **"Delete all inactive users from the USERS table"**

### DDL Operations
- **"Create a new table called PROJECTS with columns for ID, name, budget, and start date"**
- **"Add a new column STATUS to the EMPLOYEE table"**
- **"Drop the temporary table TEMP_DATA"**
- **"Add a check constraint to ensure salary is positive"**
- **"Create a table with primary key and unique constraints"**

## Security Features

- **SQL Injection Protection**: All values are properly quoted and escaped
- **Query Validation**: Only safe SELECT statements allowed for queries
- **Required WHERE Clauses**: UPDATE and DELETE operations require WHERE conditions
- **DDL Confirmation**: DROP TABLE requires explicit confirmation to prevent accidents
- **Column Type Validation**: CREATE/ALTER operations validate DB2 data types
- **Input Validation**: All tool parameters are validated before execution
- **Error Handling**: Database errors are caught and returned safely

## Development

### Scripts

- `npm run build`: Compile TypeScript to JavaScript
- `npm run dev`: Run in development mode with auto-reload
- `npm test`: Run test suite
- `npm run lint`: Run ESLint
- `npm run format`: Format code with Prettier

### Project Structure

```
src/
├── config/
│   └── Config.ts          # Configuration management
├── tools/
│   ├── BaseTool.ts        # Base tool class
│   ├── GetTablesTool.ts   # Get tables tool
│   ├── GetColumnsTool.ts  # Get columns tool
│   ├── RunQueryTool.ts    # Run query tool
│   ├── InsertDataTool.ts  # Insert data tool
│   ├── UpdateDataTool.ts  # Update data tool
│   ├── DeleteDataTool.ts  # Delete data tool
│   ├── CreateTableTool.ts # Create table DDL tool
│   ├── AlterTableTool.ts  # Alter table DDL tool
│   └── DropTableTool.ts   # Drop table DDL tool
├── utils/
│   ├── csvUtils.ts        # CSV formatting utilities
│   └── logger.ts          # Logging utilities
└── index.ts               # Main server entry point
```

## Troubleshooting

### Connection Issues

1. **"Failed to connect to database"**
   - Verify DB2 server is running
   - Check hostname, port, username, and password
   - Ensure DB2 client libraries are installed
   - Test connection using DB2 command line tools

2. **"Database not found"**
   - Verify database name is correct
   - Check if database is cataloged correctly
   - Ensure user has access to the specified database

### Tool Issues

3. **"Tool not found"**
   - Restart Claude Desktop completely
   - Verify configuration file syntax
   - Check server logs for initialization errors

4. **"Permission denied"**
   - Verify user has necessary database privileges
   - Check schema access permissions
   - Ensure table-level permissions are granted

### DDL Issues

5. **"Table reorganization required" (SQL0668N)**
   - After ALTER TABLE operations, DB2 may require table reorganization
   - Run: `CALL SYSPROC.ADMIN_CMD('REORG TABLE schema.table')`
   - This is automatic for some operations but may be needed manually

6. **"Column cannot be part of unique constraint" (SQL0542N)**
   - Ensure columns in unique constraints are NOT NULL
   - DB2 requires NOT NULL for primary key and unique constraint columns

### Performance

7. **Slow queries**
   - Review query complexity and optimization
   - Check database indexes
   - Monitor database server performance
   - Consider connection pool settings

## License

MIT License - see LICENSE file for details.

## Support

For issues, questions, or contributions:

1. Check the troubleshooting section above
2. Review the IBM DB2 documentation
3. Check Node.js ibm_db driver documentation
4. Create an issue in the project repository