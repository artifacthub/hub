import { isUndefined } from 'lodash';
import { useEffect, useState } from 'react';
import { GoFileCode } from 'react-icons/go';
import { useHistory } from 'react-router-dom';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import { SearchFiltersURL } from '../../types';
import BlockCodeButtons from '../common/BlockCodeButtons';
import Modal from '../common/Modal';
import styles from './TektonManifestModal.module.css';

interface Props {
  normalizedName: string;
  visibleManifest: boolean;
  manifestRaw?: string;
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
}

const TektonManifestModal = (props: Props) => {
  const history = useHistory();
  const [openStatus, setOpenStatus] = useState<boolean>(false);

  const onOpenModal = () => {
    if (!isUndefined(props.manifestRaw)) {
      setOpenStatus(true);
      history.replace({
        search: '?modal=manifest',
        state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
      });
    }
  };

  const onCloseModal = () => {
    setOpenStatus(false);
    history.replace({
      search: '',
      state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
    });
  };

  useEffect(() => {
    if (props.visibleManifest && !openStatus) {
      onOpenModal();
    }
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  if (isUndefined(props.manifestRaw)) return null;

  return (
    <div className="mb-2">
      <button
        className="btn btn-outline-secondary btn-block btn-sm text-nowrap"
        onClick={onOpenModal}
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
          onClose={onCloseModal}
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
            </>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TektonManifestModal;
