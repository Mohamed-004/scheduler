# Supabase MCP Server Setup

This document explains how to set up the Supabase Model Context Protocol (MCP) server to allow AI tools like Cursor to read and interact with your database.

## What is MCP?

The Model Context Protocol (MCP) allows Large Language Models (LLMs) to connect directly to platforms like Supabase. Once configured, your AI assistant can:

- Read database schema and table structures
- Execute SQL queries to fetch data
- Help debug database issues
- Generate TypeScript types from your schema
- Fetch project configuration
- Analyze data and create reports

## Prerequisites

- Supabase project (already set up)
- Cursor IDE or other MCP-compatible AI tool
- Node.js installed on your system

## Step 1: Create Personal Access Token

1. Go to [Supabase Account Settings](https://supabase.com/dashboard/account/tokens)
2. Click "Create new token"
3. Name it "Cursor MCP Server" or similar
4. Copy the generated token (keep it secure!)

## Step 2: Get Project Reference

1. Go to your project dashboard
2. Copy the project reference from the URL: `https://supabase.com/dashboard/project/[YOUR_PROJECT_REF]`
3. The project ref is the string after `/project/`

## Step 3: Configure Cursor

1. Open the `.cursor/mcp.json` file in your project root
2. Replace `YOUR_PROJECT_REF_HERE` with your actual project reference
3. Replace `YOUR_PERSONAL_ACCESS_TOKEN_HERE` with your personal access token

Example configuration:
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only",
        "--project-ref=abcdefghijklmnop"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_1234567890abcdef..."
      }
    }
  }
}
```

## Step 4: Restart Cursor

1. Save the configuration file
2. Restart Cursor completely
3. Go to **Settings > MCP** in Cursor
4. You should see a green "Active" status for the Supabase server

## Step 5: Test the Connection

Try asking Cursor to:
- "Show me the database schema"
- "What tables do we have in the database?"
- "Fetch the first 5 users from the users table"
- "Generate TypeScript types for our database"

## Available MCP Tools

The Supabase MCP server provides these capabilities:

### Database Operations
- `list_tables` - List all tables in your database
- `describe_table` - Get table schema and column details
- `run_sql` - Execute SQL queries (read-only)
- `generate_types` - Generate TypeScript types from schema

### Project Management
- `get_project_config` - Fetch project configuration
- `list_functions` - List Edge Functions
- `get_function_logs` - Retrieve function logs

### Schema Management
- `list_migrations` - View migration history
- `describe_schema` - Get complete schema information

## Security Notes

- The configuration uses `--read-only` mode for safety
- Your personal access token is stored locally in the config file
- Add `.cursor/mcp.json` to `.gitignore` if it contains sensitive tokens
- The MCP server only has read access to your database

## Troubleshooting

### MCP Server Not Active
1. Check that your personal access token is valid
2. Verify the project reference is correct
3. Ensure you have internet connection
4. Try restarting Cursor

### Permission Errors
1. Make sure your personal access token has the right permissions
2. Check that your Supabase project is accessible
3. Verify you're not hitting rate limits

### Connection Issues
1. Check your network connection
2. Verify Supabase service status
3. Try regenerating your personal access token

## Alternative AI Tools

The same configuration works with other MCP-compatible tools:

### Claude Desktop
Place the config in Claude's settings under Developer > Edit Config

### VS Code with Copilot
Create `.vscode/mcp.json` with the same configuration

### Windsurf
Use the Cascade assistant's MCP configuration

## Example Usage

Once configured, you can ask your AI assistant:

```
"Can you check if there are any users in the database who haven't completed their setup?"

"Show me the structure of the jobs table and explain the relationships"

"Generate TypeScript interfaces for all our database tables"

"Are there any database constraints or indexes I should know about?"

"Help me understand why users might not be completing the setup flow"
```

## Security Best Practices

1. **Never commit tokens**: Add `.cursor/mcp.json` to `.gitignore`
2. **Use read-only mode**: Always include `--read-only` flag
3. **Rotate tokens**: Regularly regenerate your personal access tokens
4. **Limit scope**: Only give the AI access to what it needs
5. **Monitor usage**: Check your Supabase logs for unexpected queries

## Next Steps

After setup, your AI assistant can help you:
- Debug authentication issues
- Analyze user setup completion rates
- Optimize database queries
- Generate proper TypeScript types
- Understand data relationships
- Troubleshoot application issues

The AI will have read-only access to your entire database schema and data, making it an excellent debugging and development companion. 