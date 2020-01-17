import React from 'react';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import styles from './Readme.module.css';

interface Props {
  markdownContent: string;
}

// TODO - check relative paths ???

interface CodeProps {
  language: string;
  value: string;
}

const Code: React.ElementType = (props: CodeProps) => (
  <SyntaxHighlighter language={props.language} style={docco}>
    {props.value}
  </SyntaxHighlighter>
);

const Info = (props: Props) => (
  <ReactMarkdown
    className={`mt-3 mb-3 ${styles.md}`}
    source={props.markdownContent}
    linkTarget="_blank"
    escapeHtml={false}
    renderers={{
      code: Code,
    }}
  />
);

export default Info;
