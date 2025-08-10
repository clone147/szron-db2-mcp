====================================================
SZRON DB2 MCP SERVER FOR CLAUDE DESKTOP
====================================================

QUICK START (5 minutes):

1. EXTRACT this folder to permanent location
   Example: C:\MCP-Servers\szron-db2\

2. RUN: install.bat
   This will install dependencies and generate config

3. EDIT: db2.prp
   Update with your DB2 connection details

4. ADD to Claude Desktop:
   - Find: %APPDATA%\Claude\claude_desktop_config.json
   - Add the generated configuration
   - Restart Claude Desktop

5. TEST in Claude:
   Ask: "What DB2 tables are available?"

====================================================
AVAILABLE TOOLS (9 total):

db2_get_tables      - List all tables
db2_get_columns     - Show table structure
db2_run_query       - Execute SELECT queries
db2_insert_data     - Insert new records
db2_update_data     - Update existing data
db2_delete_data     - Delete records
db2_create_table    - Create new tables
db2_alter_table     - Modify table structure
db2_drop_table      - Drop tables

====================================================

Size: ~200 KB (plus ~100 MB dependencies on install)
Requirements: Node.js 18+, IBM DB2 client libraries

====================================================
