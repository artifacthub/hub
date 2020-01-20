import React from 'react';

export default function useClickOutside(
  refs: React.RefObject<HTMLElement>[],
  onClickOutside: (e: MouseEvent) => void
): [boolean] {
  const [isActive, setActive] = React.useState(false);

  const isOutside = React.useCallback(
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

  const mousedown = React.useCallback(
    (e: MouseEvent) => {
      if (isOutside(e)) {
        setActive(true);
        onClickOutside(e);
      }
    },
    [isOutside, onClickOutside]
  );

  React.useEffect(() => {
    document.addEventListener('mousedown', mousedown);

    return () => {
      document.removeEventListener('mousedown', mousedown);
    };
  }, [refs, onClickOutside, mousedown]);

  return [isActive];
}
