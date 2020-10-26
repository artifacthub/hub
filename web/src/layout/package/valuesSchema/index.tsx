import { JSONSchema } from '@apidevtools/json-schema-ref-parser';
import React, { useEffect, useState } from 'react';
import { CgListTree } from 'react-icons/cg';
import { useHistory } from 'react-router-dom';

import { API } from '../../../api';
import alertDispatcher from '../../../utils/alertDispatcher';
import Modal from '../../common/Modal';
import Schema from './Schema';
import styles from './ValuesSchema.module.css';

interface Props {
  packageId: string;
  version: string;
  visibleValuesSchema: boolean;
}

const ValuesSchema = (props: Props) => {
  const history = useHistory();
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  const [valuesSchema, setValuesSchema] = useState<JSONSchema | undefined | null>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  async function getValuesSchema() {
    try {
      setIsLoading(true);
      const schema = await API.getValuesSchema(props.packageId, props.version);
      setValuesSchema(schema);
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
    if (valuesSchema) {
      setOpenStatus(true);
    } else {
      getValuesSchema();
    }
    history.replace({
      search: '?modal=values-schema',
    });
  };

  const onCloseModal = () => {
    setOpenStatus(false);
    history.replace({
      search: '',
    });
  };

  useEffect(() => {
    if (props.visibleValuesSchema && !openStatus) {
      onOpenModal();
    }
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <>
      <button className="btn btn-primary btn-block my-3" onClick={onOpenModal}>
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

      {openStatus && valuesSchema && (
        <Modal
          modalDialogClassName={styles.modalDialog}
          modalClassName="h-100"
          header={<div className={`h3 m-2 ${styles.title}`}>Values schema reference</div>}
          onClose={onCloseModal}
          open={openStatus}
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
