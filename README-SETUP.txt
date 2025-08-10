===========================================
DB2 MCP SERVER FOR CLAUDE DESKTOP
===========================================

TESTED AND WORKING ✅

QUICK SETUP (3 steps):

1. EXTRACT TO: C:\MCP-Servers\db2\
   (or any permanent location)

2. RUN: install.bat
   This will:
   - Install Node.js dependencies
   - Test the server
   - Generate Claude Desktop config

3. ADD TO CLAUDE DESKTOP:
   - Open: %APPDATA%\Claude\claude_desktop_config.json
   - Add content from: claude-desktop-config.json
   - Restart Claude Desktop

DONE! Test in Claude: "What DB2 tables are available?"

===========================================
TROUBLESHOOTING:

"Server disconnected" in Claude logs:
- Check db2.prp has correct DB2 credentials
- Verify DB2 server is running
- Test: node dist\index.js db2.prp

"Tools not available":
- Check Claude config JSON syntax
- Ensure paths use double backslashes \\
- Restart Claude Desktop completely

===========================================

AVAILABLE TOOLS (9 total):
- db2_get_tables, db2_get_columns, db2_run_query
- db2_insert_data, db2_update_data, db2_delete_data  
- db2_create_table, db2_alter_table, db2_drop_table

===========================================
