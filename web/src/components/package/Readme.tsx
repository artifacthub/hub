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

interface ImageProps {
  alt: string;
  src: string;
}

interface LinkProps {
  href: string;
  target: string;
  children: any;
}

const Code: React.ElementType = (props: CodeProps) => {
  if (props.value) {
    return (
      <SyntaxHighlighter language={props.language || 'bash'} style={docco}>
        {props.value}
      </SyntaxHighlighter>
    );
  } else {
    return null;
  }
}

// TODO - get correct image
const Image: React.ElementType = (props: ImageProps) => {
  return /^https?:/.test(props.src)
  ? <img src={props.src} alt={props.alt} />
  : null;
};

// TODO - get only absolute links
const Link: React.ElementType = (props: LinkProps) => {
  return /^https?:/.test(props.href)
  ? <a href={props.href} target={props.target}>{props.children}</a>
  : <>{props.children}</>;
};

const Info = (props: Props) => (
  <ReactMarkdown
    className={`mt-3 mb-5 ${styles.md}`}
    source={props.markdownContent}
    linkTarget="_blank"
    escapeHtml={false}
    renderers={{
      code: Code,
      image: Image,
      link: Link,
    }}
  />
);

export default Info;
