import isUndefined from 'lodash/isUndefined';
import { useEffect, useState } from 'react';
import { GoFileCode } from 'react-icons/go';
import { useLocation, useNavigate } from 'react-router-dom';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import BlockCodeButtons from '../common/BlockCodeButtons';
import Modal from '../common/Modal';
import styles from './TektonManifestModal.module.css';

interface Props {
  normalizedName: string;
  visibleManifest: boolean;
  manifestRaw?: string;
}

const TektonManifestModal = (props: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openStatus, setOpenStatus] = useState<boolean>(false);

  const onOpenModal = () => {
    if (!isUndefined(props.manifestRaw)) {
      setOpenStatus(true);
      navigate('?modal=manifest', {
        state: location.state,
        replace: true,
      });
    }
  };

  const onCloseModal = () => {
    setOpenStatus(false);
    navigate('', {
      state: location.state,
      replace: true,
    });
  };

  useEffect(() => {
    if (props.visibleManifest && !openStatus) {
      onOpenModal();
    }
  }, []);

  if (isUndefined(props.manifestRaw)) return null;

  return (
    <div className="mb-2">
      <button
        className="btn btn-outline-secondary btn-sm text-nowrap w-100"
        onClick={onOpenModal}
        aria-label="Open Manifest"
      >
        <div className="d-flex flex-row align-items-center justify-content-center text-uppercase">
          <GoFileCode />
          <span className="ms-2 fw-bold">Manifest</span>
        </div>
      </button>

      {openStatus && (
        <Modal
          modalDialogClassName={styles.modalDialog}
          modalClassName="h-100"
          header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Manifest</div>}
          onClose={onCloseModal}
          open={openStatus}
          footerClassName={styles.modalFooter}
        >
          <div className="h-100 mw-100">
            <div className={`position-relative h-100 mh-100 border border-1 ${styles.syntaxWrapper}`}>
              <BlockCodeButtons filename={`${props.normalizedName}.yaml`} content={props.manifestRaw} />

              <SyntaxHighlighter
                language="yaml"
                style={docco}
                customStyle={{
                  backgroundColor: 'transparent',
                  padding: '1.5rem',
                  lineHeight: '1.25rem',
                  marginBottom: '0',
                  height: '100%',
                  fontSize: '80%',
                  color: '#636a6e',
                }}
                lineNumberStyle={{
                  color: 'var(--color-black-25)',
                  marginRight: '5px',
                  fontSize: '0.8rem',
                }}
                showLineNumbers
              >
                {props.manifestRaw}
              </SyntaxHighlighter>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TektonManifestModal;
