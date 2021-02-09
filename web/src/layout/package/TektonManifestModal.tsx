import { isUndefined } from 'lodash';
import React, { useState } from 'react';
import { GoFileCode } from 'react-icons/go';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { tomorrowNight } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

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
      >
        <div className="d-flex flex-row align-items-center justify-content-center text-uppercase">
          <GoFileCode />
          <span className="ml-2 font-weight-bold">Manifest YAML</span>
        </div>
      </button>

      {openStatus && (
        <Modal
          modalDialogClassName={styles.modalDialog}
          header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Manifest YAML</div>}
          onClose={() => setOpenStatus(false)}
          open={openStatus}
        >
          <div className="mw-100">
            <>
              <div className="position-relative">
                <BlockCodeButtons filename={`${props.normalizedName}.yaml`} content={props.manifestRaw} />

                <SyntaxHighlighter
                  language="yaml"
                  style={tomorrowNight}
                  customStyle={{ padding: '1.5rem', marginBottom: '0' }}
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
