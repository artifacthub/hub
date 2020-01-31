import { useEffect, useState, useCallback } from 'react';
import throttle from 'lodash/throttle';

const useScroll = (isVisible: boolean, shouldFetch: boolean) => {
  const root = document.getElementById('root')!;
  const [scrollPos, setScrollPos] = useState(0);

  const scrollToPosition = useCallback(() => {
    if (root.scrollTop !== scrollPos) {
      root.scrollTo(0, scrollPos);
    }
  }, [scrollPos, root]);

  // add event listener to root when component mounts
  useEffect(() => {
    const handleScroll = throttle(() => {
      if (isVisible && root.scrollTop !== 0) {
        setScrollPos(root.scrollTop);
      }
    }, 200);

    root.addEventListener('scroll', handleScroll);
    return () => root.removeEventListener('scroll', handleScroll);
  }, [isVisible, root]);

  useEffect(
    () => scrollToPosition(),
    [shouldFetch], /* eslint-disable-line react-hooks/exhaustive-deps */
  );
};

export default useScroll;
