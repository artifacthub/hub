import 'react-diff-view/style/index.css';

import classnames from 'classnames';
import isNull from 'lodash/isNull';
import { useEffect, useState } from 'react';
import { Decoration, Diff, Hunk, parseDiff } from 'react-diff-view';

import styles from './DiffTemplate.module.css';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const DiffLibrary = require('diff');

interface Props {
  currentVersion: string;
  diffVersion: string;
  compareData: string;
  data: string;
  expanded: boolean;
  removeLoading: () => void;
}

interface DiffProps {
  diffText: string;
}

const Changes = (props: DiffProps) => {
  const files = parseDiff(props.diffText);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderFile = ({ oldPath, newPath, oldRevision, newRevision, type, hunks }: any) => {
    return (
      <div key={`${oldRevision}-${newRevision}`} className="file-diff h-100" data-testid="diffTemplate">
        <header
          className={`d-flex flex-row align-items-center justify-content-between diff-header fw-bold py-1 ${styles.header}`}
        >
          <div className="pe-5 me-3">
            <span className={`pe-2 ${styles.versionTitle}`}>Changes from</span>
            <span className="badge bg-dark px-2 py-1 badge-md">{oldPath}</span>
            <span className={`px-2 ${styles.versionTitle}`}>to</span>
            <span className="badge bg-dark px-2 py-1 badge-md">{newPath}</span>
          </div>
        </header>
        <div className={`overflow-scroll border-top border-1 py-2 ${styles.codeWrapper}`}>
          <Diff viewType="unified" diffType={type} hunks={hunks || []}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(hunks: any[]) => (
              <>
                {hunks.map((hunk, index) => {
                  return [
                    <Decoration key={`deco-${hunk.content}-${index}`}>
                      <div
                        className={classnames(
                          'hunk-header py-1 px-3 fw-bold',
                          styles.hunkHeader,
                          { 'mb-2': index === 0 },
                          { 'my-2': index !== 0 }
                        )}
                      >
                        {hunk.content}
                      </div>
                    </Decoration>,
                    <Hunk key={`${hunk.content}-${index}`} hunk={hunk} />,
                  ];
                })}
              </>
            )}
          </Diff>
        </div>
      </div>
    );
  };
  return <>{files.map(renderFile)}</>;
};

const DiffTemplate = (props: Props) => {
  const [diffContent, setDiffContent] = useState<string | null>(null);

  useEffect(() => {
    const prepareDiff = () => {
      const newDiff = DiffLibrary.createTwoFilesPatch(
        '  ',
        '  ',
        props.compareData,
        props.data,
        props.diffVersion,
        props.currentVersion,
        { context: props.expanded ? Number.MAX_SAFE_INTEGER : 2 }
      );
      if (newDiff === diffContent) {
        props.removeLoading();
      }
      setDiffContent(newDiff);
    };

    prepareDiff();
  }, [props.compareData, props.expanded]);

  useEffect(() => {
    props.removeLoading();
  }, [diffContent]);

  return <>{!isNull(diffContent) && <Changes diffText={`diff --git \n ${diffContent}`} />}</>;
};

export default DiffTemplate;
