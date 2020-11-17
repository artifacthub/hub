import isNull from 'lodash/isNull';
import React, { useState } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { tomorrowNight } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import { OPAPolicies } from '../../types';
import ButtonCopyToClipboard from '../common/ButtonCopyToClipboard';
import Modal from '../common/Modal';
import styles from './OPAPoliciesList.module.css';

interface Props {
  policies: OPAPolicies;
}

const OPAPoliciesList = (props: Props) => {
  const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null);

  return (
    <>
      <div className="row mt-4">
        {Object.keys(props.policies).map((policy: string, index: number) => {
          const pathFile = policy.split('/');
          const fileName = pathFile.pop();
          const path = pathFile.join('/');
          return (
            <div className="col-12 col-lg-6 col-xxl-4 mb-4" key={`policy_${index}`}>
              <div className={`card h-100 ${styles.card}`} data-testid="policyCard">
                <div className="card-body d-flex flex-column">
                  <div className="d-flex flex-row align-items-baseline">
                    <small className="text-muted text-uppercase mr-1">File:</small>
                    <span className="text-truncate">{fileName}</span>
                  </div>

                  {path !== '' && (
                    <div className="d-flex flex-row align-items-baseline">
                      <small className="text-muted text-uppercase mr-1">Path:</small>
                      <span className="text-truncate">{pathFile.join('/')}</span>
                    </div>
                  )}

                  <div className="mt-auto d-flex flex-column align-items-end">
                    <div className={`separator ${styles.separator}`} />

                    <button
                      data-testid="policyBtn"
                      className="font-weight-bold btn btn-link btn-sm px-0 text-secondary"
                      onClick={() => setSelectedPolicy(policy === selectedPolicy ? null : policy)}
                    >
                      View Policy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!isNull(selectedPolicy) && (
        <div className="mt-auto ml-auto">
          <Modal
            modalDialogClassName={styles.modalDialog}
            className={`d-inline-block mt-1 ${styles.modal}`}
            header={
              <div className={`h4 m-2 flex-grow-1 ${styles.title}`}>
                Policy file: <span className="text-muted">{selectedPolicy}</span>
              </div>
            }
            onClose={() => setSelectedPolicy(null)}
            open
          >
            <div className="my-3 mw-100">
              <>
                <div className="text-right">
                  <ButtonCopyToClipboard
                    text={props.policies[selectedPolicy]}
                    className={`btn-link border-0 text-secondary font-weight-bold ${styles.copyBtn}`}
                    visibleBtnText
                  />
                </div>

                <div className="my-3">
                  <SyntaxHighlighter
                    language="text"
                    style={tomorrowNight}
                    customStyle={{ padding: '1.5rem' }}
                    lineNumberStyle={{ color: 'gray', marginRight: '15px' }}
                    showLineNumbers
                  >
                    {props.policies[selectedPolicy]}
                  </SyntaxHighlighter>
                </div>
              </>
            </div>
          </Modal>
        </div>
      )}
    </>
  );
};

export default OPAPoliciesList;
