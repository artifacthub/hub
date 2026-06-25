import isUndefined from 'lodash/isUndefined';
import { useEffect, useMemo, useState } from 'react';
import { FiCode } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';

import BlockCodeButtons from '../common/BlockCodeButtons';
import CodeViewer from '../common/CodeViewer';
import Modal from '../common/Modal';
import styles from './MesheryDesignModal.module.css';

interface Props {
  normalizedName: string;
  visibleDesign: boolean;
  design?: string;
}

const getFormattedDesignContent = (design: string): string => {
  const trimmedDesign = design.trim();
  if (trimmedDesign.includes('\n') || (!trimmedDesign.startsWith('{') && !trimmedDesign.startsWith('['))) {
    return design;
  }

  try {
    return JSON.stringify(JSON.parse(trimmedDesign), null, 2);
  } catch {
    return design;
  }
};

const MesheryDesignModal = (props: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openStatus, setOpenStatus] = useState<boolean>(false);

  const onOpenModal = () => {
    if (!isUndefined(props.design)) {
      setOpenStatus(true);
      navigate('?modal=design', {
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
    if (props.visibleDesign && !openStatus) {
      onOpenModal();
    }
  }, []);

  const design = isUndefined(props.design) ? '' : props.design;
  const formattedDesign = useMemo(
    () => (openStatus ? getFormattedDesignContent(design) : design),
    [design, openStatus]
  );

  if (isUndefined(props.design)) return null;

  return (
    <div className="mb-2">
      <button
        className="btn btn-outline-secondary btn-sm text-nowrap w-100"
        onClick={onOpenModal}
        aria-label="Open Design"
      >
        <div className="d-flex flex-row align-items-center justify-content-center text-uppercase">
          <FiCode />
          <span className="ms-2 fw-bold">Design</span>
        </div>
      </button>

      {openStatus && (
        <Modal
          modalDialogClassName={styles.modalDialog}
          modalClassName="h-100"
          header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Design</div>}
          onClose={onCloseModal}
          open={openStatus}
          footerClassName={styles.modalFooter}
        >
          <div className={`h-100 mw-100 d-flex flex-column ${styles.contentWrapper}`}>
            <div className={`position-relative flex-grow-1 mh-100 border border-1 ${styles.syntaxWrapper}`}>
              <BlockCodeButtons filename={`${props.normalizedName}.yaml`} content={design} />

              <CodeViewer
                content={formattedDesign}
                language="yaml"
                customStyle={{
                  backgroundColor: 'transparent',
                  padding: '1.5rem',
                  paddingRight: '5rem',
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
                plainCodeTestId="plain-design"
                plainCodeLinesTestId="plain-design-lines"
                showLineNumbers
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MesheryDesignModal;
