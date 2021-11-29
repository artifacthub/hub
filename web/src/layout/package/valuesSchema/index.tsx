import $RefParser, { JSONSchema } from '@apidevtools/json-schema-ref-parser';
import merger from 'json-schema-merge-allof';
import { isUndefined } from 'lodash';
import { useEffect, useState } from 'react';
import { CgListTree } from 'react-icons/cg';
import { useHistory } from 'react-router-dom';

import API from '../../../api';
import { SearchFiltersURL } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
import ErrorBoundary from '../../common/ErrorBoundary';
import Modal from '../../common/Modal';
import Schema from './Schema';
import styles from './ValuesSchema.module.css';

interface Props {
  packageId: string;
  version: string;
  normalizedName: string;
  visibleValuesSchema: boolean;
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
  visibleValuesSchemaPath?: string;
}

async function enrichValuesSchema(schema: JSONSchema) {
  try {
    let tmpSchema = { ...schema };
    // When root is a $ref pointing to a definition inside itself, the method dereference (json-schema-ref-parser) doesn't work properly
    // https://github.com/APIDevTools/json-schema-ref-parser/issues/172
    if (tmpSchema['$ref'] && tmpSchema['$ref'].startsWith('#/definitions')) {
      const topLevelObj = tmpSchema['$ref'].split('/').pop();
      delete tmpSchema['$ref'];
      if (topLevelObj && tmpSchema.definitions && tmpSchema.definitions[topLevelObj]) {
        const entryPoint: any = tmpSchema.definitions[topLevelObj];
        tmpSchema = { ...tmpSchema, ...entryPoint };
      }
    }

    // Dereferences all $ref pointers in the JSON Schema, replacing each reference with its resolved value.
    const dereferencedSchema = await $RefParser.dereference(tmpSchema, {
      continueOnError: true,
      dereference: {
        circular: true,
      },
    });

    // Merge schemas combined using allOf.
    const mergedSchema = merger(dereferencedSchema);

    return mergedSchema;
  } catch (err: any) {
    return schema;
  }
}

const ValuesSchema = (props: Props) => {
  const history = useHistory();
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  const [valuesSchema, setValuesSchema] = useState<JSONSchema | undefined | null>();
  const [currentPkgId, setCurrentPkgId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
    }
  }

  const onOpenModal = () => {
    getValuesSchema();
    history.replace({
      search: `?modal=values-schema${props.visibleValuesSchemaPath ? `&path=${props.visibleValuesSchemaPath}` : ''}`,
      state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
    });
  };

  const onPathChange = (path?: string) => {
    history.replace({
      search: `?modal=values-schema${path ? `&path=${path}` : ''}`,
      state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
    });
  };

  const onCloseModal = () => {
    setValuesSchema(undefined);
    setOpenStatus(false);
    history.replace({
      search: '',
      state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
    });
  };

  useEffect(() => {
    if (props.visibleValuesSchema && !openStatus && isUndefined(currentPkgId)) {
      onOpenModal();
    }
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    if ((openStatus || props.visibleValuesSchema) && !isUndefined(currentPkgId)) {
      onCloseModal();
    }
  }, [props.packageId]); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <>
      <button
        className="btn btn-outline-secondary btn-block btn-sm"
        onClick={onOpenModal}
        aria-label="Open values schema modal"
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

      {openStatus && valuesSchema && (
        <Modal
          modalDialogClassName={styles.modalDialog}
          modalClassName="h-100"
          header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Values schema reference</div>}
          onClose={onCloseModal}
          open={openStatus}
          breakPoint="md"
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
                <div className="col-7 pt-3 bg-dark" />
              </div>
            </div>
          </ErrorBoundary>
        </Modal>
      )}
    </>
  );
};

export default ValuesSchema;
