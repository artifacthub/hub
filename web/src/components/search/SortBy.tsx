import React, { useState, useRef } from 'react';
import classnames from 'classnames';
import useOutsideClick from '../../hooks/useOutsideClick';
import styles from './SortBy.module.css';

interface Props {
  value: string;
  setSortBy: React.Dispatch<React.SetStateAction<"asc" | "desc">>;
}

interface SortValue {
  key: 'asc' | 'desc';
  value: string;
}

const sortedValues: SortValue[] = [
  {
    key: 'asc',
    value: 'A-Z',
  },
  {
    key: 'desc',
    value: 'Z-A',
  },
];

const SortBy = (props: Props) => {
  const [openStatus, setOpenStatus] = useState(false);
  const ref = useRef(null);
  useOutsideClick([ref], () => setOpenStatus(false));

  return (
    <div className="dropdown">
      <button className={`btn btn-sm text-uppercase dropdown-toggle ${styles.button}`} type="button" onClick={() => setOpenStatus(!openStatus)}>
        Sort by
      </button>

      <div ref={ref} className={classnames(
        'dropdown-menu dropdown-menu-right',
        {'show': openStatus},
      )}>
        {sortedValues.map((sort: SortValue) => {
          return (
            <button className={classnames(
                'dropdown-item',
                {active: props.value === sort.key}
              )}
              key={`${sort.value}_${sort.key}`}
              type="button"
              onClick={() => {
                setOpenStatus(false);
                props.setSortBy(sort.key);
              }}
            >
              {sort.value}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SortBy;
