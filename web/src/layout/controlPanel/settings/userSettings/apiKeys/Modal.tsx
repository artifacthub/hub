import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useEffect, useRef, useState } from 'react';
import { FaPencilAlt } from 'react-icons/fa';
import { MdAddCircle } from 'react-icons/md';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import { API } from '../../../../../api';
import { APIKey, APIKeyCode, ErrorKind, RefInputField } from '../../../../../types';
import ButtonCopyToClipboard from '../../../../common/ButtonCopyToClipboard';
import ExternalLink from '../../../../common/ExternalLink';
import InputField from '../../../../common/InputField';
import Modal from '../../../../common/Modal';
import SmallTitle from '../../../../common/SmallTitle';
import styles from './Modal.module.css';

interface Props {
  open: boolean;
  apiKey?: APIKey;
  onSuccess: () => void;
  onClose: () => void;
  onAuthError: () => void;
}

interface FormValidation {
  isValid: boolean;
  apiKey: APIKey | null;
}

const APIKeyModal = (props: Props) => {
  const form = useRef<HTMLFormElement>(null);
  const nameInput = useRef<RefInputField>(null);
  const [isSending, setIsSending] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [apiKey, setApiKey] = useState<APIKey | undefined>(props.apiKey);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiKeyCode, setApiKeyCode] = useState<APIKeyCode | undefined>(undefined);

  // Clean API error when form is focused after validation
  const cleanApiError = () => {
    if (!isNull(apiError)) {
      setApiError(null);
    }
  };

  const onCloseModal = () => {
    setApiKey(undefined);
    setApiKeyCode(undefined);
    setIsValidated(false);
    setApiError(null);
    props.onClose();
  };

  async function handleAPIKey(name: string) {
    try {
      if (props.apiKey) {
        await API.updateAPIKey(props.apiKey.apiKeyId!, name);
      } else {
        setApiKeyCode(await API.addAPIKey(name));
      }
      if (props.onSuccess) {
        props.onSuccess();
      }
      setIsSending(false);

      // Modal is closed only when updating API key
      if (props.apiKey) {
        onCloseModal();
      }
    } catch (err) {
      setIsSending(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        setApiError(
          `An error occurred ${isUndefined(props.apiKey) ? 'adding' : 'updating'} the API key, please try again later.`
        );
      } else {
        props.onAuthError();
      }
    }
  }

  const submitForm = () => {
    cleanApiError();
    setIsSending(true);
    if (form.current) {
      const { isValid, apiKey } = validateForm(form.current);
      if (isValid && apiKey) {
        handleAPIKey(apiKey.name);
      } else {
        setIsSending(false);
      }
    }
  };

  const validateForm = (form: HTMLFormElement): FormValidation => {
    let apiKey: APIKey | null = null;
    const formData = new FormData(form);
    const isValid = form.checkValidity();

    if (isValid) {
      apiKey = {
        name: formData.get('name') as string,
      };
    }

    setIsValidated(true);
    return { isValid, apiKey };
  };

  const handleOnReturnKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter' && form) {
      event.preventDefault();
      event.stopPropagation();
      submitForm();
    }
  };

  useEffect(() => {
    async function getAPIKey() {
      try {
        const currentAPIKey = await API.getAPIKey(props.apiKey!.apiKeyId!);
        setApiKey(currentAPIKey);
        nameInput.current!.updateValue(currentAPIKey.name);
      } catch (err) {
        if (err.kind === ErrorKind.Unauthorized) {
          props.onAuthError();
        }
      }
    }

    if (props.apiKey && isUndefined(apiKey)) {
      getAPIKey();
    }
  }, [apiKey, props, props.apiKey]);

  const sendBtn = (
    <button
      data-testid="apiKeyFormBtn"
      className="btn btn-sm btn-secondary"
      type="button"
      disabled={isSending}
      onClick={submitForm}
    >
      {isSending ? (
        <>
          <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
          <span className="ml-2">{`${props.apiKey ? 'Updating' : 'Adding'} API key`}</span>
        </>
      ) : (
        <div className="d-flex flex-row align-items-center text-uppercase">
          {isUndefined(props.apiKey) ? (
            <>
              <MdAddCircle className="mr-2" />
              <div>Add</div>
            </>
          ) : (
            <>
              <FaPencilAlt className="mr-2" />
              <div>Update</div>
            </>
          )}
        </div>
      )}
    </button>
  );

  return (
    <Modal
      header={
        <div className={`h3 m-2 flex-grow-1 ${styles.title}`}>{`${props.apiKey ? 'Update' : 'Add'} API key`}</div>
      }
      open={props.open}
      modalClassName={styles.modal}
      closeButton={isUndefined(apiKeyCode) ? sendBtn : undefined}
      onClose={onCloseModal}
      error={apiError}
      cleanError={cleanApiError}
    >
      <div className={`w-100 ${styles.contentWrapper}`}>
        {apiKeyCode ? (
          <>
            <div className="d-flex justify-content-between mb-2">
              <SmallTitle text="API-KEY-ID" />
              <div>
                <ButtonCopyToClipboard text={apiKeyCode.apiKeyId} />
              </div>
            </div>

            <SyntaxHighlighter
              language="bash"
              style={docco}
              customStyle={{
                backgroundColor: 'var(--color-1-10)',
              }}
            >
              {apiKeyCode.apiKeyId}
            </SyntaxHighlighter>

            <div className="d-flex justify-content-between mb-2">
              <SmallTitle text="API-KEY-SECRET" />
              <div>
                <ButtonCopyToClipboard text={apiKeyCode.secret} />
              </div>
            </div>

            <SyntaxHighlighter
              language="bash"
              style={docco}
              customStyle={{
                backgroundColor: 'var(--color-1-10)',
              }}
            >
              {apiKeyCode.secret}
            </SyntaxHighlighter>

            <small className="text-muted">
              These are the credentials you will need to provide when making requests to the API. Please, copy and store
              them in a safe place.{' '}
              <b>
                <u>You will not be able to see the secret again when you close this window.</u>
              </b>{' '}
              For more information please see the authorize section in the{' '}
              <ExternalLink className="text-muted" href="https://artifacthub.github.io/hub/api">
                <u>API docs</u>
              </ExternalLink>
              .
            </small>

            <div className={`alert alert-warning mt-4 mb-2 ${styles.alert}`}>
              <span className="font-weight-bold text-uppercase">Important:</span> the API key you've just generated can
              be used to perform <u className="font-weight-bold">ANY</u> operation you can, so please store it safely
              and don't share it with others.
            </div>
          </>
        ) : (
          <form
            data-testid="apiKeyForm"
            ref={form}
            className={classnames('w-100 mt-3', { 'needs-validation': !isValidated }, { 'was-validated': isValidated })}
            onFocus={cleanApiError}
            autoComplete="on"
            noValidate
          >
            <InputField
              ref={nameInput}
              type="text"
              label="Name"
              labelLegend={<small className="ml-1 font-italic">(Required)</small>}
              name="name"
              value={isUndefined(apiKey) ? '' : apiKey.name}
              invalidText={{
                default: 'This field is required',
              }}
              autoComplete="off"
              onKeyDown={handleOnReturnKeyDown}
              required
            />
          </form>
        )}
      </div>
    </Modal>
  );
};

export default APIKeyModal;
