import { useEffect, useRef, useState } from 'react';

interface Props {
  lineHeight?: number;
  className?: string;
  text: string;
  icon: JSX.Element;
  isVisible: boolean;
}

const DEFAULT_LINE_HEIGHT = 21;

const AttachedIconToText = (props: Props) => {
  const lineHeight: number = props.lineHeight || DEFAULT_LINE_HEIGHT;
  const ref = useRef<HTMLDivElement | null>(null);
  const icon = useRef<HTMLDivElement | null>(null);
  const lastCharacter = useRef<HTMLDivElement | null>(null);
  const [reducedFontSize, setReducedFontSize] = useState<boolean>(false);

  useEffect(() => {
    const calculateFontSize = () => {
      const offsetTop = ref.current ? ref.current.offsetTop : 0;
      const lineOfLastCharacter = lastCharacter.current
        ? Math.floor((lastCharacter.current.offsetTop - offsetTop) / lineHeight)
        : 0;
      const lineOfIcon = icon.current ? Math.floor((icon.current.offsetTop - offsetTop) / lineHeight) : 0;
      if (lineOfIcon !== lineOfLastCharacter) {
        setReducedFontSize(true);
      }
    };

    if (props.isVisible) {
      calculateFontSize();
    }
  }, [props.isVisible, lineHeight]);

  return (
    <div
      data-testid="attachedIconToTextWrapper"
      ref={ref}
      className={`d-flex flex-row flex-wrap ${props.className}`}
      style={{
        fontSize: reducedFontSize ? '90%' : 'inherit',
        lineHeight: `${lineHeight}px`,
      }}
    >
      {props.text.split('').map((ch: string, index: number) => {
        if (index + 1 === props.text.length) {
          return (
            <div className="d-inline" key={`ch_${index}`}>
              {ch}
            </div>
          );
        } else {
          return (
            <div className="d-inline" ref={lastCharacter} key={`ch_${index}`}>
              {ch}
            </div>
          );
        }
      })}
      <div ref={icon} className="d-inline-block">
        {props.icon}
      </div>
    </div>
  );
};

export default AttachedIconToText;
