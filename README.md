# Szron DB2 MCP Server

A Node.js [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for **IBM DB2**. It gives MCP clients (Claude Code, Claude Desktop) full read-write access to a DB2 database.

## Features

- **Read** — list tables, inspect columns, run `SELECT` queries
- **Write** — insert / update / delete rows (UPDATE and DELETE require a `WHERE` clause)
- **DDL** — create / alter / drop tables (DROP requires explicit confirmation)
- SQL-injection protection, input validation, CSV-formatted output

## Prerequisites

- Node.js 18+ and `git`
- Network access to an IBM DB2 database (default port `50000`)
- No separate DB2 client needed — the `ibm_db` npm package installs its own driver

## Install

```bash
git clone https://github.com/clone147/szron-db2-mcp.git
cd szron-db2-mcp
npm install
npm run build
```

## Configure

Copy the example config and fill in your own DB2 connection details:

```bash
cp db2.prp.example db2.prp
```

`db2.prp`:

```properties
Prefix=szron-db2-mcp
ServerName=SzronDB2_MCP_Server
ServerVersion=1.0
ConnectionString=DATABASE=<database>;HOSTNAME=<host>;PORT=50000;PROTOCOL=TCPIP;UID=<user>;PWD=<password>;CURRENTSCHEMA=<schema>
LogFile=mcp-server.log
```

`ConnectionString` keys: `DATABASE`, `HOSTNAME`, `PORT`, `PROTOCOL` (`TCPIP`), `UID`, `PWD`,
and optionally `CURRENTSCHEMA`, `SECURITY` (SSL), `CONNECTTIMEOUT`. Add `Tables=T1,T2` to expose
only specific tables (omit = all). `db2.prp` is gitignored — keep credentials out of version control.

Verify the server starts:

```bash
node dist/index.js db2.prp
```

## Register with an MCP client

Use **absolute paths**. On Windows, escape backslashes as `\\` inside JSON.

### Claude Code

```bash
claude mcp add szron-db2-mcp --scope user -- node "/abs/path/szron-db2-mcp/dist/index.js" "/abs/path/szron-db2-mcp/db2.prp"
```

Check the status with `claude mcp list`.

### Claude Desktop

Add to `claude_desktop_config.json`, then fully restart Claude Desktop:

```json
{
  "mcpServers": {
    "szron-db2-mcp": {
      "command": "node",
      "args": [
        "/abs/path/szron-db2-mcp/dist/index.js",
        "/abs/path/szron-db2-mcp/db2.prp"
      ]
    }
  }
}
```

## Tools

All tool names are prefixed with `Prefix` from `db2.prp` (e.g. `szron-db2-mcp_get_tables`).

| Tool | Purpose |
|------|---------|
| `get_tables`   | List tables (optional `catalog`, `schema`) |
| `get_columns`  | Column metadata for a `table` |
| `run_query`    | Run a `SELECT` / `WITH` query |
| `insert_data`  | Insert a row (`table`, `data`) |
| `update_data`  | Update rows (`table`, `data`, `where`) |
| `delete_data`  | Delete rows (`table`, `where` — required) |
| `create_table` | Create a table (`table`, `columns`, constraints) |
| `alter_table`  | Alter a table (`table`, `operation`) |
| `drop_table`   | Drop a table (`table`, `confirm: true`) |

## Troubleshooting

- **Failed to connect** — make sure DB2 is running and reachable; re-check host/port/credentials in `db2.prp`. For a remote DB2, set `db2set DB2COMM=TCPIP` on the server and open the firewall for the port.
- **Tools not visible** — config paths must be absolute; then fully restart the MCP client. See `mcp-server.log`.
- **`npm install` fails on `ibm_db`** — it is a native module; needs internet access during install and Node.js 18+.
- **`SQL0668N` after `ALTER TABLE`** — run `CALL SYSPROC.ADMIN_CMD('REORG TABLE schema.table')`.

## Development

`npm run dev db2.prp` (watch mode) · `npm test` · `npm run lint` · `npm run build`

```
src/
├── config/Config.ts   # configuration + DB2 connection
├── tools/             # one file per MCP tool
├── utils/             # CSV + logging helpers
└── index.ts           # server entry point
```

## License

MIT — see [LICENSE](LICENSE).
