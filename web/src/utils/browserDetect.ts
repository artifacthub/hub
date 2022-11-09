const parser = require('ua-parser-js');

class BrowserDetect {
  private ua: any = {};

  public init() {
    this.ua = parser(navigator.userAgent);
  }

  public isSafari16oriPhone(): boolean {
    if ((this.ua.browser.name === 'Safari' && this.ua.browser.major === '16') || this.ua.device.model === 'iPhone') {
      return true;
    }
    return false;
  }
}

const browserDetect = new BrowserDetect();
browserDetect.init();
export default browserDetect;
