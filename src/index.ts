#!/usr/bin/env node
/**
 * Jira MCP Server - Entry Point
 *
 * A Model Context Protocol server that enables AI assistants
 * to interact with Jira Cloud via REST API.
 *
 * @module jira-mcp
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config/index.js';
import { initializeClient } from './jira/client.js';
import { createServer } from './server.js';
import { logger } from './utils/logger.js';
import { ConfigurationError, AuthenticationError } from './utils/errors.js';

/**
 * Main entry point for the Jira MCP server.
 */
async function main(): Promise<void> {
  logger.info('Starting Jira MCP server...');

  try {
    // Load and validate configuration
    const config = loadConfig();
    logger.setLevel(config.logLevel);
    logger.info('Configuration loaded successfully');

    // Initialize Jira client
    const client = initializeClient(config.jira, config.rateLimit);

    // Validate connection to Jira
    logger.info('Validating Jira connection...');
    const isValid = await client.validateConnection();
    if (!isValid) {
      throw new AuthenticationError(
        'Failed to connect to Jira. Please check your credentials.'
      );
    }
    logger.info('Jira connection validated');

    // Create MCP server
    const server = createServer();

    // Set up stdio transport
    const transport = new StdioServerTransport();

    // Connect server to transport
    await server.connect(transport);

    logger.info('Jira MCP server is running');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down...');
      await server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down...');
      await server.close();
      process.exit(0);
    });
  } catch (error) {
    if (error instanceof ConfigurationError) {
      logger.error('Configuration error', error);
      console.error(`\nConfiguration Error: ${error.message}`);
      console.error('\nPlease set the following environment variables:');
      console.error('  JIRA_BASE_URL - Your Jira instance URL');
      console.error('  JIRA_EMAIL - Your Atlassian account email');
      console.error('  JIRA_API_TOKEN - Your Jira API token');
      console.error(
        '\nSee https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/'
      );
      process.exit(1);
    }

    if (error instanceof AuthenticationError) {
      logger.error('Authentication error', error);
      console.error(`\nAuthentication Error: ${error.message}`);
      console.error('\nPlease verify:');
      console.error('  1. Your JIRA_EMAIL is correct');
      console.error('  2. Your JIRA_API_TOKEN is valid and not expired');
      console.error('  3. Your JIRA_BASE_URL is correct');
      process.exit(1);
    }

    logger.error('Failed to start server', error as Error);
    console.error('Failed to start Jira MCP server:', (error as Error).message);
    process.exit(1);
  }
}

// Run the server
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
