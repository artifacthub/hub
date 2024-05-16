import isUndefined from 'lodash/isUndefined';
import { MdOutlineCategory } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';

import { PackageCategory } from '../../types';
import { prepareQueryString } from '../../utils/prepareQueryString';
import styles from './PackageCategoryLabel.module.css';

interface Props {
  category?: PackageCategory;
  className?: string;
  btnClassName?: string;
  deprecated?: boolean | null;
}

const PackageCategoryLabel = (props: Props) => {
  const navigate = useNavigate();

  if (isUndefined(props.category)) return null;

  return (
    <div className="d-none d-md-inline-block">
      <button
        onClick={(e) => {
          e.preventDefault();
          navigate({
            pathname: '/packages/search',
            search: prepareQueryString({
              pageNumber: 1,
              filters: { category: [props.category!.toString()] },
              deprecated: props.deprecated,
            }),
          });
        }}
        aria-label={`Filter by ${PackageCategory[props.category]}`}
        aria-hidden="true"
        tabIndex={-1}
        className={`btn btn-link m-0 p-0 border-0 ${styles.btn} ${props.btnClassName}`}
      >
        <span className={`badge bg-light top-0 text-dark border border-1 ${styles.bg} ${styles.badge}`}>
          <div className="d-flex flex-row align-items-center">
            <MdOutlineCategory className="me-1" />
            <div>{PackageCategory[props.category]}</div>
          </div>
        </span>
      </button>
    </div>
  );
};

export default PackageCategoryLabel;
