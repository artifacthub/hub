import isNull from 'lodash/isNull';
import { Dispatch, useCallback, useEffect, useState } from 'react';

import detectActiveThemeMode from '../utils/detectActiveThemeMode';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function useSystemThemeMode(enabled: boolean, dispatch: Dispatch<any>) {
  const [mediaQuery, setMediaQuery] = useState<MediaQueryList | null>(null);
  const themeDarkModeFn = useCallback(() => {
    dispatch({ type: 'updateEffectiveTheme', theme: detectActiveThemeMode() });
  }, [dispatch]);

  useEffect(() => {
    const removeListener = () => {
      if (!isNull(mediaQuery)) {
        try {
          mediaQuery.removeEventListener('change', themeDarkModeFn);
        } catch {
          try {
            mediaQuery.removeListener(themeDarkModeFn);
          } catch {
            // Old browser
          }
        }
      }
    };

    if (enabled) {
      const currentMode = window.matchMedia(`(prefers-color-scheme: dark)`);
      setMediaQuery(currentMode);
      try {
        currentMode.addEventListener('change', themeDarkModeFn);
      } catch {
        try {
          currentMode.addListener(themeDarkModeFn);
        } catch {
          // Old browser
        }
      }
    } else {
      removeListener();
    }
    return () => {
      if (!isNull(mediaQuery)) {
        removeListener();
      }
    };
  }, [enabled]);
}
