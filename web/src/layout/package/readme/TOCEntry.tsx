import React from 'react';

import { TOCEntryItem } from '../../../types';
import history from '../../../utils/history';
import styles from './TOCEntry.module.css';

interface Props {
  entry: TOCEntryItem;
  level: number;
  setVisibleTOC: React.Dispatch<React.SetStateAction<boolean>>;
  scrollIntoView: (id?: string) => void;
}

const TOCEntry = (props: Props) => {
  return (
    <div className={`${styles.dropdownItem} dropdownItem`}>
      <a
        className={`btn btn-link d-inline-block w-100 text-decoration-none ml-0 text-muted text-left ${styles.btn} ${
          styles[`level${props.level}`]
        }`}
        href={`${history.location.pathname}#${props.entry.link}`}
        onClick={(e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
          e.preventDefault();
          e.stopPropagation();
          props.setVisibleTOC(false);
          props.scrollIntoView(`#${props.entry.link}`);
        }}
      >
        {props.entry.title}
      </a>
    </div>
  );
};

export default TOCEntry;
