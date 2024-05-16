import isNull from 'lodash/isNull';
import { ChangeEvent, useEffect, useRef } from 'react';

import { DEFAULT_SEARCH_LIMIT } from '../../utils/localStoragePreferences';
import styles from './PaginationLimit.module.css';

interface Props {
  limit: number;
  updateLimit: (value: number) => void;
  disabled: boolean;
}

const LIMIT_VALUES: number[] = [20, 40, 60];

const PaginationLimit = (props: Props) => {
  const selectEl = useRef<HTMLSelectElement>(null);

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    props.updateLimit(parseInt(event.target.value));
    forceBlur();
  };

  const forceBlur = (): void => {
    if (!isNull(selectEl) && !isNull(selectEl.current)) {
      selectEl.current.blur();
    }
  };

  useEffect(() => {
    if (!LIMIT_VALUES.includes(props.limit)) {
      props.updateLimit(DEFAULT_SEARCH_LIMIT);
    }
  }, [props]);

  return (
    <div className="d-flex flex-nowrap align-items-center ms-3">
      <label className="form-label me-2 mb-0">Show:</label>
      <select
        ref={selectEl}
        className={`form-select form-select-sm pe-2 ${styles.select}`}
        aria-label="pagination-limit"
        value={props.limit}
        onChange={handleChange}
        disabled={props.disabled}
      >
        {LIMIT_VALUES.map((value: number) => (
          <option key={`opt_${value}`} value={value}>
            {value}
          </option>
        ))}
        ;
      </select>
    </div>
  );
};

export default PaginationLimit;
