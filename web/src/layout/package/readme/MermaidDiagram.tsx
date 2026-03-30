import { memo, useEffect, useId, useRef, useState } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { github } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import styles from './Readme.module.css';

interface Props {
  code: string;
}

const MermaidDiagram = ({ code }: Props) => {
  const id = useId().replace(/:/g, '_');
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    const renderDiagram = async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'default',
        });

        const { svg } = await mermaid.render(`mermaid${id}`, code);

        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch {
        if (!cancelled) {
          setError(true);
        }
      }
    };

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [code, id]);

  if (error) {
    return (
      <SyntaxHighlighter language="text" style={github}>
        {code}
      </SyntaxHighlighter>
    );
  }

  return <div ref={containerRef} className={styles.mermaidDiagram} />;
};

export default memo(MermaidDiagram);
