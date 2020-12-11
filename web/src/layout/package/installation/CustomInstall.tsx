import React from 'react';
import ReactMarkdown from 'react-markdown';

import ErrorBoundary from '../../common/ErrorBoundary';
import CommandBlock from './CommandBlock';
import styles from './ContentInstall.module.css';

interface Props {
  install: string;
}

interface CodeProps {
  language: string;
  value: string;
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
    if (props.value) {
      return <CommandBlock command={props.value} />;
    } else {
      return null;
    }
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
          skipHtml
          renderers={{
            code: Code,
            heading: Heading,
            table: Table,
          }}
        />
      </span>
    </ErrorBoundary>
  );
};

export default CustomInstall;
