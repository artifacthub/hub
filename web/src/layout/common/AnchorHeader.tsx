import isObject from 'lodash/isObject';
import isString from 'lodash/isString';
import isUndefined from 'lodash/isUndefined';
import { ElementType, MouseEvent as ReactMouseEvent } from 'react';
import { GoLink } from 'react-icons/go';
import { Link, useLocation } from 'react-router-dom';

import getAnchorValue from '../../utils/getAnchorValue';
import styles from './AnchorHeader.module.css';
interface Props {
  level: number;
  title?: string;
  children?: JSX.Element[];
  className?: string;
  anchorName?: string;
  scrollIntoView: (id?: string) => void;
}

const AnchorHeader: ElementType = (props: Props) => {
  const location = useLocation();
  let value = props.title;
  if (isUndefined(value) && props.children && props.children.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allContentValues = props.children.map((n: any) => {
      if (isString(n)) {
        return [n];
      } else if (isObject(n)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return String((n as any).props.children);
      } else {
        return '';
      }
    });
    value = allContentValues.join('');
  }

  if (isUndefined(value)) return null;

  const Tag = `h${props.level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  const anchor = props.anchorName || getAnchorValue(value);

  return (
    <span className={styles.header}>
      <Tag className={`position-relative anchorHeader ${styles.headingWrapper} ${props.className}`}>
        <div data-testid="anchor" className={`position-absolute ${styles.headerAnchor}`} id={anchor} />
        <Link
          to={{ pathname: location.pathname, hash: anchor }}
          onClick={(e: ReactMouseEvent<HTMLAnchorElement, MouseEvent>) => {
            e.preventDefault();
            e.stopPropagation();
            props.scrollIntoView(`#${anchor}`);
          }}
          role="button"
          className={`text-reset text-center d-none d-md-block lh-1 float-start ${styles.headingLink}`}
          aria-label={value}
        >
          <GoLink />
        </Link>

        {props.title || props.children}
      </Tag>
    </span>
  );
};

export default AnchorHeader;
