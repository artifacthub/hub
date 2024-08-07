// eslint-disable-next-line @typescript-eslint/no-require-imports
const parser = require('ua-parser-js');

class BrowserDetect {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private ua: any = {};

  public init() {
    this.ua = parser(navigator.userAgent);
  }

  public isSafari(): boolean {
    if (this.ua.browser.name.includes('Safari')) {
      return true;
    }
    return false;
  }
}

const browserDetect = new BrowserDetect();
browserDetect.init();
export default browserDetect;
