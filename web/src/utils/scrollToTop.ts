import browserDetect from './browserDetect';

const scrollToTop = (position?: number, behavior?: ScrollBehavior): void => {
  const isSafari = browserDetect.isSafari();
  window.scrollTo({
    top: position || 0,
    behavior: isSafari ? 'instant' : behavior || 'auto',
  });
};

export default scrollToTop;
