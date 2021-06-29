import React, { useEffect } from 'react';

import capitalizeFirstLetter from '../../utils/capitalizeFirstLetter';
import styles from './SortOptions.module.css';

interface Props {
  activeSort: string;
  updateSort: (value: string) => void;
  disabled: boolean;
}

const DEFAULT_SORT = 'relevance';
const SORT_OPTS = [DEFAULT_SORT, 'stars'];

const SortOptions = (props: Props) => {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    props.updateSort(event.target.value);
  };

  useEffect(() => {
    if (!SORT_OPTS.includes(props.activeSort)) {
      props.updateSort(DEFAULT_SORT);
    }
  }, [props]);

  return (
    <div className="form-inline flex-nowrap align-items-center">
      <label className="d-none d-sm-inline mb-0">Sort:</label>
      <select
        className={`custom-select custom-select-sm ml-2 ${styles.select}`}
        aria-label="sort-options"
        value={props.activeSort}
        onChange={handleChange}
        disabled={props.disabled}
      >
        {SORT_OPTS.map((value: string) => (
          <option key={`sort_${value}`} value={value} className={styles.option}>
            {capitalizeFirstLetter(value)}
          </option>
        ))}
        ;
      </select>
    </div>
  );
};

export default SortOptions;
