import { RefObject, useCallback, useEffect, useState } from 'react';

export default function useClickOutside(
  refs: RefObject<HTMLElement>[],
  enabled: boolean,
  onClickOutside: (e: MouseEvent) => void
): [boolean] {
  const [isActive, setActive] = useState(false);

  const isOutside = useCallback(
    (e: MouseEvent) => {
      const test = refs.map((ref) => {
        return ref.current !== null && !ref.current.contains(e.target as HTMLElement);
      });

      return test.every(Boolean);
    },
    [refs]
  );

  const onClick = useCallback(
    (e: MouseEvent) => {
      if (isOutside(e) && enabled) {
        setActive(true);
        onClickOutside(e);
      }
    },
    [isOutside, onClickOutside, enabled]
  );

  useEffect(() => {
    document.addEventListener('click', onClick);

    return () => {
      document.removeEventListener('click', onClick);
    };
  }, [refs, onClickOutside, onClick]);

  return [isActive];
}
