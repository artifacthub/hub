import React, { useRef, useState } from 'react';
import { FaListUl } from 'react-icons/fa';

import useOutsideClick from '../../../hooks/useOutsideClick';
import { TOCEntryItem } from '../../../types';
import styles from './TOC.module.css';
import TOCList from './TOCList';

interface Props {
  title: string;
  toc: TOCEntryItem[];
  scrollIntoView: (id?: string) => void;
}

const TOC = (props: Props) => {
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const [visibleTOC, setVisibleTOC] = useState<boolean>(false);

  useOutsideClick([dropdownRef, buttonRef], visibleTOC, () => {
    setVisibleTOC(false);
  });

  if (props.toc.length === 0) return null;

  return (
    <div className={`position-relative ${styles.toc}`}>
      <div className={`d-flex flex-row align-items-top ${styles.titleWrapper}`}>
        <div className="mt-0 mt-sm-2">
          <button
            ref={buttonRef}
            data-testid="btnTOC"
            className={`btn btn-sm mr-2 btn-outline-dark ${styles.btn}`}
            onClick={() => setVisibleTOC(!visibleTOC)}
          >
            <FaListUl className={`position-relative ${styles.icon}`} />
          </button>
        </div>
        <div className="flex-grow-1">
          <h1 className={`mb-0 ${styles.title}`}>{props.title}</h1>
        </div>
      </div>

      {visibleTOC && (
        <div
          data-testid="dropdownTOC"
          ref={dropdownRef}
          className={`dropdown-menu dropdown-menu-left shadow-sm show p-0 ${styles.dropdown}`}
        >
          <div className={`overflow-auto py-3 ${styles.list}`}>
            <TOCList {...props} setVisibleTOC={setVisibleTOC} />
          </div>
        </div>
      )}
    </div>
  );
};

export default TOC;
