import classnames from 'classnames';
import React, { useState } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import { Repository } from '../../../types';
import ButtonCopyToClipboard from '../../common/ButtonCopyToClipboard';
import Modal from '../../common/Modal';
import NoData from '../../common/NoData';
import styles from './BadgeModal.module.css';

interface Props {
  open: boolean;
  repository: Repository;
  onClose: () => void;
}

interface Tab {
  name: string;
  title: string;
}

const TABS: Tab[] = [
  {
    name: 'markdown',
    title: 'Markdown',
  },
  { name: 'ascii', title: 'AsciiDoc' },
];
const ACTIVE_TAB: string = 'markdown';

const BadgeModal = (props: Props) => {
  const [activeTab, setActiveTab] = useState(ACTIVE_TAB);
  const origin = window.location.origin;
  const badgeImage = `https://img.shields.io/endpoint?url=${origin}/badge/repository/${props.repository.name}`;

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
      <div data-testid="badgeModalContent">
        <div>
          <ul className={`nav nav-tabs ${styles.tabs}`}>
            {TABS.map((tab: Tab) => (
              <li className="nav-item" key={tab.name}>
                <button
                  className={classnames(
                    'btn btn-link nav-item',
                    styles.btn,
                    {
                      'text-secondary': tab.name !== activeTab,
                    },
                    {
                      [`active btn-primary ${styles.active}`]: tab.name === activeTab,
                    }
                  )}
                  onClick={() => setActiveTab(tab.name)}
                  data-testid="tabBtn"
                >
                  {tab.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="tab-content mt-3">
          {(() => {
            switch (activeTab) {
              case 'markdown':
                const markdownLink = `[![Artifact HUB](${badgeImage})](${origin}/packages/search?repo=${props.repository.name})`;
                return (
                  <>
                    <div className="d-flex flex-row align-items-center justify-content-between mb-2">
                      <div>
                        <img src={badgeImage} alt="Artifact HUB badge" />
                      </div>
                      <ButtonCopyToClipboard text={markdownLink} />
                    </div>

                    <SyntaxHighlighter
                      language="bash"
                      style={docco}
                      customStyle={{
                        backgroundColor: 'var(--color-1-10)',
                      }}
                    >
                      {markdownLink}
                    </SyntaxHighlighter>
                  </>
                );
              case 'ascii':
                const asciiLink = `${origin}/packages/search?repo=${props.repository.name}[image:${badgeImage}[Artifact HUB]]`;
                return (
                  <>
                    <div className="d-flex flex-row align-items-center justify-content-between mb-2">
                      <div>
                        <img src={badgeImage} alt="Artifact HUB badge" />
                      </div>
                      <ButtonCopyToClipboard text={asciiLink} />
                    </div>

                    <SyntaxHighlighter
                      language="bash"
                      style={docco}
                      customStyle={{
                        backgroundColor: 'var(--color-1-10)',
                      }}
                    >
                      {asciiLink}
                    </SyntaxHighlighter>
                  </>
                );
              default:
                return (
                  <div className="tab-pane fade show active">
                    <NoData>Sorry, the information for this is missing.</NoData>
                  </div>
                );
            }
          })()}
        </div>
      </div>
    </Modal>
  );
};

export default BadgeModal;
