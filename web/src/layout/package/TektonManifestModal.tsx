import { isUndefined } from 'lodash';
import React, { useState } from 'react';
import { GoFileCode } from 'react-icons/go';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import BlockCodeButtons from '../common/BlockCodeButtons';
import Modal from '../common/Modal';
import styles from './TektonManifestModal.module.css';

interface Props {
  normalizedName: string;
  manifestRaw?: string;
}

const TektonManifestModal = (props: Props) => {
  const [openStatus, setOpenStatus] = useState<boolean>(false);

  if (isUndefined(props.manifestRaw)) return null;

  return (
    <div className="mb-2">
      <button
        data-testid="tektonManifestBtn"
        className="btn btn-secondary btn-block btn-sm text-nowrap"
        onClick={() => setOpenStatus(true)}
        aria-label="Open Manifest"
      >
        <div className="d-flex flex-row align-items-center justify-content-center text-uppercase">
          <GoFileCode />
          <span className="ml-2 font-weight-bold">Manifest</span>
        </div>
      </button>

      {openStatus && (
        <Modal
          modalDialogClassName={styles.modalDialog}
          header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Manifest</div>}
          onClose={() => setOpenStatus(false)}
          open={openStatus}
        >
          <div className="mw-100 h-100">
            <>
              <div className={`position-relative h-100 overflow-auto ${styles.syntaxWrapper}`}>
                <BlockCodeButtons filename={`${props.normalizedName}.yaml`} content={props.manifestRaw} />

                <SyntaxHighlighter
                  language="yaml"
                  style={docco}
                  customStyle={{
                    backgroundColor: 'var(--color-1-5)',
                    padding: '1.5rem',
                    marginBottom: '0',
                    height: '100%',
                    fontSize: '75%',
                  }}
                  lineNumberStyle={{ color: 'gray', marginRight: '15px' }}
                  showLineNumbers
                >
                  {props.manifestRaw}
                </SyntaxHighlighter>
              </div>
            </>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TektonManifestModal;
