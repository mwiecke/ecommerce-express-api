import { NotFoundError } from '../Errors/Custom-errors.js';
import redisClient from '../Utils/Get-Redis-Client.js';

const DEFAULT_EXPIRE_TIME = 60 * 60 * 24 * 7; // 1 week in seconds

class Redis {
  async getOrSetCache(key: string, callback: () => Promise<any>) {
    const cachedData = await redisClient.hGetAll(key);

    if (cachedData && Object.keys(cachedData).length > 0) {
      return cachedData;
    }

    const freshData = await callback();

    if (!freshData) {
      throw new NotFoundError(`Data not found for key: ${key}`);
    }

    await redisClient
      .multi()
      .hSet(key, freshData)
      .expire(key, DEFAULT_EXPIRE_TIME)
      .exec();

    return freshData;
  }

  async addPage(page: number, callback: () => Promise<any>) {
    const pageKey = `page:${page}`;

    const cachedData = await redisClient.hGetAll(pageKey);

    if (cachedData && Object.keys(cachedData).length > 0) {
      return cachedData;
    }

    const freshData = await callback();

    if (!freshData) {
      throw new NotFoundError(`Page ${page} data not found`);
    }

    await redisClient
      .multi()
      .hSet(pageKey, freshData)
      .expire(pageKey, DEFAULT_EXPIRE_TIME)
      .exec();

    return freshData;
  }
}

const redis = new Redis();
export default redis;
