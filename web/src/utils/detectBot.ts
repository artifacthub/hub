import { isbot } from 'isbot';

/**
 * Detects if the current request is likely from a bot or crawler using isbot
 * This helps prevent bot traffic from being counted in view statistics
 * @returns boolean indicating if the request is from a bot
 */
const detectBot = (): boolean => {
  try {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined' && window.navigator && window.navigator.userAgent) {
      const userAgent = window.navigator.userAgent;
      // Use isbot to determine if the user agent belongs to a bot
      return isbot(userAgent);
    }

    // If not in browser environment, assume it's not a bot
    return false;
  } catch {
    // In case of any error, assume it's not a bot
    return false;
  }
};

export default detectBot;
