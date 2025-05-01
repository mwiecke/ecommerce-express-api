import { createClient } from 'redis';
import { logger } from './logger.ts';

const redisClient = createClient();

redisClient
  .connect()
  .then(() => logger.info('Redis connected successfully'))
  .catch((err) => logger.error('Redis connection failed:', err));

redisClient.on('error', (err) => {
  logger.error('Redis client error:', err);
});

export default redisClient;
