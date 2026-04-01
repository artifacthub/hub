import isObject from 'lodash/isObject';
import isString from 'lodash/isString';
import isUndefined from 'lodash/isUndefined';
import type { ReactNode } from 'react';
import { ElementType, isValidElement, MouseEvent as ReactMouseEvent } from 'react';
import { GoLink } from 'react-icons/go';
import { Link, useLocation } from 'react-router-dom';

import getAnchorValue from '../../utils/getAnchorValue';
import styles from './AnchorHeader.module.css';
interface Props {
  level: number;
  title?: string;
  children?: ReactNode;
  className?: string;
  anchorName?: string;
  scrollIntoView: (id?: string) => void;
}

const AnchorHeader: ElementType = (props: Props) => {
  const location = useLocation();
  let value = props.title;

  const collectText = (node?: ReactNode): string => {
    if (isUndefined(node) || node === null) return '';
    if (isString(node)) return node;
    if (typeof node === 'number') return node.toString();
    if (Array.isArray(node)) return node.map((child) => collectText(child)).join('');
    if (isValidElement(node)) {
      return collectText((node.props as { children?: ReactNode }).children);
    }
    if (isObject(node) && 'props' in (node as object)) {
      // Fallback for unexpected structures
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return collectText((node as any).props?.children);
    }
    return '';
  };

  if (isUndefined(value) && props.children) {
    value = collectText(props.children);
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
