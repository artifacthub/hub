import checkCodeLanguage from './checkCodeLanguage';

describe('checkCodeLanguage', () => {
  it('returns text when language is missing', () => {
    expect(checkCodeLanguage()).toBe('text');
    expect(checkCodeLanguage(null)).toBe('text');
  });

  it('maps console to bash', () => {
    expect(checkCodeLanguage('console')).toBe('bash');
  });

  it('returns the language when it is available', () => {
    expect(checkCodeLanguage('javascript')).toBe('javascript');
  });

  it('falls back to bash when language is unknown', () => {
    expect(checkCodeLanguage('unknown-lang')).toBe('bash');
  });
});
