import React from 'react';

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

const ReadmeWrapper = (props: Props) => {
  const checkReadme = (): { readme: string; mainTitle: string; toc: TOCEntryItem[] } => {
    let title = '';
    let readme = props.markdownContent;

    const hasTitle = (): boolean => {
      if (props.markdownContent.startsWith('#')) {
        const matches = HEADING_REGEX.exec(`\n${readme}`);
        if (matches) {
          title = matches[2];
          readme = readme.replace(`${matches[1]} ${matches[2]}`, '');
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
          // Remove main title from readme
          readme = mdContent.slice(2).join('\n');
        }
      }
      return hasTitle;
    };

    if (!hasTitle()) {
      title = props.packageName;
    }

    const readmeWithMainTitle = `# ${title}\n${readme}`;
    const toc: TOCEntryItem[] = prepareMarkdownTOC(`\n${readme}${props.additionalTitles || ''}`);

    return { readme: toc.length > 0 ? readme : readmeWithMainTitle, mainTitle: title, toc: toc };
  };

  let { readme, mainTitle, toc } = checkReadme();

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
