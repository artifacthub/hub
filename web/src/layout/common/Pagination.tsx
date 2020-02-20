import React, { useState, useEffect } from 'react';
import classnames from 'classnames';
import { Link } from 'react-router-dom';
import isNumber from 'lodash/isNumber';
import styles from './Pagination.module.css';

interface Props {
  limit: number;
  total: number;
  offset: number;
  active: number;
  search: string;
  pathname: string;
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
}

const Pagination = (props: Props) => {
  const [totalPages, setTotalPages] = useState(Math.ceil(props.total / props.limit));

  useEffect(() => {
    setTotalPages(Math.ceil(props.total / props.limit));
  }, [props]);

  if (totalPages <= 1) return null;

  const getLink = (pageNumber: number, content?: JSX.Element | string): JSX.Element => {
    const searchParams = new URLSearchParams(props.search);
    searchParams.set('page', pageNumber.toString());
    return (
      <Link
        className="page-link"
        to={{
          pathname: props.pathname,
          search: searchParams.toString(),
        }}
      >
        {content || pageNumber}
      </Link>
    );
  };

  const visiblePages = getPaginationOptions(props.active, totalPages);

  return (
    <nav>
      <ul className="pagination justify-content-center mt-5 mb-5">
        <li className={classnames(
          'page-item',
          {'disabled': props.active === 1},
        )}>
          {getLink(props.active - 1, (
            <>
              <span className="d-none d-sm-block">Previous</span>
              <span className="d-block d-sm-none">Prev</span>
            </>
          ))}
        </li>

        {visiblePages.map((value: number | string, index: number) => {
          if (isNumber(value)) {
            return (
              <li key={`pag_${index}`} className={classnames(
                'page-item',
                {[`active ${styles.active}`]: props.active === value},
              )}>
                {getLink(value)}
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

        <li className={classnames(
          'page-item',
          {'disabled': props.active === totalPages},
        )}>
          {getLink(props.active + 1, 'Next')}
        </li>
      </ul>
    </nav>
  );
}

export default Pagination;
