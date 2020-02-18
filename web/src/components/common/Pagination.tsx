import React, { useState, useEffect } from 'react';
import classnames from 'classnames';
import { useLocation, Link } from 'react-router-dom';
import isNumber from 'lodash/isNumber';
import getPaginationOptions from '../../utils/getPaginationOptions';
import styles from './Pagination.module.css';

interface Props {
  limit: number;
  total: number;
  offset: number;
  active: number;
}

const Pagination = (props: Props) => {
  const location = useLocation();
  const [totalPages, setTotalPages] = useState(Math.ceil(props.total / props.limit));

  useEffect(() => {
    setTotalPages(Math.ceil(props.total / props.limit));
  }, [props]);

  if (totalPages <= 1) return null;

  const getLink = (pageNumber: number, content?: JSX.Element | string): JSX.Element => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('page', pageNumber.toString());
    return (
      <Link
        className="page-link"
        to={{
          pathname: location.pathname,
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
