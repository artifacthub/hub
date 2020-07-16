import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useEffect, useRef, useState } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import { API } from '../../../../../api';
import { APIKey, APIKeyCode, ErrorKind, RefInputField } from '../../../../../types';
import ButtonCopyToClipboard from '../../../../common/ButtonCopyToClipboard';
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
      if (!isUndefined(props.apiKey)) {
        await API.updateAPIKey(props.apiKey.apiKeyId!, name);
      } else {
        setApiKeyCode(await API.addAPIKey(name));
      }
      if (!isUndefined(props.onSuccess)) {
        props.onSuccess();
      }
      setIsSending(false);

      // Modal is closed only when updating API key
      if (!isUndefined(props.apiKey)) {
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
      if (isValid && !isNull(apiKey)) {
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
    if (event.key === 'Enter' && !isNull(form)) {
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

    if (!isUndefined(props.apiKey) && isUndefined(apiKey)) {
      getAPIKey();
    }
  }, [apiKey, props, props.apiKey]);

  const sendBtn = (
    <button
      data-testid="apiKeyFormBtn"
      className="btn btn-secondary"
      type="button"
      disabled={isSending}
      onClick={submitForm}
    >
      {isSending ? (
        <>
          <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
          <span className="ml-2">{`${isUndefined(props.apiKey) ? 'Adding' : 'Updating'} API key`}</span>
        </>
      ) : (
        <>{`${isUndefined(props.apiKey) ? 'Add' : 'Update'}`}</>
      )}
    </button>
  );

  return (
    <Modal
      header={
        <div className={`h3 m-2 ${styles.title}`}>{`${isUndefined(props.apiKey) ? 'Add' : 'Update'} API key`}</div>
      }
      open={props.open}
      modalClassName={styles.modal}
      closeButton={isUndefined(apiKeyCode) ? sendBtn : undefined}
      onClose={onCloseModal}
      error={apiError}
      cleanError={cleanApiError}
    >
      <div className={`w-100 ${styles.contentWrapper}`}>
        {!isUndefined(apiKeyCode) ? (
          <>
            <div className="d-flex justify-content-between mb-2">
              <SmallTitle text="Key" />
              <div>
                <ButtonCopyToClipboard text={apiKeyCode.key} />
              </div>
            </div>

            <SyntaxHighlighter
              language="bash"
              style={docco}
              customStyle={{
                backgroundColor: 'var(--color-1-10)',
              }}
            >
              {apiKeyCode.key}
            </SyntaxHighlighter>

            <small className="text-muted">
              This is the key you will need to provide when making requests to the API. Please, copy and store it in a
              safe place.{' '}
              <b>
                <u>You will not be able to see it again once you close this window.</u>
              </b>
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
