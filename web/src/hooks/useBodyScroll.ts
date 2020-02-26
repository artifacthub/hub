import { useEffect } from 'react';

export default function useBodyScroll(blocked: boolean) {
  useEffect(() => {
    if (blocked) {
      document.body.classList.add('noScroll');
    } else {
      document.body.classList.remove('noScroll');
    }

    return () => {
      document.body.classList.remove('noScroll');
    };
  }, [blocked]);
}
