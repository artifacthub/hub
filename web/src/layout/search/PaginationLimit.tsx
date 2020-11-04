import React, { useEffect } from 'react';

import { DEFAULT_SEARCH_LIMIT } from '../../utils/localStoragePreferences';
import styles from './PaginationLimit.module.css';

interface Props {
  limit: number;
  updateLimit: (value: number) => void;
  disabled: boolean;
}

const LIMIT_VALUES: number[] = [20, 40, 60];

const PaginationLimit = (props: Props) => {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    props.updateLimit(parseInt(event.target.value));
  };

  useEffect(() => {
    if (!LIMIT_VALUES.includes(props.limit)) {
      props.updateLimit(DEFAULT_SEARCH_LIMIT);
    }
  }, [props]);

  return (
    <div className="form-inline flex-nowrap align-items-center">
      <label className="mr-2 mb-0">Show:</label>
      <select
        className={`custom-select custom-select-sm ${styles.select}`}
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
