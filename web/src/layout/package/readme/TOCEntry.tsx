import { Dispatch, MouseEvent as ReactMouseEvent, SetStateAction } from 'react';

import { TOCEntryItem } from '../../../types';
import cleanTOCEntry from '../../../utils/cleanTOCEntry';
import getAnchorValue from '../../../utils/getAnchorValue';
import history from '../../../utils/history';
import styles from './TOCEntry.module.css';

interface Props {
  entry: TOCEntryItem;
  level: number;
  setVisibleTOC: Dispatch<SetStateAction<boolean>>;
  scrollIntoView: (id?: string) => void;
}

const TOCEntry = (props: Props) => {
  if (props.entry.value === '') return null;

  const link = getAnchorValue(props.entry.value);
  const title = cleanTOCEntry(props.entry.value);

  return (
    <div className={`${styles.dropdownItem} dropdownItem`}>
      <a
        className={`btn btn-link d-inline-block w-100 text-decoration-none ml-0 text-muted text-left ${styles.btn} ${
          styles[`level${props.level}`]
        }`}
        href={`${history.location.pathname}#${link}`}
        onClick={(e: ReactMouseEvent<HTMLAnchorElement, MouseEvent>) => {
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
