import { load } from '@fingerprintjs/botd';

// Bot detection utility using BotD library for identifying automated requests
// This helps prevent bot traffic from being counted in view statistics

let botdPromise: Promise<Awaited<ReturnType<typeof load>>> | null = null;

/**
 * Initialize BotD library (singleton pattern)
 */
const initializeBotD = async (): Promise<Awaited<ReturnType<typeof load>>> => {
  if (!botdPromise) {
    botdPromise = load();
  }
  return botdPromise;
};

/**
 * Detects if the current request is likely from a bot or crawler using BotD
 * @returns Promise<boolean> indicating if the request is from a bot
 */
const detectBot = async (): Promise<boolean> => {
  try {
    const botd = await initializeBotD();
    const result = await botd.detect();
    return result?.bot || false;
  } catch (error) {
    return false; // In case of error, assume it's not a bot
  }
};

export default detectBot;
