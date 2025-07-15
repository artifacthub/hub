import { isbot } from 'isbot';

import detectBot from './detectBot';

// Mock the isbot library for testing
jest.mock('isbot', () => ({
  isbot: jest.fn(),
}));

describe('detectBot', () => {
  const mockIsbot = isbot as jest.MockedFunction<typeof isbot>;
  const originalNavigator = window.navigator;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset navigator
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
  });

  afterEach(() => {
    // Restore original navigator
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
  });

  it('should detect known bots', () => {
    mockIsbot.mockReturnValue(true);
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      writable: true,
    });

    const result = detectBot();
    expect(result).toBe(true);
    expect(mockIsbot).toHaveBeenCalledWith('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
  });

  it('should not detect regular browsers', () => {
    mockIsbot.mockReturnValue(false);
    Object.defineProperty(window.navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      writable: true,
    });

    const result = detectBot();
    expect(result).toBe(false);
    expect(mockIsbot).toHaveBeenCalledWith(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );
  });

  it('should detect Applebot user agent', () => {
    mockIsbot.mockReturnValue(true);
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (compatible; Applebot/1.0; +http://www.apple.com/bot.html)',
      writable: true,
    });

    const result = detectBot();
    expect(result).toBe(true);
    expect(mockIsbot).toHaveBeenCalledWith('Mozilla/5.0 (compatible; Applebot/1.0; +http://www.apple.com/bot.html)');
  });

  it('should detect various Applebot formats', () => {
    const applebotUserAgents = [
      'Mozilla/5.0 (compatible; Applebot/1.0; +http://www.apple.com/bot.html)',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1 (Applebot/0.1; +http://www.apple.com/go/applebot)',
    ];

    applebotUserAgents.forEach((userAgent) => {
      mockIsbot.mockReturnValue(true);
      Object.defineProperty(window.navigator, 'userAgent', {
        value: userAgent,
        writable: true,
      });

      const result = detectBot();
      expect(result).toBe(true);
      expect(mockIsbot).toHaveBeenCalledWith(userAgent);
    });
  });

  it('should handle missing navigator gracefully', () => {
    Object.defineProperty(window, 'navigator', {
      value: undefined,
      writable: true,
    });

    const result = detectBot();
    expect(result).toBe(false);
    expect(mockIsbot).not.toHaveBeenCalled();
  });

  it('should handle missing userAgent gracefully', () => {
    Object.defineProperty(window, 'navigator', {
      value: {},
      writable: true,
    });

    const result = detectBot();
    expect(result).toBe(false);
    expect(mockIsbot).not.toHaveBeenCalled();
  });

  it('should handle isbot errors gracefully', () => {
    mockIsbot.mockImplementation(() => {
      throw new Error('isbot error');
    });
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      writable: true,
    });

    const result = detectBot();
    expect(result).toBe(false);
  });

  it('should handle server-side rendering environment', () => {
    // Mock SSR environment where window is undefined
    const originalWindow = global.window;
    
    // Remove window property using Object.defineProperty
    Object.defineProperty(global, 'window', {
      value: undefined,
      configurable: true,
      writable: true
    });

    const result = detectBot();
    expect(result).toBe(false);
    expect(mockIsbot).not.toHaveBeenCalled();

    // Restore window
    global.window = originalWindow;
  });
});
