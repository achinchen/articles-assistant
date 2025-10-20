// Vercel serverless function entry point
// Set up path resolution for tsconfig-paths
require('tsconfig-paths/register');
require('ts-node/register');

// Import environment variables
require('dotenv').config({ path: '../.env' });

const { createServer } = require('../src/api/server.ts');

// Create the Express app using the existing factory function
const app = createServer(3000); // Port doesn't matter for Vercel

// Export for Vercel
module.exports = app;