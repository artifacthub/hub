import { useEffect } from 'react';

export default function useBodyScroll(blocked: boolean, el: string) {
  const className = `noScroll-${el}`;
  useEffect(() => {
    if (blocked) {
      document.body.classList.add(className);
    } else {
      document.body.classList.remove(className);
    }

    return () => {
      document.body.classList.remove(className);
    };
  }, [blocked, className]);
}
