import classnames from 'classnames';
import isArray from 'lodash/isArray';
import isUndefined from 'lodash/isUndefined';
import { cloneElement, ElementType, isValidElement, ReactElement, ReactNode, useEffect, useRef, useState } from 'react';
import { FiExternalLink } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { github } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

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
  children?: ReactNode;
}

interface LinkProps {
  href?: string;
  target?: string;
  className?: string;
  node?: unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: any;
}

interface PreProps {
  children?: ReactNode;
}

interface CodeProps {
  className?: string;
  isInPre?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: any;
}

const getHeading = (level: number): ElementType => {
  return (data: HeadingProps) => {
    const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    return <Tag className={`text-dark lh-1 fw-bold ${styles.header}`}>{data.children}</Tag>;
  };
};

const Link: ElementType = ({ className, target, children, ...rest }: LinkProps) => {
  const linkIcon =
    children && isArray(children) && children[0] === 'iconLink' ? (
      <FiExternalLink className={`position-relative ${styles.linkIcon}`} />
    ) : undefined;

  return (
    <a
      {...rest}
      target={target || '_blank'}
      rel="noopener noreferrer"
      className={`d-inline-block text-dark${className ? ` ${className}` : ''}`}
    >
      {linkIcon || children}
    </a>
  );
};
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

const mapPreChild = (child: PreProps['children']) => {
  if (isValidElement<CodeProps>(child)) {
    return cloneElement<CodeProps>(child as ReactElement<CodeProps>, { isInPre: true });
  }

  return child;
};

const Pre: ElementType = ({ children }: PreProps) => {
  if (isArray(children)) {
    return <>{children.map((child) => mapPreChild(child))}</>;
  }

  return <>{mapPreChild(children)}</>;
};

const ParamInfo = (props: Props) => {
  const ref = useRef<HTMLDivElement>(null);
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
              <div className="p-2">
                <ReactMarkdown
                  children={props.info as string}
                  components={{
                    pre: Pre,
                    code: Code,
                    h1: getHeading(1),
                    h2: getHeading(2),
                    h3: getHeading(3),
                    h4: getHeading(4),
                    h5: getHeading(5),
                    h6: getHeading(6),
                    a: Link,
                  }}
                  skipHtml
                />
              </div>
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
