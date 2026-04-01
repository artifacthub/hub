import {
  cloneElement,
  ComponentPropsWithoutRef,
  ElementType,
  isValidElement,
  ReactElement,
  useRef,
  useState,
} from 'react';
import { BsFlagFill } from 'react-icons/bs';
import { FaListUl } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { github } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import useOutsideClick from '../../../hooks/useOutsideClick';
import { TOCEntryItem } from '../../../types';
import cleanTOCEntry from '../../../utils/cleanTOCEntry';
import ExternalLink from '../../common/ExternalLink';
import styles from './TOC.module.css';
import TOCList from './TOCList';

interface MarkdownLinkProps extends ComponentPropsWithoutRef<'a'> {
  node?: unknown;
}

const MarkdownLink: ElementType = ({ children, target, ...rest }: MarkdownLinkProps) => (
  <a {...rest} target={target || '_blank'} rel="noopener noreferrer">
    {children}
  </a>
);

interface CodeProps extends ComponentPropsWithoutRef<'code'> {
  isInPre?: boolean;
}

const Code: ElementType = ({ className, children, isInPre }: CodeProps) => {
  if (!isInPre) {
    return className ? <code className={className}>{children}</code> : <code>{children}</code>;
  }

  const match = /language-(\w+)/.exec(className || '');

  return (
    <SyntaxHighlighter language={match ? match[1] : 'bash'} style={github}>
      {String(children).replace(/\n$/, '')}
    </SyntaxHighlighter>
  );
};

const mapPreChild = (child: ComponentPropsWithoutRef<'pre'>['children']) => {
  if (isValidElement<CodeProps>(child)) {
    return cloneElement<CodeProps>(child as ReactElement<CodeProps>, { isInPre: true });
  }

  return child;
};

const Pre: ElementType = (props: ComponentPropsWithoutRef<'pre'> & { node?: unknown }) => {
  if (Array.isArray(props.children)) {
    return <>{props.children.map((child) => mapPreChild(child))}</>;
  }

  return <>{mapPreChild(props.children)}</>;
};

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
            <ReactMarkdown
              children={cleanTOCEntry(props.title)}
              components={{
                pre: Pre,
                code: Code,
                a: MarkdownLink,
              }}
              skipHtml
            />
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
