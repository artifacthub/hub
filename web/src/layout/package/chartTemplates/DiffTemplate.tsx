import 'react-diff-view/style/index.css';

import classnames from 'classnames';
import isNull from 'lodash/isNull';
import { Dispatch, Fragment, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { Decoration, Diff, Hunk, parseDiff } from 'react-diff-view';

import { CompareChartTemplate, CompareChartTemplateStatus } from '../../../types';
import styles from './DiffTemplate.module.css';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const DiffLibrary = require('diff');

interface Props {
  currentVersion: string;
  diffVersion: string;
  template: CompareChartTemplate;
  expanded: boolean;
  setIsChangingTemplate: Dispatch<SetStateAction<boolean>>;
}

interface DiffProps {
  diffText: string;
  fileName: string;
  status?: CompareChartTemplateStatus;
  removeLoading: () => void;
}

const Changes = (props: DiffProps) => {
  const tmplWrapper = useRef<HTMLDivElement>(null);
  const files = parseDiff(props.diffText);

  const scrollTop = () => {
    if (tmplWrapper && tmplWrapper.current) {
      tmplWrapper.current.scroll(0, 0);
    }
  };

  const renderFile = ({
    oldPath,
    newPath,
    oldRevision,
    newRevision,
    type,
    hunks,
    oldEndingNewLine,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }: any) => {
    return (
      <div key={`${oldRevision}-${newRevision}`} className="file-diff h-100" data-testid="diffTemplate">
        <header
          className={`d-flex flex-row align-items-center justify-content-between diff-header fw-bold py-1 ${styles.header}`}
        >
          <div className="text-truncate">{props.fileName}</div>
          <div className="pe-5 me-3 ps-3">
            <span className={`pe-2 ${styles.versionTitle}`}>Changes from</span>
            <span className="badge bg-dark px-2 py-1 badge-md">{oldPath}</span>
            <span className={`px-2 ${styles.versionTitle}`}>to</span>
            <span className="badge bg-dark px-2 py-1 badge-md">{newPath}</span>
          </div>
        </header>
        <div ref={tmplWrapper} className={`overflow-scroll border-top border-1 py-2 ${styles.codeWrapper}`}>
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
                    <Fragment key={`${hunk.content}-newLine-${index}`}>
                      {index + 1 === hunks.length &&
                        !oldEndingNewLine &&
                        props.status !== CompareChartTemplateStatus.Deleted && (
                          <tbody>
                            <tr>
                              <td></td>
                              <td></td>
                              <td className={styles.newLine}>\ No newline at end of file</td>
                            </tr>
                          </tbody>
                        )}
                    </Fragment>,
                  ];
                })}
              </>
            )}
          </Diff>
        </div>
      </div>
    );
  };

  useEffect(() => {
    props.removeLoading();
    scrollTop();
  }, [props.fileName]);

  return <>{files.map(renderFile)}</>;
};

const DiffTemplate = (props: Props) => {
  const [diffContent, setDiffContent] = useState<string | null>(null);

  const removeLoading = useCallback(() => {
    props.setIsChangingTemplate(false);
  }, []);

  useEffect(() => {
    const prepareDiff = () => {
      setDiffContent(
        DiffLibrary.createTwoFilesPatch(
          '  ',
          '  ',
          props.template.compareData,
          props.template.data,
          props.diffVersion,
          props.currentVersion,
          { context: props.expanded ? Number.MAX_SAFE_INTEGER : 2 }
        )
      );
    };

    prepareDiff();
  }, [props.template, props.expanded]);

  return (
    <>
      {!isNull(diffContent) && (
        <Changes
          diffText={`diff --git \n ${diffContent}`}
          fileName={props.template.name}
          status={props.template.status}
          removeLoading={removeLoading}
        />
      )}
    </>
  );
};

export default DiffTemplate;
