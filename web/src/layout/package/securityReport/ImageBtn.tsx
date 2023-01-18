import { useEffect, useRef } from 'react';
import { FaLink } from 'react-icons/fa';
import { FiPackage } from 'react-icons/fi';

import styles from './Btns.module.css';

interface Props {
  image: string;
  onClick: () => void;
  isActive: boolean;
}

const ImageBtn = (props: Props) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Scrolls content into view when a image is active
    if (props.isActive && ref && ref.current) {
      ref.current.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'smooth' });
    }
  }, [props.isActive]);

  return (
    <div ref={ref} className={`d-flex flex-row align-items-center fw-bold mb-2 ${styles.btnWrapper}`}>
      <button
        onClick={props.onClick}
        className={`btn btn-link text-reset position-absolute lh-1 text-center float-start bg-white ${styles.linkBtn}`}
      >
        <FaLink />
      </button>

      <FiPackage />
      <div className="ps-2 text-truncate">
        <span className={`text-uppercase text-muted me-2 ${styles.tableTitle}`}>Image:</span>
        {props.image}
      </div>
    </div>
  );
};

export default ImageBtn;
