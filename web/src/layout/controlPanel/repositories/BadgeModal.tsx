import React from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import { Repository } from '../../../types';
import ButtonCopyToClipboard from '../../common/ButtonCopyToClipboard';
import Modal from '../../common/Modal';
import styles from './TransferModal.module.css';

interface Props {
  open: boolean;
  repository: Repository;
  onClose: () => void;
}

const BadgeModal = (props: Props) => {
  const origin = window.location.origin;
  const badgeImage = `https://img.shields.io/endpoint?url=${origin}/badge/repository/${props.repository.name}`;
  const badgeLink = `[![Artifact HUB](${badgeImage})](${origin}/packages/search?repo=${props.repository.name})`;

  const onCloseModal = () => {
    props.onClose();
  };

  return (
    <Modal
      header={<div className={`h3 m-2 ${styles.title}`}>Get badge</div>}
      open={props.open}
      modalClassName={styles.modal}
      onClose={onCloseModal}
    >
      <div className="my-5 mw-100" data-testid="badgeModalContent">
        <div className="d-flex flex-row align-items-center justify-content-between mb-2">
          <div>
            <img src={badgeImage} alt="Artifact HUB badge" />
          </div>
          <ButtonCopyToClipboard text={badgeLink} />
        </div>

        <SyntaxHighlighter
          language="bash"
          style={docco}
          customStyle={{
            backgroundColor: 'var(--color-1-10)',
          }}
        >
          {badgeLink}
        </SyntaxHighlighter>
      </div>
    </Modal>
  );
};

export default BadgeModal;
