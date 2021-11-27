import { throttle } from 'lodash';
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
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  useLayoutEffect(() => {
    handleOverflow();
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    handleOverflow();
  }, [itemsLength]); /* eslint-disable-line react-hooks/exhaustive-deps */

  return overflowContainer;
};

export default useOverflowWrapper;
