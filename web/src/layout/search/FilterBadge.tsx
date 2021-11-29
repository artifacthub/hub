import { IoMdCloseCircle } from 'react-icons/io';

import styles from './FilterBadge.module.css';

interface Props {
  type?: string;
  name: string;
  onClick: () => void;
}

const FilterBadge = (props: Props) => {
  return (
    <div className={`badge badge-light badge-pill mr-2 mb-2 p-0 pl-2 ${styles.badgeFilter}`}>
      <div className="d-flex flex-row align-items-center">
        <div className="position-relative">
          {props.type && <small className="mr-1 text-uppercase">{props.type}:</small>}
          {props.name}
        </div>
        <button
          className={`btn btn-link btn-sm py-0 text-center ${styles.btn}`}
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
