import { isNull, isUndefined } from 'lodash';
import React, { useEffect, useState } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { tomorrowNight } from 'react-syntax-highlighter/dist/cjs/styles/hljs';
import YAML from 'yaml';

import { CustomResourcesDefinition } from '../../types';
import ButtonCopyToClipboard from '../common/ButtonCopyToClipboard';
import Modal from '../common/Modal';
import styles from './CustomResourceDefinition.module.css';

interface Props {
  resources?: CustomResourcesDefinition[];
}

const CustomResourceDefinition = (props: Props) => {
  const [selectedCustomResourceDef, setSelectedCustomResourceDef] = useState<CustomResourcesDefinition | null>(null);
  const [yamlExample, setYamlExample] = useState<string | undefined>(undefined);

  useEffect(() => {
    const getYAMLExample = (): string | undefined => {
      let yamlExample: string | undefined;
      if (!isNull(selectedCustomResourceDef) && !isUndefined(selectedCustomResourceDef.example)) {
        yamlExample = YAML.stringify(selectedCustomResourceDef.example);
      }
      return yamlExample;
    };

    if (!isNull(selectedCustomResourceDef)) {
      setYamlExample(getYAMLExample());
    } else {
      setYamlExample(undefined);
    }
  }, [selectedCustomResourceDef]);

  if (isUndefined(props.resources)) return null;

  return (
    <div className="row mt-4">
      {props.resources.map((resourceDefinition: CustomResourcesDefinition) => {
        return (
          <div className="col-12 col-lg-6 mb-4" key={`resourceDef_${resourceDefinition.kind}`}>
            <div className="card h-100" data-testid="resourceDefinition">
              <div className="card-body d-flex flex-column">
                <h6 className="card-title mb-3">{resourceDefinition.displayName || resourceDefinition.name}</h6>
                <small className={`card-text text-muted overflow-hidden ${styles.lineClamp}`}>
                  {resourceDefinition.description.replace('\n', ' ')}
                </small>

                <div className="mt-auto d-flex flex-column">
                  <div className={`separator ${styles.separator}`} />

                  <div className={`w-100 ${styles.extraInfo}`}>
                    <div className="d-flex flex-row align-items-baseline">
                      <small className="text-muted text-uppercase mr-1">Kind:</small>
                      <span className="text-truncate">{resourceDefinition.kind}</span>
                    </div>

                    <div className="d-flex flex-row align-items-baseline">
                      <small className="text-muted text-uppercase mr-1">Name:</small>
                      <span className="text-truncate">{resourceDefinition.name}</span>
                    </div>

                    <div className="d-flex flex-row align-items-baseline">
                      <small className="text-muted text-uppercase mr-1">Version:</small>
                      <span className="text-truncate">{resourceDefinition.version}</span>
                    </div>
                  </div>

                  {!isUndefined(resourceDefinition.example) && (
                    <div className="text-right mt-1">
                      <button
                        data-testid="resourceDefinitionBtn"
                        className="font-weight-bold btn btn-link btn-sm px-0 text-secondary"
                        onClick={() =>
                          setSelectedCustomResourceDef(
                            resourceDefinition === selectedCustomResourceDef ? null : resourceDefinition
                          )
                        }
                      >
                        View YAML example
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {!isNull(selectedCustomResourceDef) && !isUndefined(yamlExample) && (
        <div className="mt-auto ml-auto">
          <Modal
            modalDialogClassName={styles.modalDialog}
            className={`d-inline-block mt-1 ${styles.modal}`}
            header={
              <div className={`h4 m-2 ${styles.title}`}>{`${
                selectedCustomResourceDef.displayName || selectedCustomResourceDef.name
              } - YAML example`}</div>
            }
            onClose={() => setSelectedCustomResourceDef(null)}
            open
          >
            <div className="my-3 mw-100">
              <div className="text-right">
                <ButtonCopyToClipboard
                  text={yamlExample}
                  className={`btn-link border-0 text-secondary font-weight-bold ${styles.copyBtn}`}
                  visibleBtnText
                />
              </div>

              <div className="my-3">
                <SyntaxHighlighter
                  language="yaml"
                  style={tomorrowNight}
                  customStyle={{ padding: '1.5rem' }}
                  lineNumberStyle={{ color: 'gray', marginRight: '15px' }}
                  showLineNumbers
                >
                  {yamlExample}
                </SyntaxHighlighter>
              </div>
            </div>
          </Modal>
        </div>
      )}
    </div>
  );
};

export default CustomResourceDefinition;
