import isNull from 'lodash/isNull';
import { ChangeEvent, useEffect, useRef } from 'react';

import { SortOption } from '../../types';
import styles from './SortOptions.module.css';

interface Props {
  activeSort: SortOption;
  updateSort: (value: SortOption) => void;
  disabled: boolean;
}

const DEFAULT_SORT = SortOption.Relevance;
const SORT_OPTS = Object.values(SortOption);

const SortOptions = (props: Props) => {
  const selectEl = useRef<HTMLSelectElement>(null);

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    props.updateSort(event.target.value as SortOption);
    forceBlur();
  };

  const forceBlur = (): void => {
    if (!isNull(selectEl) && !isNull(selectEl.current)) {
      selectEl.current.blur();
    }
  };

  const getSortOptionKey = (value: string): string => {
    const index = Object.values(SortOption).indexOf(value as unknown as SortOption);
    const key = Object.keys(SortOption)[index];
    return key;
  };

  useEffect(() => {
    if (!SORT_OPTS.includes(props.activeSort)) {
      props.updateSort(DEFAULT_SORT);
    }
  }, [props]);

  return (
    <div className="d-flex flex-nowrap align-items-center">
      <label className="form-label d-none d-sm-inline mb-0">Sort:</label>
      <select
        ref={selectEl}
        className={`form-select form-select-sm ms-2 ${styles.select}`}
        aria-label="sort-options"
        value={props.activeSort}
        onChange={handleChange}
        disabled={props.disabled}
      >
        {SORT_OPTS.map((value: string) => (
          <option key={`sort_${value}`} value={value}>
            {getSortOptionKey(value)}
          </option>
        ))}
        ;
      </select>
    </div>
  );
};

export default SortOptions;
