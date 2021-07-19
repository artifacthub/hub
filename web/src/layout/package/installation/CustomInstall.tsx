import React from 'react';
import ReactMarkdown from 'react-markdown';
import gfm from 'remark-gfm';

import ErrorBoundary from '../../common/ErrorBoundary';
import CommandBlock from './CommandBlock';
import styles from './ContentInstall.module.css';

interface Props {
  install: string;
}

interface CodeProps {
  children: any;
}

interface HeadingProps {
  level: number;
  children: any;
}

interface TableProps {
  children: JSX.Element | JSX.Element[];
}

const CustomInstall = (props: Props) => {
  const Code: React.ElementType = (props: CodeProps) => {
    if (props.children) {
      const content = String(props.children).replace(/\n$/, '');
      return <CommandBlock command={content} />;
    } else {
      return null;
    }
  };

  const Pre: React.ElementType = (props: CodeProps) => {
    return <>{props.children}</>;
  };

  const Heading: React.ElementType = (props: HeadingProps) => (
    <div className="my-2">
      <small className="text-muted mt-2 mb-1">{props.children}</small>
    </div>
  );

  const Table: React.ElementType = (data: TableProps) => (
    <div className="w-100 overflow-auto">
      <table>{data.children}</table>
    </div>
  );

  return (
    <ErrorBoundary message="Something went wrong rendering the install instructions of this package.">
      <span data-testid="readme">
        <ReactMarkdown
          className={`mt-3 mb-5 ${styles.md}`}
          children={props.install}
          linkTarget="_blank"
          plugins={[[gfm, { singleTilde: false }]]}
          skipHtml
          components={{
            pre: Pre,
            code: Code,
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

export default CustomInstall;
