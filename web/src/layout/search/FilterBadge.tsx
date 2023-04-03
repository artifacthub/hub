import { IoMdCloseCircle } from 'react-icons/io';

import styles from './FilterBadge.module.css';

interface Props {
  type?: string;
  name: string;
  onClick: () => void;
}

const FilterBadge = (props: Props) => {
  return (
    <div className={`badge bg-light me-2 mb-2 p-0 ps-1 border border-1 ${styles.badgeFilter}`}>
      <div className="d-flex flex-row align-items-center">
        <div className="position-relative">
          {props.type && <small className="fw-normal me-1 text-uppercase">{props.type}:</small>}
          {props.name}
        </div>
        <button
          className={`btn btn-link btn-sm py-0 pe-1 text-center ${styles.btn}`}
          onClick={props.onClick}
          aria-label={`Remove filter: ${props.type ? `${props.type} -` : ''} ${props.name}`}
        >
          <IoMdCloseCircle className={`position-relative ${styles.btnIcon}`} />
        </button>
      </div>
    </div>
  );
};

export default FilterBadge;
