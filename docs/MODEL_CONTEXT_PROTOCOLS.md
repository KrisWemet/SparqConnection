# Model Context Protocols (MCP)

We use MCP to give Claude/Cursor safe access to tools:

* **Supabase MCP**: design tables, run SQL, read logs.
* **Context7 MCP**: fetch latest docs/examples for frameworks.
* **Sentry MCP**: query errors by tag/release.

## mcp.json (project‑local)

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "SUPABASE_PAT",
        "SUPABASE_PROJECT_ID": "SUPABASE_PROJECT_REF",
        "OPENAI_API_KEY": "OPENAI_KEY_OPTIONAL"
      }
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    },
    "sentry": {
      "command": "npx",
      "args": ["-y", "@sentry/mcp-server@latest"],
      "env": {
        "SENTRY_AUTH_TOKEN": "SENTRY_TOKEN",
        "SENTRY_ORG": "SENTRY_ORG",
        "SENTRY_PROJECT": "SENTRY_PROJECT"
      }
    }
  }
}
```

## Ops

* Rotate tokens quarterly. Keep a simple **smoke test**: list tables (Supabase), fetch a doc page (Context7), query last 10 errors (Sentry).