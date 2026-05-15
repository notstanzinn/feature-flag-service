import { createClient } from 'redis';

let redisClient = null;

export const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL
    });

    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    redisClient.on('connect', () => console.log('Redis Connected'));

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('Redis connection error:', error);
    return null;
  }
};

export const getRedisClient = () => redisClient;

export const setFlagCache = async (envSecretKey, flagKey, flagData) => {
  if (!redisClient) return;
  try {
    await redisClient.hSet(`flags:${envSecretKey}`, flagKey, JSON.stringify(flagData));
  } catch (error) {
    console.error('Redis set error:', error);
  }
};

export const getFlagCache = async (envSecretKey, flagKey) => {
  if (!redisClient) return null;
  try {
    const data = await redisClient.hGet(`flags:${envSecretKey}`, flagKey);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
};

export const getAllFlagsCache = async (envSecretKey) => {
  if (!redisClient) return null;
  try {
    const data = await redisClient.hGetAll(`flags:${envSecretKey}`);
    const flags = {};
    for (const [key, value] of Object.entries(data)) {
      flags[key] = JSON.parse(value);
    }
    return Object.keys(flags).length > 0 ? flags : null;
  } catch (error) {
    console.error('Redis getAll error:', error);
    return null;
  }
};

export const invalidateEnvCache = async (envSecretKey) => {
  if (!redisClient) return;
  try {
    await redisClient.del(`flags:${envSecretKey}`);
  } catch (error) {
    console.error('Redis delete error:', error);
  }
};

export const setAllFlagsCache = async (envSecretKey, flags) => {
  if (!redisClient || !flags) return;
  try {
    const pipeline = redisClient.multi();
    pipeline.del(`flags:${envSecretKey}`);
    for (const [key, value] of Object.entries(flags)) {
      pipeline.hSet(`flags:${envSecretKey}`, key, JSON.stringify(value));
    }
    await pipeline.exec();
  } catch (error) {
    console.error('Redis bulk set error:', error);
  }
};