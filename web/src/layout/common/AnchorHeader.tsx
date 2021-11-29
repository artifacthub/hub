import { isObject, isString } from 'lodash';
import isUndefined from 'lodash/isUndefined';
import { ElementType, MouseEvent as ReactMouseEvent } from 'react';
import { GoLink } from 'react-icons/go';

import getAnchorValue from '../../utils/getAnchorValue';
import history from '../../utils/history';
import styles from './AnchorHeader.module.css';
interface Props {
  level: number;
  title?: string;
  children?: JSX.Element[];
  className?: string;
  scrollIntoView: (id?: string) => void;
}

const AnchorHeader: ElementType = (props: Props) => {
  let value = props.title;
  if (isUndefined(value) && props.children && props.children.length > 0) {
    const allContentValues = props.children.map((n: any) => {
      if (isString(n)) {
        return [n];
      } else if (isObject(n)) {
        return String((n as any).props.children);
      } else {
        return '';
      }
    });
    value = allContentValues.join('');
  }

  if (isUndefined(value)) return null;

  const Tag = `h${props.level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  const anchor = getAnchorValue(value);

  return (
    <span className={styles.header}>
      <Tag className={`position-relative anchorHeader ${styles.headingWrapper} ${props.className}`}>
        <div data-testid="anchor" className={`position-absolute ${styles.headerAnchor}`} id={anchor} />
        <a
          href={`${history.location.pathname}#${anchor}`}
          onClick={(e: ReactMouseEvent<HTMLAnchorElement, MouseEvent>) => {
            e.preventDefault();
            e.stopPropagation();
            props.scrollIntoView(`#${anchor}`);
          }}
          role="button"
          className={`text-reset text-center d-none d-md-block ${styles.headingLink}`}
          aria-label={value}
        >
          <GoLink />
        </a>
        {props.title || props.children}
      </Tag>
    </span>
  );
};

export default AnchorHeader;
