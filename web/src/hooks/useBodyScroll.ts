import { useEffect } from 'react';

export default function useBodyScroll(blocked: boolean, elType: string, breakPoint?: string) {
  const className = `noScroll-${elType}`;
  const bkClassName = breakPoint ? `noScroll-${breakPoint}` : '';

  useEffect(() => {
    if (blocked) {
      document.body.classList.add(className);
      if (breakPoint) {
        document.body.classList.add(bkClassName);
      }
    } else {
      document.body.classList.remove(className);
      if (breakPoint) {
        document.body.classList.remove(bkClassName);
      }
    }

    return () => {
      document.body.classList.remove(className);
      if (breakPoint) {
        document.body.classList.remove(bkClassName);
      }
    };
  }, [bkClassName, blocked, breakPoint, className]);
}
