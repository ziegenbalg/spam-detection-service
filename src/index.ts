import { SpamDetectionServer } from './server';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

async function main() {
  try {
    const server = new SpamDetectionServer(PORT);
    await server.start();
    console.log(`🚀 Twitter Spam Detection API is running on http://localhost:${PORT}`);
    console.log('Available endpoints:');
    console.log('  POST /validate-post - Validate a Twitter post');
    console.log('  GET  /health        - Health check');
    console.log('  GET  /config        - Get current configuration');
    console.log('  PUT  /config        - Update configuration');
    console.log('  GET  /rules         - List available rules');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { SpamDetectionServer };
export * from './types';
export * from './spam-detector';