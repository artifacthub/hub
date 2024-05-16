import throttle from 'lodash/throttle';
import { useEffect, useState } from 'react';

const getDeviceConfig = (width: number) => {
  if (width < 576) {
    return 'xs';
  } else if (width >= 576 && width < 768) {
    return 'sm';
  } else if (width >= 768 && width < 992) {
    return 'md';
  } else if (width >= 992 && width < 1200) {
    return 'lg';
  } else if (width >= 1200 && width < 1400) {
    return 'xl';
  } else if (width >= 1400 && width < 1920) {
    return 'xxl';
  } else if (width >= 1920) {
    return 'xxxl';
  }
};

const useBreakpointDetect = () => {
  const [brkPnt, setBrkPnt] = useState(() => getDeviceConfig(window.innerWidth));

  useEffect(() => {
    const calcInnerWidth = throttle(() => {
      setBrkPnt(getDeviceConfig(window.innerWidth));
    }, 200);
    window.addEventListener('resize', calcInnerWidth);

    return () => window.removeEventListener('resize', calcInnerWidth);
  }, []);

  return brkPnt;
};

export default useBreakpointDetect;
