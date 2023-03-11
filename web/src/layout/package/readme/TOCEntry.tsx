import { Dispatch, MouseEvent as ReactMouseEvent, SetStateAction } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { TOCEntryItem } from '../../../types';
import cleanTOCEntry from '../../../utils/cleanTOCEntry';
import getAnchorValue from '../../../utils/getAnchorValue';
import styles from './TOCEntry.module.css';

interface Props {
  entry: TOCEntryItem;
  level: number;
  setVisibleTOC: Dispatch<SetStateAction<boolean>>;
  scrollIntoView: (id?: string) => void;
}

const TOCEntry = (props: Props) => {
  const location = useLocation();

  if (props.entry.value === '') return null;

  const link = getAnchorValue(props.entry.value);
  const title = cleanTOCEntry(props.entry.value);

  return (
    <div className={`${styles.dropdownItem} dropdownItem`}>
      <Link
        to={{ pathname: location.pathname, hash: link }}
        className={`btn btn-link d-inline-block w-100 text-decoration-none ms-0 text-muted text-start ${styles.btn} ${
          styles[`level${props.level}`]
        }`}
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
      </Link>
    </div>
  );
};

export default TOCEntry;
