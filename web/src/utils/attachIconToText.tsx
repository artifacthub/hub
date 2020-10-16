import classnames from 'classnames';
import { isNull } from 'lodash';
import React, { useEffect, useRef, useState } from 'react';

interface Props {
  lineHeight?: number;
  className?: string;
  text: string;
  icon: JSX.Element;
  isVisible: boolean;
}

const DEFAULT_LINE_HEIGHT = 21;

export default (props: Props): JSX.Element => {
  const lineHeight: number = props.lineHeight || DEFAULT_LINE_HEIGHT;
  const ref = useRef<HTMLDivElement | null>(null);
  const icon = useRef<HTMLDivElement | null>(null);
  const lastCharacter = useRef<HTMLDivElement | null>(null);
  const [reducedFontSize, setreducedFontSize] = useState<boolean>(false);

  useEffect(() => {
    const calculateFontSize = () => {
      const { offsetTop } = ref.current!;
      const lineOfLastCharacter = Math.floor((lastCharacter.current!.offsetTop - offsetTop) / lineHeight);
      const lineOfIcon = Math.floor((icon.current!.offsetTop - offsetTop) / lineHeight);
      if (lineOfIcon !== lineOfLastCharacter) {
        setreducedFontSize(true);
      }
    };

    if (!isNull(ref.current) && props.isVisible) {
      calculateFontSize();
    }
  }, [props.isVisible, lineHeight]);

  return (
    <div
      ref={ref}
      className={props.className}
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
      <div ref={icon} className={classnames('d-inline-block', { 'position-absolute': reducedFontSize })}>
        {props.icon}
      </div>
    </div>
  );
};
