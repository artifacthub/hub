import classnames from 'classnames';
import isArray from 'lodash/isArray';
import isUndefined from 'lodash/isUndefined';
import { ElementType, useEffect, useRef, useState } from 'react';
import { FiExternalLink } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';

import useOutsideClick from '../../../hooks/useOutsideClick';
import styles from './ParamInfo.module.css';

interface Props {
  element: JSX.Element;
  info: string | JSX.Element;
  isMarkdown?: boolean;
  className?: string;
  fixedWidth?: boolean;
}

interface HeadingProps {
  level: number;
  children?: JSX.Element[];
}

interface LinkProps {
  href: string;
  target: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: any;
}

const Heading: ElementType = (data: HeadingProps) => {
  const Tag = `h${data.level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  return <Tag className={`text-dark lh-1 fw-bold ${styles.header}`}>{data.children}</Tag>;
};

const Link: ElementType = (data: LinkProps) => {
  const linkIcon =
    data.children && isArray(data.children) && data.children[0] === 'iconLink' ? (
      <FiExternalLink className={`position-relative ${styles.linkIcon}`} />
    ) : undefined;

  return (
    <a href={data.href} target={data.target} rel="noopener noreferrer" className="d-inline-block text-dark">
      {linkIcon || data.children}
    </a>
  );
};

const ParamInfo = (props: Props) => {
  const ref = useRef(null);
  const [openStatus, setOpenStatus] = useState(false);
  const [onParamHover, setOnParamHover] = useState(false);
  const [onDropdownHover, setOnDropdownHover] = useState(false);
  useOutsideClick([ref], openStatus, () => setOpenStatus(false));

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (!openStatus && (onParamHover || onDropdownHover)) {
      timeout = setTimeout(() => {
        setOpenStatus(true);
      }, 100);
    }
    if (openStatus && !onParamHover && !onDropdownHover) {
      timeout = setTimeout(() => {
        // Delay to hide the dropdown to let some time for changing between dropdown and param (for clicking links)
        setOpenStatus(false);
      }, 50);
    }
    return () => {
      if (!isUndefined(timeout)) {
        clearTimeout(timeout);
      }
    };
  }, [onParamHover, onDropdownHover, openStatus]);

  return (
    <div className={`position-relative d-inline-block ${props.className}`}>
      <div className="position-absolute">
        <div
          ref={ref}
          data-testid="infoDropdown"
          className={classnames(
            'dropdown-menu dropdown-menu-left p-0 show d-block me-1 mb-1 text-wrap',
            styles.dropdown,
            { invisible: !openStatus },
            { visible: openStatus },
            { [styles.fixedWidth]: !isUndefined(props.fixedWidth) && props.fixedWidth }
          )}
          onMouseEnter={() => setOnDropdownHover(true)}
          onMouseLeave={() => setOnDropdownHover(false)}
        >
          <div className={styles.content}>
            {!isUndefined(props.isMarkdown) && props.isMarkdown ? (
              <ReactMarkdown
                className="p-2"
                children={props.info as string}
                components={{
                  h1: Heading,
                  h2: Heading,
                  h3: Heading,
                  h4: Heading,
                  h5: Heading,
                  h6: Heading,
                  a: Link,
                }}
                linkTarget="_blank"
                skipHtml
              />
            ) : (
              <>{props.info}</>
            )}
          </div>
        </div>
      </div>

      <div
        data-testid="infoText"
        onMouseEnter={(e) => {
          e.preventDefault();
          setOnParamHover(true);
        }}
        onMouseLeave={() => {
          setOnParamHover(false);
        }}
        aria-expanded={openStatus}
      >
        {props.element}
      </div>
    </div>
  );
};

export default ParamInfo;
