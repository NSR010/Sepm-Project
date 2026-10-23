const Redis = require('ioredis');

// Global / Singleton pattern to prevent duplicate instances during development hot-reloads
let redis;

if (!global.__redisClient) {
  const redisUrl = process.env.REDIS_URL;
  const isUpstash = redisUrl && (redisUrl.includes('upstash.io') || redisUrl.startsWith('rediss://'));

  const options = {
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    retryStrategy(times) {
      // Reconnect after an exponential backoff (up to 3 seconds)
      const delay = Math.min(times * 200, 3000);
      return delay;
    }
  };

  // Upstash uses TLS/SSL (rediss://)
  if (isUpstash) {
    options.tls = {
      rejectUnauthorized: false
    };
  }

  if (redisUrl) {
    global.__redisClient = new Redis(redisUrl, options);
  } else {
    // Default local fallback
    global.__redisClient = new Redis({
      host: '127.0.0.1',
      port: 6379,
      maxRetriesPerRequest: 1
    });
  }

  global.__redisClient.on('connect', () => {
    console.log(` Redis connected successfully (${isUpstash ? 'Upstash Cloud' : 'Local'})`);
  });

  global.__redisClient.on('error', (err) => {
    // Log warning without killing the server
    console.warn(' Redis connection notice:', err.message);
  });
}

redis = global.__redisClient;

module.exports = redis;
