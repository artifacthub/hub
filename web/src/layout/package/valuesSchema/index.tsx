import merger from 'json-schema-merge-allof';
import isUndefined from 'lodash/isUndefined';
import { useEffect, useState } from 'react';
import { CgListTree } from 'react-icons/cg';
import { useLocation, useNavigate } from 'react-router-dom';

import API from '../../../api';
import { JSONSchema } from '../../../jsonschema';
import alertDispatcher from '../../../utils/alertDispatcher';
import dereferenceJSONSchema from '../../../utils/dereference';
import ErrorBoundary from '../../common/ErrorBoundary';
import Modal from '../../common/Modal';
import Schema from './Schema';
import styles from './ValuesSchema.module.css';

interface Props {
  packageId: string;
  version: string;
  normalizedName: string;
  visibleValuesSchema: boolean;
  visibleValuesSchemaPath?: string | null;
}

async function enrichValuesSchema(schema: JSONSchema) {
  try {
    const dereferencedSchema = dereferenceJSONSchema(schema);
    // Merge schemas combined using allOf.
    const mergedSchema = merger(dereferencedSchema);

    return mergedSchema;
  } catch {
    return schema;
  }
}

const ValuesSchema = (props: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  const [valuesSchema, setValuesSchema] = useState<JSONSchema | undefined | null>();
  const [currentPkgId, setCurrentPkgId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const cleanUrl = () => {
    navigate('', {
      state: location.state,
      replace: true,
    });
  };

  async function getValuesSchema() {
    try {
      setIsLoading(true);
      const schema = await API.getValuesSchema(props.packageId, props.version);
      setCurrentPkgId(props.packageId);
      setValuesSchema(await enrichValuesSchema(schema));
      setIsLoading(false);
      setOpenStatus(true);
    } catch {
      setValuesSchema(null);
      alertDispatcher.postAlert({
        type: 'danger',
        message: 'An error occurred getting the values schema, please try again later.',
      });
      setIsLoading(false);
      cleanUrl();
    }
  }

  const onOpenModal = () => {
    getValuesSchema();
    navigate(`?modal=values-schema${props.visibleValuesSchemaPath ? `&path=${props.visibleValuesSchemaPath}` : ''}`, {
      state: location.state,
      replace: true,
    });
  };

  const onPathChange = (path?: string) => {
    navigate(`?modal=values-schema${path ? `&path=${path}` : ''}`, {
      state: location.state,
      replace: true,
    });
  };

  const onCloseModal = () => {
    setValuesSchema(undefined);
    setOpenStatus(false);
    cleanUrl();
  };

  useEffect(() => {
    if (props.visibleValuesSchema && !openStatus && isUndefined(currentPkgId)) {
      onOpenModal();
    }
  }, []);

  useEffect(() => {
    if ((openStatus || props.visibleValuesSchema) && !isUndefined(currentPkgId)) {
      onCloseModal();
    }
  }, [props.packageId]);

  return (
    <>
      <button
        className="btn btn-outline-secondary btn-sm w-100"
        onClick={onOpenModal}
        aria-label="Open values schema modal"
      >
        <div className="d-flex flex-row align-items-center justify-content-center text-uppercase">
          {isLoading ? (
            <>
              <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
              <span className="ms-2 fw-bold">Getting schema...</span>
            </>
          ) : (
            <>
              <CgListTree className="me-2" />
              <span className="fw-bold">Values Schema</span>
            </>
          )}
        </div>
      </button>

      {openStatus && valuesSchema && (
        <Modal
          modalDialogClassName={styles.modalDialog}
          modalClassName="h-100"
          header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Values schema reference</div>}
          onClose={onCloseModal}
          open={openStatus}
          breakPoint="md"
          footerClassName={styles.modalFooter}
        >
          <ErrorBoundary message="Something went wrong rendering the VALUES SCHEMA of this package.">
            <div className="mb-3 mx-3 mw-100">
              <Schema
                schema={valuesSchema}
                normalizedName={props.normalizedName}
                visibleValuesSchemaPath={props.visibleValuesSchemaPath}
                onPathChange={onPathChange}
              />
              <div className="row">
                <div className={`col-7 pt-3 border border-1 border-top-0 ${styles.endCode}`} />
              </div>
            </div>
          </ErrorBoundary>
        </Modal>
      )}
    </>
  );
};

export default ValuesSchema;
