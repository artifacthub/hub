import classnames from 'classnames';
import isNumber from 'lodash/isNumber';
import isString from 'lodash/isString';
import { useEffect, useState } from 'react';
import { FaCaretLeft, FaCaretRight } from 'react-icons/fa';

import styles from './Pagination.module.css';

interface Props {
  limit: number;
  total: number;
  offset: number;
  active: number;
  className?: string;
  onChange: (pageNumber: number) => void;
}

interface ButtonProps {
  pageNumber: number;
  disabled: boolean;
  content?: JSX.Element | string;
  active: number;
  onChange: (pageNumber: number) => void;
}

const getPaginationOptions = (currentPage: number, pageCount: number): (string | number)[] => {
  const delta = 1;
  const range = [];
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

const PaginationBtn = (btnProps: ButtonProps) => (
  <button
    className={classnames('page-link', {
      'text-primary': !btnProps.disabled && btnProps.active !== btnProps.pageNumber,
    })}
    onClick={() => {
      if (btnProps.active !== btnProps.pageNumber) {
        btnProps.onChange(btnProps.pageNumber);
      }
    }}
    aria-label={`Open ${isString(btnProps.content) ? btnProps.content : `page ${btnProps.pageNumber}`}`}
    disabled={btnProps.disabled}
    tabIndex={btnProps.disabled ? -1 : 0}
  >
    {btnProps.content || btnProps.pageNumber}
  </button>
);

const Pagination = (props: Props) => {
  const [totalPages, setTotalPages] = useState(Math.ceil(props.total / props.limit));
  const [active, setActive] = useState<number>(props.active);

  useEffect(() => {
    setTotalPages(Math.ceil(props.total / props.limit));
  }, [props.total, props.limit]);

  useEffect(() => {
    setActive(props.active);
  }, [props.active]);

  if (totalPages <= 1) return null;

  const visiblePages = getPaginationOptions(active, totalPages);

  return (
    <nav role="navigation" aria-label="pagination">
      <ul className={`pagination justify-content-center ${styles.pagination} ${props.className}`}>
        <li className={classnames('page-item', { disabled: active === 1 })}>
          <PaginationBtn
            pageNumber={active - 1}
            disabled={active === 1}
            content={
              <>
                <span className="d-none d-sm-block">Previous</span>
                <span className="d-block d-sm-none">
                  <FaCaretLeft />
                </span>
              </>
            }
            active={active}
            onChange={props.onChange}
          />
        </li>

        {visiblePages.map((value: number | string, index: number) => {
          if (isNumber(value)) {
            return (
              <li
                key={`pag_${index}`}
                className={classnames('page-item', { [`active text-light ${styles.active}`]: active === value })}
              >
                <PaginationBtn pageNumber={value} disabled={false} active={active} onChange={props.onChange} />
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

        <li className={classnames('page-item', { disabled: active === totalPages })}>
          <PaginationBtn
            pageNumber={active + 1}
            disabled={active === totalPages}
            content={
              <>
                <span className="d-none d-sm-block">Next</span>
                <span className="d-block d-sm-none">
                  <FaCaretRight />
                </span>
              </>
            }
            active={active}
            onChange={props.onChange}
          />
        </li>
      </ul>
    </nav>
  );
};

export default Pagination;
