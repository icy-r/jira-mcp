/**
 * Tool registry - exports all tools and their handlers.
 * @module tools
 */

// Consolidated tools (recommended)
export * from './consolidated/index.js';

// Presets
export * from './presets.js';

// Legacy individual tools (kept for backward compatibility)
export * from './issues/index.js';
export * from './projects/index.js';
export * from './sprints/index.js';
export * from './comments/index.js';
export * from './users/index.js';
