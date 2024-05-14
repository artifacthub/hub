import isUndefined from 'lodash/isUndefined';
import { useEffect, useRef } from 'react';
import { FaLink } from 'react-icons/fa';

import styles from './Btns.module.css';

interface Props {
  title: string;
  name: string;
  className?: string;
  rightElement?: JSX.Element;
  onClick: () => void;
  visibleSection?: string | null;
}

const SectionBtn = (props: Props) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Scrolls content into view when a image is active
    if (props.visibleSection === props.name && ref && ref.current) {
      ref.current.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'smooth' });
    }
  }, [props.name, props.visibleSection]);

  return (
    <div
      ref={ref}
      className={`position-relative d-flex flex-row justify-content-between ${styles.btnWrapper} ${props.className}`}
    >
      <div>
        <button
          onClick={props.onClick}
          className={`btn btn-link text-reset position-absolute lh-1 text-center float-start bg-white ${styles.linkBtn} ${styles.inSection}`}
          aria-label={`Go to ${props.title} section`}
        >
          <FaLink />
        </button>

        <div className="h5 text-dark text-uppercase fw-bold">{props.title}</div>
      </div>

      {!isUndefined(props.rightElement) && <>{props.rightElement}</>}
    </div>
  );
};

export default SectionBtn;
