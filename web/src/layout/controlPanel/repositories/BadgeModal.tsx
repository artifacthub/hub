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
  const badgeImage = `https://img.shields.io/static/v1?style=flat&label=Artifact%20HUB&labelColor=659dbd&color=39596c&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNCIgaGVpZ2h0PSIxNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0iZmVhdGhlciBmZWF0aGVyLWhleGFnb24iPjxwYXRoIGQ9Ik0yMSAxNlY4YTIgMiAwIDAgMC0xLTEuNzNsLTctNGEyIDIgMCAwIDAtMiAwbC03IDRBMiAyIDAgMCAwIDMgOHY4YTIgMiAwIDAgMCAxIDEuNzNsNyA0YTIgMiAwIDAgMCAyIDBsNy00QTIgMiAwIDAgMCAyMSAxNnoiPjwvcGF0aD48L3N2Zz4K&logoWidth=18&message=${props.repository.name}`;
  const badgeLink = `[![Artifact HUB](${badgeImage})](${window.location.origin}/packages/search?repo=${props.repository.name})`;

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
