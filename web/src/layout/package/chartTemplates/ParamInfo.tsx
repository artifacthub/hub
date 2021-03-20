import classnames from 'classnames';
import { isArray } from 'lodash';
import isUndefined from 'lodash/isUndefined';
import React, { useEffect, useRef, useState } from 'react';
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
  title?: string;
  children?: JSX.Element[];
}

interface LinkProps {
  href: string;
  target: string;
  children: any;
}

const Heading: React.ElementType = (data: HeadingProps) => {
  const Tag = `h${data.level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  return <Tag className={`text-secondary ${styles.header}`}>{data.title || data.children}</Tag>;
};

const Link: React.ElementType = (data: LinkProps) => {
  const linkIcon =
    data.children && isArray(data.children) && data.children[0].props.children === 'iconLink' ? (
      <FiExternalLink className={`position-relative ${styles.linkIcon}`} />
    ) : undefined;

  return (
    <a href={data.href} target={data.target} rel="noopener noreferrer" className="d-inline-block text-secondary">
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
            'dropdown-menu dropdown-menu-left p-0 show d-block mr-1 mb-1',
            styles.dropdown,
            {
              [styles.visible]: openStatus,
            },
            { [styles.fixedWidth]: !isUndefined(props.fixedWidth) && props.fixedWidth }
          )}
          onMouseEnter={() => setOnDropdownHover(true)}
          onMouseLeave={() => setOnDropdownHover(false)}
        >
          <div className={styles.content}>
            {!isUndefined(props.isMarkdown) && props.isMarkdown ? (
              <ReactMarkdown
                className="p-2"
                children={props.info}
                renderers={{
                  heading: Heading,
                  link: Link,
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
      >
        {props.element}
      </div>
    </div>
  );
};

export default ParamInfo;
