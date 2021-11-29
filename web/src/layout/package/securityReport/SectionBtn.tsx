import { useEffect, useRef } from 'react';
import { FaLink } from 'react-icons/fa';

import styles from './Btns.module.css';

interface Props {
  title: string;
  name: string;
  className?: string;
  onClick: () => void;
  visibleSection?: string;
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
    <div ref={ref} className={`position-relative ${styles.btnWrapper} `}>
      <button
        onClick={props.onClick}
        className={`btn btn-link text-reset position-absolute ${styles.linkBtn} ${styles.inSection}`}
      >
        <FaLink />
      </button>

      <div className={`h5 text-dark text-uppercase font-weight-bold ${props.className}`}>{props.title}</div>
    </div>
  );
};

export default SectionBtn;
