import React, { useState } from 'react';
import { MdFilterList } from 'react-icons/md';
import Filters from './Filters';
import { SearchQuery } from '../../types';
import styles from './MobileFilters.module.css';

interface Props extends SearchQuery {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const MobileFilters = (props: Props) => {
  const [openStatus, setOpenStatus] = useState(false);

  return (
    <div className="d-inline-block d-md-none mr-2">
      <button
        type="button"
        className={`btn btn-sm rounded-circle ${styles.btnFilters}`}
        onClick={() => setOpenStatus(true)}
      >
        <MdFilterList />
      </button>

      {openStatus && (
        <div className={`p-3 sidebar bg-light ${styles.filters}`}>
          <div className="text-right">
            <button
              type="button"
              className="close"
              aria-label="Close"
              onClick={() => setOpenStatus(false)}
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>

          <Filters {...props} onChange={props.onChange} />
        </div>
      )}
    </div>
  );
};

export default MobileFilters;
