import classnames from 'classnames';
import { cloneElement, ElementType, isValidElement, ReactElement, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import ErrorBoundary from '../../common/ErrorBoundary';
import CommandBlock from './CommandBlock';
import styles from './ContentInstall.module.css';

interface Props {
  install: string;
}

interface CodeProps {
  inline?: boolean;
  node?: {
    type?: string;
  };
  isInPre?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: any;
}

interface HeadingProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: any;
}

interface ImageProps {
  alt: string;
  src: string;
}

interface LinkProps {
  href: string;
  target?: string;
  node?: unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: any;
}

interface TableProps {
  children: JSX.Element | JSX.Element[];
}

const PublisherInstructionsInstall = (props: Props) => {
  const Code: ElementType = (props: CodeProps) => {
    const isInline = !props.isInPre && (props.inline === true || props.node?.type === 'inlineCode');

    if (isInline) {
      return <code className={`border border-1 ${styles.inlineCode}`}>{props.children}</code>;
    }
    if (props.children) {
      const content = String(props.children).replace(/\n$/, '');
      return <CommandBlock command={content} />;
    } else {
      return null;
    }
  };

  const mapPreChild = (child: CodeProps['children']) => {
    if (isValidElement<CodeProps>(child)) {
      return cloneElement<CodeProps>(child as ReactElement<CodeProps>, { isInPre: true });
    }

    return child;
  };

  const Pre: ElementType = (props: CodeProps) => {
    if (Array.isArray(props.children)) {
      return <>{props.children.map((child) => mapPreChild(child))}</>;
    }

    return <>{mapPreChild(props.children)}</>;
  };

  const getHeading = (level: number): ElementType => {
    return (props: HeadingProps) => (
      <div className="my-2">
        <div className={`h${level} text-muted pt-2 pb-1`}>
          <div className={styles.mdHeader}>{props.children}</div>
        </div>
      </div>
    );
  };

  const Table: ElementType = (data: TableProps) => (
    <div className="w-100 overflow-auto">
      <table>{data.children}</table>
    </div>
  );

  const Image: ElementType = (data: ImageProps) => {
    const [error, setError] = useState<boolean>(false);

    // Only absolute path
    return /^https?:/.test(data.src) ? (
      <img
        src={data.src}
        alt={data.alt || ''}
        className={classnames('mw-100', { 'd-none': error })}
        onError={() => setError(true)}
      />
    ) : null;
  };

  // Only for external links and anchors
  const Link: ElementType = (data: LinkProps) => {
    // Only absolute link
    return /^https?:/.test(data.href) ? (
      <a href={data.href} target={data.target || '_blank'} rel="noopener noreferrer" className="text-primary">
        {data.children}
      </a>
    ) : null;
  };

  return (
    <ErrorBoundary message="Something went wrong rendering the install instructions of this package.">
      <span data-testid="readme">
        <div className={`mt-3 mb-5 ${styles.md}`}>
          <ReactMarkdown
            children={props.install}
            remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
            skipHtml
            components={{
              pre: Pre,
              code: Code,
              img: Image,
              a: Link,
              h1: getHeading(1),
              h2: getHeading(2),
              h3: getHeading(3),
              h4: getHeading(4),
              h5: getHeading(5),
              h6: getHeading(6),
              table: Table,
            }}
          />
        </div>
      </span>
    </ErrorBoundary>
  );
};

export default PublisherInstructionsInstall;
