import React, { useEffect, useRef } from 'react';

interface Props {
  onClick: () => void;
  isExpanded: boolean;
  children: JSX.Element;
  disabled: boolean;
  hasOnlyOneTarget: boolean;
}

const TargetImageBtn = (props: Props) => {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Scrolls content into view when a target is expanded
    if (props.isExpanded && ref && ref.current && !props.hasOnlyOneTarget) {
      ref.current.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'smooth' });
    }
  }, [props.hasOnlyOneTarget, props.isExpanded]);

  return (
    <button
      data-testid="btnExpand"
      ref={ref}
      className="btn btn-link text-reset pl-0 btn-block position-relative"
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.children}
    </button>
  );
};

export default TargetImageBtn;
