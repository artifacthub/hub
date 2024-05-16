import isNull from 'lodash/isNull';
import { useEffect, useRef } from 'react';
import { FaLink } from 'react-icons/fa';

import styles from './Btns.module.css';

interface Props {
  onClick: () => void;
  isActive: boolean;
  isExpanded: boolean;
  expandedTarget: null | string;
  children: JSX.Element;
  hasOnlyOneTarget: boolean;
}

const TargetImageBtn = (props: Props) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Scrolls content into view when a target is active
    if (ref && ref.current && !props.hasOnlyOneTarget) {
      if (props.isExpanded || (props.isActive && isNull(props.expandedTarget))) {
        ref.current.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'smooth' });
      }
    }
  }, [props.expandedTarget, props.hasOnlyOneTarget, props.isActive, props.isExpanded]);

  return (
    <div ref={ref} className={`position-relative ${styles.btnWrapper}`}>
      <button
        onClick={props.onClick}
        className={`btn btn-link text-reset position-absolute lh-1 text-center float-start bg-white ${styles.linkBtn} ${styles.inTarget}`}
      >
        <FaLink />
      </button>
      <div className="p-1 ps-0">{props.children}</div>
    </div>
  );
};

export default TargetImageBtn;
