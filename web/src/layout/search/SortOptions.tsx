import { isNull } from 'lodash';
import { ChangeEvent, useEffect, useRef } from 'react';

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
  const selectEl = useRef<HTMLSelectElement>(null);

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    props.updateSort(event.target.value);
    forceBlur();
  };

  const forceBlur = (): void => {
    if (!isNull(selectEl) && !isNull(selectEl.current)) {
      selectEl.current.blur();
    }
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
        ref={selectEl}
        className={`custom-select custom-select-sm ml-2 ${styles.select}`}
        aria-label="sort-options"
        value={props.activeSort}
        onChange={handleChange}
        disabled={props.disabled}
      >
        {SORT_OPTS.map((value: string) => (
          <option key={`sort_${value}`} value={value}>
            {capitalizeFirstLetter(value)}
          </option>
        ))}
        ;
      </select>
    </div>
  );
};

export default SortOptions;
