import { isUndefined } from 'lodash';
import React, { useEffect, useState } from 'react';
import { VscListTree } from 'react-icons/vsc';
import { useHistory } from 'react-router-dom';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { tomorrowNight } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import API from '../../../api';
import { ErrorKind, SearchFiltersURL } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
import BlockCodeButtons from '../../common/BlockCodeButtons';
import Modal from '../../common/Modal';
import styles from './Values.module.css';

interface Props {
  packageId: string;
  version: string;
  normalizedName: string;
  visibleValues: boolean;
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
}

const Values = (props: Props) => {
  const history = useHistory();
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  const [values, setValues] = useState<string | undefined | null>();
  const [currentPkgId, setCurrentPkgId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  async function getValues() {
    try {
      setIsLoading(true);
      const data = await API.getChartValues(props.packageId, props.version);
      setValues(data);
      setCurrentPkgId(props.packageId);
      setIsLoading(false);
      setOpenStatus(true);
    } catch (err) {
      if (err.kind === ErrorKind.NotFound) {
        alertDispatcher.postAlert({
          type: 'danger',
          message:
            'We could not find the default values for this chart version. Please check the chart tgz package as they might be missing.',
        });
      } else {
        alertDispatcher.postAlert({
          type: 'danger',
          message: 'An error occurred getting the default values, please try again later.',
        });
      }
      setValues(null);
      setIsLoading(false);
    }
  }

  const onOpenModal = () => {
    getValues();
    history.replace({
      search: '?modal=values',
      state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
    });
  };

  const onCloseModal = () => {
    setValues(undefined);
    setOpenStatus(false);
    history.replace({
      search: '',
      state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
    });
  };

  useEffect(() => {
    if (props.visibleValues && !openStatus && isUndefined(currentPkgId)) {
      onOpenModal();
    }
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    if ((openStatus || props.visibleValues) && !isUndefined(currentPkgId)) {
      onCloseModal();
    }
  }, [props.packageId]); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <>
      <button
        className="btn btn-outline-secondary btn-block btn-sm"
        onClick={onOpenModal}
        aria-label="Open default values modal"
      >
        <div className="d-flex flex-row align-items-center justify-content-center text-uppercase">
          {isLoading ? (
            <>
              <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
              <span className="ml-2 font-weight-bold">Getting values...</span>
            </>
          ) : (
            <>
              <VscListTree className="mr-2" />
              <span className="font-weight-bold">Default values</span>
            </>
          )}
        </div>
      </button>

      {openStatus && values && (
        <Modal
          modalDialogClassName={styles.modalDialog}
          modalClassName="h-100"
          header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Default values</div>}
          onClose={onCloseModal}
          open={openStatus}
          breakPoint="md"
        >
          <div className="mw-100 h-100">
            {values && (
              <div className={`position-relative h-100 overflow-auto ${styles.syntaxWrapper}`}>
                <BlockCodeButtons
                  filename={`values-${props.normalizedName}.yaml`}
                  content={values}
                  tooltipType="light"
                />

                <SyntaxHighlighter
                  language="yaml"
                  style={tomorrowNight}
                  customStyle={{
                    backgroundColor: '#343a40',
                    padding: '1.5rem',
                    lineHeight: '1.25rem',
                    marginBottom: '0',
                    height: '100%',
                    fontSize: '80%',
                  }}
                  lineNumberStyle={{
                    color: '#f8f9fa',
                    opacity: '0.5',
                    marginRight: '5px',
                    fontSize: '0.8rem',
                  }}
                  className="customYAML"
                  useInlineStyles={false}
                >
                  {values}
                </SyntaxHighlighter>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
};

export default Values;
