import { useCallback, useEffect, useState, RefObject } from 'react';

export default function useClickOutside(
  refs: RefObject<HTMLElement>[],
  onClickOutside: (e: MouseEvent) => void
): [boolean] {
  const [isActive, setActive] = useState(false);

  const isOutside = useCallback(
    (e: MouseEvent) => {
      const test = refs.map(ref => {
        return (
          ref.current !== null && !ref.current.contains(e.target as HTMLElement)
        );
      });

      return test.every(Boolean);
    },
    [refs]
  );

  const mousedown = useCallback(
    (e: MouseEvent) => {
      if (isOutside(e)) {
        setActive(true);
        onClickOutside(e);
      }
    },
    [isOutside, onClickOutside]
  );

  useEffect(() => {
    document.addEventListener('mousedown', mousedown);

    return () => {
      document.removeEventListener('mousedown', mousedown);
    };
  }, [refs, onClickOutside, mousedown]);

  return [isActive];
}
