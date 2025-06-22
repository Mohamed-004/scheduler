#!/usr/bin/env node

/**
 * Setup script for Supabase MCP Server
 * This script helps configure the MCP server for AI tools like Cursor
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupMCP() {
  console.log('🚀 Supabase MCP Server Setup');
  console.log('============================\n');
  
  console.log('This script will help you configure the Supabase MCP server for AI tools.\n');
  
  // Get project reference
  const projectRef = await question('Enter your Supabase project reference (from dashboard URL): ');
  if (!projectRef) {
    console.log('❌ Project reference is required');
    process.exit(1);
  }
  
  // Get personal access token
  const accessToken = await question('Enter your Supabase personal access token: ');
  if (!accessToken) {
    console.log('❌ Personal access token is required');
    process.exit(1);
  }
  
  // Ask which AI tool to configure
  console.log('\nWhich AI tool would you like to configure?');
  console.log('1. Cursor');
  console.log('2. VS Code with Copilot');
  console.log('3. Both');
  
  const toolChoice = await question('Enter your choice (1-3): ');
  
  const mcpConfig = {
    mcpServers: {
      supabase: {
        command: "npx",
        args: [
          "-y",
          "@supabase/mcp-server-supabase@latest",
          "--read-only",
          `--project-ref=${projectRef}`
        ],
        env: {
          SUPABASE_ACCESS_TOKEN: accessToken
        }
      }
    }
  };
  
  try {
    if (toolChoice === '1' || toolChoice === '3') {
      // Setup for Cursor
      const cursorDir = path.join(process.cwd(), '.cursor');
      if (!fs.existsSync(cursorDir)) {
        fs.mkdirSync(cursorDir, { recursive: true });
      }
      
      const cursorConfigPath = path.join(cursorDir, 'mcp.json');
      fs.writeFileSync(cursorConfigPath, JSON.stringify(mcpConfig, null, 2));
      console.log('✅ Cursor configuration created at .cursor/mcp.json');
    }
    
    if (toolChoice === '2' || toolChoice === '3') {
      // Setup for VS Code
      const vscodeDir = path.join(process.cwd(), '.vscode');
      if (!fs.existsSync(vscodeDir)) {
        fs.mkdirSync(vscodeDir, { recursive: true });
      }
      
      // VS Code uses a slightly different format
      const vscodeConfig = {
        inputs: [
          {
            type: "promptString",
            id: "supabase-access-token",
            description: "Supabase personal access token",
            password: true
          }
        ],
        servers: {
          supabase: {
            command: "npx",
            args: ["-y", "@supabase/mcp-server-supabase@latest", "--read-only", `--project-ref=${projectRef}`],
            env: {
              SUPABASE_ACCESS_TOKEN: "${input:supabase-access-token}"
            }
          }
        }
      };
      
      const vscodeConfigPath = path.join(vscodeDir, 'mcp.json');
      fs.writeFileSync(vscodeConfigPath, JSON.stringify(vscodeConfig, null, 2));
      console.log('✅ VS Code configuration created at .vscode/mcp.json');
    }
    
    console.log('\n🎉 MCP setup complete!');
    console.log('\nNext steps:');
    console.log('1. Restart your AI tool (Cursor/VS Code)');
    console.log('2. Check the MCP settings to see if the server is active');
    console.log('3. Try asking your AI assistant: "Show me the database schema"');
    console.log('\n⚠️  Important: Your access token is stored locally. Keep it secure!');
    
  } catch (error) {
    console.error('❌ Error creating configuration:', error.message);
    process.exit(1);
  }
  
  rl.close();
}

// Run the setup
setupMCP().catch(console.error); 