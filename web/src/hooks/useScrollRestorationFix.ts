import { useEffect } from 'react';

const isMobileSafari = (): boolean => {
  return /iPad|iPhone|iPod/.test(window.navigator.platform) && /^((?!CriOS).)*Safari/.test(window.navigator.userAgent);
};

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
