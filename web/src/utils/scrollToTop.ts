import browserDetect from './browserDetect';

const scrollToTop = (position?: number, behavior?: string): void => {
  const isSafari = browserDetect.isSafari();
  window.scrollTo({
    top: position || 0,
    // @ts-ignore: Unreachable code error
    behavior: isSafari ? 'instant' : behavior || 'auto',
  });
};

export default scrollToTop;
