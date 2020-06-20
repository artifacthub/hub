import classnames from 'classnames';
import isNumber from 'lodash/isNumber';
import React, { useEffect, useState } from 'react';
import { FaCaretLeft, FaCaretRight } from 'react-icons/fa';

import styles from './Pagination.module.css';

interface Props {
  limit: number;
  total: number;
  offset: number;
  active: number;
  onChange: (pageNumber: number) => void;
}

const getPaginationOptions = (currentPage: number, pageCount: number): (string | number)[] => {
  const delta = 1;
  let range = [];
  for (let i = Math.max(2, currentPage - delta); i <= Math.min(pageCount - 1, currentPage + delta); i++) {
    range.push(i);
  }
  if (currentPage - delta > 2) {
    range.unshift('...');
  }
  if (currentPage + delta < pageCount - 1) {
    range.push('...');
  }
  range.unshift(1);
  range.push(pageCount);
  return range;
};

const Pagination = (props: Props) => {
  const [totalPages, setTotalPages] = useState(Math.ceil(props.total / props.limit));

  useEffect(() => {
    setTotalPages(Math.ceil(props.total / props.limit));
  }, [props]);

  if (totalPages <= 1) return null;

  const getButton = (pageNumber: number, content?: JSX.Element | string): JSX.Element => (
    <button
      className="page-link"
      onClick={() => {
        if (props.active !== pageNumber) {
          props.onChange(pageNumber);
        }
      }}
    >
      {content || pageNumber}
    </button>
  );

  const visiblePages = getPaginationOptions(props.active, totalPages);

  return (
    <nav role="navigation" aria-label="pagination">
      <ul className={`pagination justify-content-center mt-5 mb-5 ${styles.pagination}`}>
        <li className={classnames('page-item', { disabled: props.active === 1 })}>
          {getButton(
            props.active - 1,
            <>
              <span className="d-none d-sm-block">Previous</span>
              <span className="d-block d-sm-none">
                <FaCaretLeft />
              </span>
            </>
          )}
        </li>

        {visiblePages.map((value: number | string, index: number) => {
          if (isNumber(value)) {
            return (
              <li
                key={`pag_${index}`}
                className={classnames('page-item', { [`active ${styles.active}`]: props.active === value })}
              >
                {getButton(value)}
              </li>
            );
          } else {
            return (
              <li className="page-item disabled" key={`pag_${index}`}>
                <span className="page-link">{value}</span>
              </li>
            );
          }
        })}

        <li className={classnames('page-item', { disabled: props.active === totalPages })}>
          {getButton(
            props.active + 1,
            <>
              <span className="d-none d-sm-block">Next</span>
              <span className="d-block d-sm-none">
                <FaCaretRight />
              </span>
            </>
          )}
        </li>
      </ul>
    </nav>
  );
};

export default Pagination;
