import React, { useCallback, useEffect } from 'react';

import { DEFAULT_SEARCH_LIMIT } from '../../utils/localStoragePreferences';
import styles from './PaginationLimit.module.css';

interface Props {
  limit: number;
  updateLimit: (value: number) => void;
  disabled: boolean;
}

const LIMIT_VALUES: number[] = [20, 40, 60];

const PaginationLimit = (props: Props) => {
  const { updateLimit, limit, disabled } = props;
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      updateLimit(parseInt(event.target.value));
    },
    [updateLimit]
  );

  useEffect(() => {
    if (!LIMIT_VALUES.includes(limit)) {
      updateLimit(DEFAULT_SEARCH_LIMIT);
    }
  }, [updateLimit, limit]);

  return (
    <div className="form-inline flex-nowrap align-items-center">
      <label className="mr-2 mb-0">Show:</label>
      <select
        className={`custom-select custom-select-sm ${styles.select}`}
        aria-label="pagination-limit"
        value={limit}
        onChange={handleChange}
        disabled={disabled}
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

export default React.memo(PaginationLimit);
