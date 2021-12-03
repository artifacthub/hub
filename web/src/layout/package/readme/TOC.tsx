import { useRef, useState } from 'react';
import { BsFlagFill } from 'react-icons/bs';
import { FaListUl } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';

import useOutsideClick from '../../../hooks/useOutsideClick';
import { TOCEntryItem } from '../../../types';
import cleanTOCEntry from '../../../utils/cleanTOCEntry';
import ExternalLink from '../../common/ExternalLink';
import styles from './TOC.module.css';
import TOCList from './TOCList';

interface Props {
  title: string;
  toc: TOCEntryItem[];
  supportLink?: string;
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
            className={`btn btn-sm me-2 btn-outline-dark ${styles.btn}`}
            onClick={() => setVisibleTOC(!visibleTOC)}
            aria-label="Table of contents"
            aria-expanded={visibleTOC}
            aria-pressed={visibleTOC}
            aria-owns="TOC-list"
            aria-controls="TOC-list"
          >
            <FaListUl className={`position-relative ${styles.icon}`} />
          </button>
        </div>
        <div className={`flex-grow-1 ${styles.minWidth}`}>
          <h1 className={`mb-0 lh-base ${styles.title}`}>
            <ReactMarkdown children={cleanTOCEntry(props.title)} linkTarget="_blank" skipHtml />
          </h1>
        </div>
        {props.supportLink && (
          <div className={`ms-2 ${styles.supportLinkWrapper}`}>
            <ExternalLink href={props.supportLink} className="me-0" label="Open support link">
              <small className="d-flex flex-row align-items-center text-nowrap text-primary">
                <BsFlagFill className="me-1" />
                Report issue
              </small>
            </ExternalLink>
          </div>
        )}
      </div>

      {visibleTOC && (
        <div
          ref={dropdownRef}
          id="TOC-list"
          className={`dropdown-menu dropdown-menu-left shadow-sm noFocus show p-0 ${styles.dropdown}`}
          tabIndex={0}
          role="listbox"
          aria-roledescription="Table of content links"
        >
          <div className={`overflow-auto py-3 visible-scroll ${styles.list}`}>
            <TOCList {...props} setVisibleTOC={setVisibleTOC} />
          </div>
        </div>
      )}
    </div>
  );
};

export default TOC;
