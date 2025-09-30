import isArray from 'lodash/isArray';
import isUndefined from 'lodash/isUndefined';
import moment from 'moment';
import {
  cloneElement,
  ComponentPropsWithoutRef,
  Dispatch,
  ElementType,
  isValidElement,
  ReactElement,
  SetStateAction,
  useEffect,
  useRef,
} from 'react';
import { FaCaretDown, FaCaretRight, FaLink } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { github } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import { Vulnerability, VulnerabilitySeverity } from '../../../types';
import checkCodeLanguage from '../../../utils/checkCodeLanguage';
import { SEVERITY_RATING } from '../../../utils/data';
import isFuture from '../../../utils/isFuture';
import ExternalLink from '../../common/ExternalLink';
import styles from './Cell.module.css';
import CVSSVector from './CVSSVector';

interface Props {
  name: string;
  vulnerability: Vulnerability;
  isExpanded: boolean;
  setVisibleVulnerability: Dispatch<SetStateAction<string | undefined>>;
}

interface HeadingProps {
  level: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: any;
}

interface CodeProps {
  className?: string;
  inline?: boolean;
  node?: {
    type?: string;
  };
  isInPre?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: any;
}

interface LinkProps extends ComponentPropsWithoutRef<'a'> {
  node?: unknown;
}

const SecurityCell = (props: Props) => {
  const ref = useRef<HTMLTableRowElement>(null);

  const getMainReference = (): JSX.Element | null => {
    if (isUndefined(props.vulnerability.References) || props.vulnerability.References.length === 0) {
      return null;
    }

    let reference = props.vulnerability.References.find((ref: string) =>
      ref.includes(props.vulnerability.VulnerabilityID)
    );
    if (isUndefined(reference)) {
      reference = props.vulnerability.References[0];
    }

    return (
      <ExternalLink
        href={reference}
        className={`ms-2 text-dark position-relative ${styles.link}`}
        label={`Link to ${props.vulnerability.VulnerabilityID} vulnerability`}
      >
        <small>
          <FaLink />
        </small>
      </ExternalLink>
    );
  };

  const severity: VulnerabilitySeverity = props.vulnerability.Severity.toLowerCase() as VulnerabilitySeverity;

  const Heading: ElementType = (props: HeadingProps) => (
    <div className="h6 text-muted pt-2 pb-1">
      <div className={styles.mdHeader}>{props.children}</div>
    </div>
  );

  const Code: ElementType = ({ children, className, isInPre }: CodeProps) => {
    if (!isInPre) {
      return <code className={`border border-1 ${styles.inlineCode}`}>{children}</code>;
    }
    if (!children) {
      return null;
    }

    const match = /language-(\w+)/.exec(className || '');

    return (
      <SyntaxHighlighter language={checkCodeLanguage(match ? match[1] : 'bash')} style={github}>
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    );
  };

  const mapPreChild = (child: CodeProps['children']) => {
    if (isValidElement<CodeProps>(child)) {
      return cloneElement<CodeProps>(child as ReactElement<CodeProps>, { isInPre: true });
    }

    return child;
  };

  const Pre: ElementType = (props: CodeProps) => {
    if (isArray(props.children)) {
      return <>{props.children.map((child) => mapPreChild(child))}</>;
    }

    return <>{mapPreChild(props.children)}</>;
  };

  const MarkdownLink: ElementType = ({ children, target, ...rest }: LinkProps) => (
    <a {...rest} target={target || '_blank'} rel="noopener noreferrer">
      {children}
    </a>
  );

  const Paragraph: ElementType = ({ children, ...rest }: ComponentPropsWithoutRef<'p'> & { node?: unknown }) => (
    <p className="text-muted mb-1" {...rest}>
      {children}
    </p>
  );

  useEffect(() => {
    // Scrolls content into view when a vulnerability is expanded
    if (props.isExpanded && ref && ref.current) {
      ref.current.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'smooth' });
    }
  }, [props.isExpanded]);

  return (
    <>
      <tr
        data-testid="vulnerabilityCell"
        className={styles.clickableCell}
        onClick={() => props.setVisibleVulnerability(!props.isExpanded ? props.name : undefined)}
        ref={ref}
      >
        <td className="align-middle text-primary">{props.isExpanded ? <FaCaretDown /> : <FaCaretRight />}</td>
        <td className="align-middle text-nowrap pe-3">
          {props.vulnerability.VulnerabilityID}
          {getMainReference()}
        </td>
        <td className="align-middle text-nowrap text-uppercase pe-3">
          <div className="d-flex flex-row align-items-center">
            <span
              data-testid="severityBadge"
              className={`badge p-2 me-2 ${styles.badge}`}
              style={{
                backgroundColor: SEVERITY_RATING[severity]!.color,
              }}
            >
              {' '}
            </span>
            <small>{props.vulnerability.Severity}</small>
          </div>
        </td>
        <td className="align-middle text-nowrap pe-3 w-25">
          <div className={`d-table w-100 ${styles.wrapperCell}`}>
            <div className="text-truncate">{props.vulnerability.PkgName}</div>
          </div>
        </td>
        <td className="align-middle text-nowrap pe-3 w-25">
          <div className={`d-table w-100 ${styles.wrapperCell}`}>
            <div className="text-truncate">{props.vulnerability.InstalledVersion}</div>
          </div>
        </td>
        <td className="align-middle text-nowrap pe-3 w-25" data-testid="fixedVersionCell">
          {props.vulnerability.FixedVersion ? (
            <div className={`d-table w-100 ${styles.wrapperCell}`}>
              <div className="text-truncate">{JSON.parse(`"${props.vulnerability.FixedVersion}"`)}</div>
            </div>
          ) : (
            <span className="text-muted">-</span>
          )}
        </td>
      </tr>

      {props.isExpanded && (
        <tr data-testid="vulnerabilityDetail" className={styles.noClickableCell}>
          <td colSpan={6} className={`overflow-hidden ${styles.expandedCell}`}>
            <div className="m-3">
              {isUndefined(props.vulnerability.title) && isUndefined(props.vulnerability.Description) ? (
                <div className="fst-italic">Any information about this vulnerability</div>
              ) : (
                <>
                  <div className="h6">{props.vulnerability.Title}</div>
                  {props.vulnerability.Description && (
                    <ReactMarkdown
                      children={props.vulnerability.Description}
                      components={{
                        pre: Pre,
                        h1: Heading,
                        h2: Heading,
                        h3: Heading,
                        h4: Heading,
                        h5: Heading,
                        h6: Heading,
                        code: Code,
                        a: MarkdownLink,
                        p: Paragraph,
                      }}
                      skipHtml
                    />

                    // <p className="text-muted mb-1">{props.vulnerability.Description}</p>
                  )}
                  <div className="d-flex flex-column text-end">
                    {!isUndefined(props.vulnerability.LastModifiedDate) &&
                      !isFuture(props.vulnerability.LastModifiedDate, false) && (
                        <small className="fst-italic">
                          Updated {moment(props.vulnerability.LastModifiedDate).fromNow()}
                        </small>
                      )}
                  </div>
                  {props.vulnerability.CVSS && (
                    <CVSSVector
                      source={props.vulnerability.SeveritySource}
                      severity={severity}
                      CVSS={props.vulnerability.CVSS || {}}
                    />
                  )}
                </>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default SecurityCell;
