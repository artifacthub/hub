import React from 'react';
import styles from './PaginationLimit.module.css';

interface Props {
  limit: number;
  setLimit: (value: number) => void;
}

const LIMIT_VALUES: number[] = [15, 25, 50];

const PaginationLimit = (props: Props) => {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    props.setLimit(parseInt(event.target.value));
  }

  return (
    <div className="form-inline flex-nowrap align-items-center">
      <label className="mr-2 mb-0">Show:</label>
      <select
        className={`custom-select custom-select-sm ${styles.select}`}
        value={props.limit}
        onChange={handleChange}
      >
        {LIMIT_VALUES.map((value: number) => (
          <option
            key={`opt_${value}`}
            value={value}
          >
            {value}
          </option>
        ))};
      </select>
    </div>
  );
}

export default PaginationLimit;
