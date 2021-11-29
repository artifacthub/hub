import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import { Repository } from '../../../types';
import getMetaTag from '../../../utils/getMetaTag';
import ButtonCopyToClipboard from '../../common/ButtonCopyToClipboard';
import Modal from '../../common/Modal';
import Tabs from '../../common/Tabs';
import styles from './BadgeModal.module.css';

interface Props {
  open: boolean;
  repository: Repository;
  onClose: () => void;
}

const BadgeModal = (props: Props) => {
  const siteName = getMetaTag('siteName');
  const origin = window.location.origin;
  const badgeImage = `https://img.shields.io/endpoint?url=${origin}/badge/repository/${props.repository.name}`;
  const markdownLink = `[![${siteName}](${badgeImage})](${origin}/packages/search?repo=${props.repository.name})`;
  const asciiLink = `${origin}/packages/search?repo=${props.repository.name}[image:${badgeImage}[${siteName}]]`;

  const onCloseModal = () => {
    props.onClose();
  };

  return (
    <Modal
      header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Get badge</div>}
      open={props.open}
      onClose={onCloseModal}
    >
      <div data-testid="badgeModalContent">
        <Tabs
          tabs={[
            {
              name: 'markdown',
              title: 'Markdown',
              content: (
                <>
                  <div className="d-flex flex-row align-items-center justify-content-between mb-2">
                    <div>
                      <img src={badgeImage} alt="Artifact HUB badge" />
                    </div>
                    <ButtonCopyToClipboard text={markdownLink} label="Copy badge markdown link to clipboard" />
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
              ),
            },
            {
              name: 'ascii',
              title: 'AsciiDoc',
              content: (
                <>
                  <div className="d-flex flex-row align-items-center justify-content-between mb-2">
                    <div>
                      <img src={badgeImage} alt="Artifact HUB badge" />
                    </div>
                    <ButtonCopyToClipboard text={asciiLink} label="Copy badge Ascii link to clipboard" />
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
              ),
            },
          ]}
          active="markdown"
          noDataContent="Sorry, the information for this is missing."
        />
      </div>
    </Modal>
  );
};

export default BadgeModal;
