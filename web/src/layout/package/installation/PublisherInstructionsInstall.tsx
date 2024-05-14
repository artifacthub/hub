import classnames from 'classnames';
import { ElementType, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import ErrorBoundary from '../../common/ErrorBoundary';
import CommandBlock from './CommandBlock';
import styles from './ContentInstall.module.css';

interface Props {
  install: string;
}

interface CodeProps {
  inline: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: any;
}

interface HeadingProps {
  level: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: any;
}

interface ImageProps {
  alt: string;
  src: string;
}

interface LinkProps {
  href: string;
  target: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: any;
}

interface TableProps {
  children: JSX.Element | JSX.Element[];
}

const PublisherInstructionsInstall = (props: Props) => {
  const Code: ElementType = (props: CodeProps) => {
    if (props.inline) {
      return <code className={`border border-1 ${styles.inlineCode}`}>{props.children}</code>;
    }
    if (props.children) {
      const content = String(props.children).replace(/\n$/, '');
      return <CommandBlock command={content} />;
    } else {
      return null;
    }
  };

  const Pre: ElementType = (props: CodeProps) => {
    return <>{props.children}</>;
  };

  const Heading: ElementType = (props: HeadingProps) => (
    <div className="my-2">
      <div className={`h${props.level} text-muted pt-2 pb-1`}>
        <div className={styles.mdHeader}>{props.children}</div>
      </div>
    </div>
  );

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
      <a href={data.href} target={data.target} rel="noopener noreferrer" className="text-primary">
        {data.children}
      </a>
    ) : null;
  };

  return (
    <ErrorBoundary message="Something went wrong rendering the install instructions of this package.">
      <span data-testid="readme">
        <ReactMarkdown
          className={`mt-3 mb-5 ${styles.md}`}
          children={props.install}
          linkTarget="_blank"
          remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
          skipHtml
          components={{
            pre: Pre,
            code: Code,
            img: Image,
            a: Link,
            h1: Heading,
            h2: Heading,
            h3: Heading,
            h4: Heading,
            h5: Heading,
            h6: Heading,
            table: Table,
          }}
        />
      </span>
    </ErrorBoundary>
  );
};

export default PublisherInstructionsInstall;
