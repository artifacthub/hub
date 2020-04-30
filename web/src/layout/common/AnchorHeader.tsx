import isUndefined from 'lodash/isUndefined';
import React from 'react';
import { GoLink } from 'react-icons/go';

import history from '../../utils/history';
import styles from './AnchorHeader.module.css';

interface Props {
  level: number;
  title?: string;
  children?: JSX.Element[];
  scrollIntoView: (id?: string) => void;
}

const AnchorHeader: React.ElementType = (props: Props) => {
  const value = !isUndefined(props.title) ? props.title : props.children![0].props.value;

  const anchor = value
    .trim()
    .toLowerCase()
    .replace(/[^\w\- ]+/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+$/, '');

  const Tag = `h${props.level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

  return (
    <span className={styles.header}>
      <Tag id={anchor} className={`position-relative ${styles.headingWrapper}`}>
        <a
          data-testid="anchorHeaderLink"
          href={`${history.location.pathname}#${anchor}`}
          onClick={(e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
            e.preventDefault();
            e.stopPropagation();
            props.scrollIntoView(`#${anchor}`);
          }}
          className={`text-reset text-center ${styles.headingLink}`}
        >
          <GoLink />
        </a>
        {props.title || props.children}
      </Tag>
    </span>
  );
};

export default AnchorHeader;
