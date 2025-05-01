import redis from './Get-Redis-Client.ts';

export const blacklistToken = async (token: string, expiryMs: number) => {
  await redis.set(token, 'blacklisted', { PX: expiryMs });
};

export const isBlacklisted = async (token: string) => {
  return (await redis.get(token)) === 'blacklisted';
};
