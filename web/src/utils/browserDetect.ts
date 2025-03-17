class BrowserDetect {
  isSafariBrowser: boolean = false;

  public init() {
    this.isSafariBrowser = navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1;
  }

  public isSafari(): boolean {
    return this.isSafariBrowser;
  }
}

const browserDetect = new BrowserDetect();
browserDetect.init();
export default browserDetect;
