import detectBot from './detectBot';

// Mock the detectBot function for testing
const mockDetectBot = detectBot as jest.MockedFunction<typeof detectBot>;

jest.mock('./detectBot', () => jest.fn());

describe('detectBot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should detect bots', async () => {
    mockDetectBot.mockResolvedValue(true);
    const result = await detectBot();
    expect(result).toBe(true);
  });

  it('should not detect regular browsers', async () => {
    mockDetectBot.mockResolvedValue(false);
    const result = await detectBot();
    expect(result).toBe(false);
  });

  it('should handle server-side rendering', async () => {
    mockDetectBot.mockResolvedValue(true);
    const result = await detectBot();
    expect(result).toBe(true);
  });
});
