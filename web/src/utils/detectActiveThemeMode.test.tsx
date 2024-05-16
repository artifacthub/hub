import detectActiveThemeMode from './detectActiveThemeMode';

describe('detectActiveThemeMode', () => {
  (window as Window).matchMedia =
    window.matchMedia ||
    function () {
      return {
        matches: false,
        addListener: function () {},
        removeListener: function () {},
      };
    };

  it('when does not match dark mode', () => {
    expect(detectActiveThemeMode()).toBe('light');
  });
});
