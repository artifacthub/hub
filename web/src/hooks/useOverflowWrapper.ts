import throttle from 'lodash/throttle';
import { MutableRefObject, useEffect, useLayoutEffect, useState } from 'react';

const useOverflowWrapper = (
  wrapperRef: MutableRefObject<HTMLDivElement | null>,
  maxHeight: number,
  itemsLength: number
) => {
  const getHeight = (): number => {
    if (wrapperRef && wrapperRef.current) {
      return wrapperRef.current.offsetHeight;
    } else {
      return 0;
    }
  };

  const checkDimensions = () => {
    const height = getHeight();
    return height > maxHeight;
  };

  const [overflowContainer, setOverflowContainer] = useState<boolean>(() => checkDimensions());

  const handleOverflow = () => {
    setOverflowContainer(checkDimensions());
  };

  useEffect(() => {
    window.addEventListener('resize', throttle(handleOverflow, 200));
    return () => window.removeEventListener('resize', handleOverflow);
  }, []);

  useLayoutEffect(() => {
    handleOverflow();
  }, []);

  useEffect(() => {
    handleOverflow();
  }, [itemsLength]);

  return overflowContainer;
};

export default useOverflowWrapper;
