import $RefParser, { JSONSchema } from '@apidevtools/json-schema-ref-parser';
import classnames from 'classnames';
import React, { useEffect, useState } from 'react';
import { CgListTree } from 'react-icons/cg';
import { useHistory } from 'react-router-dom';

import { API } from '../../../api';
import { SearchFiltersURL } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
import ElementWithTooltip from '../../common/ElementWithTooltip';
import Modal from '../../common/Modal';
import Schema from './Schema';
import styles from './ValuesSchema.module.css';

interface Props {
  packageId: string;
  version: string;
  visibleValuesSchema: boolean;
  hasValuesSchema?: boolean;
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
}
const ValuesSchema = (props: Props) => {
  const history = useHistory();
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  const [valuesSchema, setValuesSchema] = useState<JSONSchema | undefined | null>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentVersion, setCurrentVersion] = useState<string>(props.version);
  const [currentPkgId, setCurrentPkgId] = useState<string>(props.packageId);

  async function getValuesSchema() {
    try {
      setIsLoading(true);
      const schema = await API.getValuesSchema(props.packageId, props.version);
      setCurrentPkgId(props.packageId);
      setCurrentVersion(props.version);
      try {
        let defs = await $RefParser.dereference(schema);
        setValuesSchema(defs);
      } catch (err) {
        setValuesSchema(schema);
      }
      setIsLoading(false);
      setOpenStatus(true);
    } catch {
      setValuesSchema(null);
      alertDispatcher.postAlert({
        type: 'danger',
        message: 'An error occurred getting the values schema, please try again later.',
      });
      setIsLoading(false);
    }
  }

  const onOpenModal = () => {
    if (props.hasValuesSchema) {
      if (valuesSchema && props.version === currentVersion && props.packageId === currentPkgId) {
        setOpenStatus(true);
      } else {
        getValuesSchema();
      }
      history.replace({
        search: '?modal=values-schema',
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
    if (props.visibleValuesSchema && !openStatus) {
      if (props.hasValuesSchema) {
        onOpenModal();
      } else {
        history.replace({
          search: '',
          state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
        });
      }
    }
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <>
      <ElementWithTooltip
        element={
          <button
            data-testid="valuesSchemaBtn"
            className={classnames('btn btn-secondary btn-block btn-sm', {
              disabled: !props.hasValuesSchema,
            })}
            onClick={onOpenModal}
          >
            <div className="d-flex flex-row align-items-center justify-content-center text-uppercase">
              {isLoading ? (
                <>
                  <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                  <span className="ml-2 font-weight-bold">Getting schema...</span>
                </>
              ) : (
                <>
                  <CgListTree className="mr-2" />
                  <span className="font-weight-bold">Values Schema</span>
                </>
              )}
            </div>
          </button>
        }
        visibleTooltip={!props.hasValuesSchema}
        tooltipClassName={styles.tooltip}
        tooltipMessage="This package version does not include a values.schema.json file."
        active
      />

      {openStatus && valuesSchema && (
        <Modal
          modalDialogClassName={styles.modalDialog}
          modalClassName="h-100"
          header={<div className={`h3 m-2 ${styles.title}`}>Values schema reference</div>}
          onClose={onCloseModal}
          open={openStatus}
          breakPoint="md"
        >
          <div className="m-3 mw-100">
            <Schema schema={valuesSchema} />
            <div className="row">
              <div className="col-7 pt-3 bg-dark" />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default ValuesSchema;
