import React from 'react';

import { TOCEntryItem } from '../../../types';
import getAnchorValue from '../../../utils/getAnchorValue';
import history from '../../../utils/history';
import removeEmojis from '../../../utils/removeEmojis';
import styles from './TOCEntry.module.css';

interface Props {
  entry: TOCEntryItem;
  level: number;
  setVisibleTOC: React.Dispatch<React.SetStateAction<boolean>>;
  scrollIntoView: (id?: string) => void;
}

const cleanTitle = (title: string): string => {
  // Remove backticks and asteriks
  return title !== '' ? removeEmojis(title.replace(/`/g, '').replace(/\*\*/g, '')) : title;
};

const TOCEntry = (props: Props) => {
  const link = getAnchorValue(props.entry.value);
  const title = cleanTitle(props.entry.value);

  return (
    <div className={`${styles.dropdownItem} dropdownItem`}>
      <a
        className={`btn btn-link d-inline-block w-100 text-decoration-none ml-0 text-muted text-left ${styles.btn} ${
          styles[`level${props.level}`]
        }`}
        href={`${history.location.pathname}#${link}`}
        onClick={(e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
          e.preventDefault();
          e.stopPropagation();
          props.setVisibleTOC(false);
          props.scrollIntoView(`#${link}`);
        }}
        role="option"
        aria-label={`Go to ${title}`}
        tabIndex={-1}
        aria-selected={false}
      >
        {title}
      </a>
    </div>
  );
};

export default TOCEntry;
