import React, { useEffect, useState } from 'react';

import { TOCEntryItem } from '../../../types';
import prepareMarkdownTOC, { HEADING_REGEX } from '../../../utils/prepareMarkdownTOC';
import ErrorBoundary from '../../common/ErrorBoundary';
import Readme from './Readme';
import TOC from './TOC';

interface Props {
  packageName: string;
  markdownContent: string;
  additionalTitles?: string;
  scrollIntoView: (id?: string) => void;
}

const INITIAL_HEADING = /^(#+) (.*)/;

const ReadmeWrapper = (props: Props) => {
  const [mainTitle, setMainTitle] = useState<string>('');
  const [toc, setToc] = useState<TOCEntryItem[]>([]);
  const [readme, setReadme] = useState(props.markdownContent);

  useEffect(() => {
    const checkReadme = () => {
      let title = '';
      let readmeTmp = props.markdownContent;

      const hasTitle = (): boolean => {
        if (INITIAL_HEADING.test(readmeTmp)) {
          const matches = HEADING_REGEX.exec(`\n${readmeTmp}`);
          if (matches) {
            title = matches[2];
            readmeTmp = readmeTmp.replace(`${matches[1]} ${matches[2]}`, '');
          }
          return true;
        }

        let hasTitle = false;
        const mdContent = props.markdownContent.split('\n');
        if (mdContent.length > 1) {
          const secondLine = mdContent[1];
          if (secondLine.includes('===') || secondLine.includes('---')) {
            hasTitle = true;
            title = mdContent[0];
            // Remove main title from readmeTmp
            readmeTmp = mdContent.slice(2).join('\n');
          }
        }
        return hasTitle;
      };

      if (!hasTitle()) {
        title = props.packageName;
      }

      const readmeWithMainTitle = `# ${title}\n${readmeTmp}`;
      const toc: TOCEntryItem[] = prepareMarkdownTOC(`\n${readmeTmp}${props.additionalTitles || ''}`);

      setReadme(toc.length > 0 ? readmeTmp : readmeWithMainTitle);
      setMainTitle(title);
      setToc(toc);
    };
    checkReadme();
  }, [props.markdownContent, props.additionalTitles, props.packageName]);

  return (
    <ErrorBoundary
      className="d-table-cell overflow-hidden"
      message="Something went wrong rendering the README file of this package."
    >
      <span data-testid="readme">
        <TOC title={mainTitle} toc={toc} scrollIntoView={props.scrollIntoView} />
        <Readme readme={readme} scrollIntoView={props.scrollIntoView} />
      </span>
    </ErrorBoundary>
  );
};

export default ReadmeWrapper;
