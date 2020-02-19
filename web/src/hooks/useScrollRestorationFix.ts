import { useEffect } from 'react';
import isMobileSafari from '../utils/isMobileSafari';

export default function useScrollRestorationFix() {
  useEffect(() => {
    if (
      'scrollRestoration' in window.history &&
       // Safari on iOS freezes for 2-6s after the user swipes to
       // navigate through history with scrollRestoration being 'manual'.
      !isMobileSafari()
    ) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);
}
