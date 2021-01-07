import React, { useState } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { tomorrowNight } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import { FalcoRules, OPAPolicies, RepositoryKind } from '../../types';
import BlockCodeButtons from '../common/BlockCodeButtons';
import Modal from '../common/Modal';
import styles from './ResourcesList.module.css';

interface Props {
  resources: OPAPolicies | FalcoRules;
  normalizedName: string;
  kind: RepositoryKind.OPA | RepositoryKind.Falco;
}

interface SelectedResource {
  name: string;
  filename: string;
}

const ResourcesList = (props: Props) => {
  const [selectedResource, setSelectedResource] = useState<SelectedResource | null>(null);

  return (
    <div className={styles.wrapper}>
      <div className="d-flex flex-wrap mt-4">
        {Object.keys(props.resources).map((resource: string, index: number) => {
          const pathFile = resource.split('/');
          const fileName = pathFile.pop();
          const path = pathFile.join('/');
          const isSelected = selectedResource && selectedResource.filename === fileName;

          return (
            <div className="col-12 col-lg-6 col-xxl-4 mb-4" key={`resource_${index}`}>
              <div className={`card h-100 ${styles.card}`} data-testid="resourceCard">
                <div className="card-body d-flex flex-column">
                  <div className="d-flex flex-row align-items-baseline">
                    <small className="text-muted text-uppercase mr-1">File:</small>
                    <span className="text-truncate">{fileName}</span>
                  </div>

                  {path !== '' && (
                    <div className="d-flex flex-row align-items-baseline">
                      <small className="text-muted text-uppercase mr-1">Path:</small>
                      <span className="text-truncate">{path}</span>
                    </div>
                  )}

                  <div className="mt-auto d-flex flex-column align-items-end">
                    <div className={`separator ${styles.separator}`} />

                    <button
                      data-testid="resourceBtn"
                      className="font-weight-bold btn btn-link btn-sm px-0 text-secondary"
                      onClick={() =>
                        setSelectedResource(isSelected ? null : { name: resource, filename: fileName as string })
                      }
                    >
                      View {props.kind === RepositoryKind.Falco ? 'rules file' : 'Policy'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedResource && (
        <div className="mt-auto ml-auto">
          <Modal
            modalDialogClassName={styles.modalDialog}
            className={`d-inline-block mt-1 ${styles.modal}`}
            header={
              <div className={`h4 m-2 flex-grow-1 ${styles.title}`}>
                {props.kind === RepositoryKind.Falco ? 'Rules' : 'Policy'} file:{' '}
                <span className="text-muted">{selectedResource.name}</span>
              </div>
            }
            onClose={() => setSelectedResource(null)}
            open
          >
            <div className="mw-100">
              <>
                <div className="position-relative">
                  <BlockCodeButtons
                    filename={`${props.normalizedName}-${selectedResource.filename}`}
                    content={props.resources[selectedResource.name]}
                  />

                  <SyntaxHighlighter
                    language={props.kind === RepositoryKind.Falco ? 'yaml' : 'text'}
                    style={tomorrowNight}
                    customStyle={{ padding: '1.5rem', marginBottom: '0' }}
                    lineNumberStyle={{ color: 'gray', marginRight: '15px' }}
                    showLineNumbers
                  >
                    {props.resources[selectedResource.name]}
                  </SyntaxHighlighter>
                </div>
              </>
            </div>
          </Modal>
        </div>
      )}
    </div>
  );
};

export default ResourcesList;
