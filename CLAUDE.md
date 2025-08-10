# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript/Node.js-based Model Context Protocol (MCP) server for IBM DB2. It provides full read-write access to IBM DB2 databases through the native `ibm_db` driver, exposing database operations via MCP tools for use with AI clients like Claude Desktop.

## Build and Development Commands

### Building the Project
```bash
npm run build
```
This compiles TypeScript to JavaScript in the `dist` directory.

### Running Tests
```bash
npm test
# OR run unit tests directly:
node dist/test/unit-tests.js
```

### Running the MCP Server
```bash
node dist/index.js db2.prp
```

## Architecture

### Core Components

- **index.ts** (`src/index.ts`): Main entry point that initializes the MCP server with stdio transport
- **Config.ts** (`src/config/Config.ts`): Handles configuration loading from .prp files and DB2 connection management
- **Tools** (`src/tools/`): MCP tool implementations
  - `GetTablesTool`: Retrieves available tables
  - `GetColumnsTool`: Retrieves column metadata for tables  
  - `RunQueryTool`: Executes SQL SELECT queries
  - `InsertDataTool`: Insert new data into tables
  - `UpdateDataTool`: Update existing data in tables
  - `DeleteDataTool`: Delete data from tables
  - `CreateTableTool`: Create new tables with DDL
  - `DropTableTool`: Drop existing tables
  - `AlterTableTool`: Alter table structure
- **Utils** (`src/utils/`): Utility modules for CSV formatting and logging

### Configuration System

The server uses `.prp` property files with these key settings:
- `Prefix`: Tool name prefix (e.g., "szron-db2-mcp")
- `ServerName`: Server identification name
- `ServerVersion`: Server version (default: "1.0")
- `ConnectionString`: DB2 connection string with TCP/IP protocol
- `Tables`: Comma-separated list of tables (empty = all tables)
- `LogFile`: Optional log file path

### MCP Integration

- Uses the MCP SDK v1.0.0 (`@modelcontextprotocol/sdk`)
- Implements stdio transport for communication with MCP clients
- Exposes 9 tools with dynamic prefixes based on configuration
- Supports CSV-formatted output for data exchange

### Key Dependencies

- @modelcontextprotocol/sdk v1.0.0
- ibm_db v3.2.4 (native DB2 driver)
- csv-stringify v6.4.5 and csv-parse v5.5.2
- TypeScript v5.3.0 and Node.js 18+

## Development Notes

- The server provides full read-write access to DB2 databases
- Native `ibm_db` driver for optimal performance
- Comprehensive error handling and SQL injection protection
- CSV output format for consistent data exchange with MCP clients
- Requires proper DB2 TCP/IP configuration for Node.js connections

## DB2 Database Connection

### CRITICAL: TCP/IP Configuration
**IMPORTANT:** For Node.js connections to work, DB2 must be configured for TCP/IP communication:

```bash
# Configure DB2 for TCP/IP (REQUIRED for Node.js)
db2set DB2COMM=TCPIP
db2stop force
db2start
```

### Connection String Format
```
ConnectionString=DATABASE=<database>;HOSTNAME=<host>;PORT=50000;PROTOCOL=TCPIP;UID=<user>;PWD=<password>
```

### Database Configuration
- **Database**: `<database>` — name of the target DB2 database
- **Host**: `<host>` — e.g. `localhost` for a local DB2 instance
- **Port**: `50000` — DB2 default, configured via `SVCENAME`
- **User** / **Password**: DB2 account credentials — keep real values out of version control (never commit them)
- **Schemas / Tables**: scope which tables are exposed via the `Tables` option in the `.prp` file (leave empty to expose all)