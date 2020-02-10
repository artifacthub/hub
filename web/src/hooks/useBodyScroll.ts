import { useEffect } from 'react';

export default function useBodyScroll(blocked: boolean) {
  useEffect(() => {
    if (blocked) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [blocked]);
}
