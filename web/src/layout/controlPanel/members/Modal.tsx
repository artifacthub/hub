import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useRef, useState } from 'react';

import { API } from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { ResourceKind } from '../../../types';
import InputField from '../../common/InputField';
import Modal from '../../common/Modal';
import styles from './Modal.module.css';

interface FormValidation {
  isValid: boolean;
  alias?: string;
}

interface Props {
  open: boolean;
  onSuccess?: () => void;
  onClose: () => void;
  onAuthError: () => void;
}

const MemberModal = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const form = useRef<HTMLFormElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [isValidatingField, setIsValidatingField] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Clean API error when form is focused after validation
  const cleanApiError = () => {
    if (!isNull(apiError)) {
      setApiError(null);
    }
  };

  const onCloseModal = () => {
    props.onClose();
  };

  async function handleOrganizationMember(alias: string) {
    try {
      await API.addOrganizationMember(ctx.org!.name, alias);
      if (!isUndefined(props.onSuccess)) {
        props.onSuccess();
      }
      setIsSending(false);
      onCloseModal();
    } catch (err) {
      setIsSending(false);
      if (err.statusText !== 'ErrLoginRedirect') {
        setApiError('An error occurred adding the new member, please try again later');
      } else {
        props.onAuthError();
      }
    }
  }

  const submitForm = () => {
    if (!isValidatingField) {
      cleanApiError();
      setIsSending(true);
      if (form.current) {
        const { isValid, alias } = validateForm(form.current);
        if (isValid && !isUndefined(alias)) {
          handleOrganizationMember(alias);
        } else {
          setIsSending(false);
        }
      }
    }
  };

  const validateForm = (form: HTMLFormElement): FormValidation => {
    let isValid = form.checkValidity();
    let alias;

    if (isValid) {
      const formData = new FormData(form);
      alias = formData.get('alias') as string;
    } else {
      setIsValidated(true);
    }
    return { isValid, alias };
  };

  const handleOnReturnKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter' && !isNull(form)) {
      event.preventDefault();
      // submitForm();
    }
  };

  return (
    <Modal
      header={<div className="h3 m-2">Add member</div>}
      open={props.open}
      modalClassName={styles.modal}
      closeButton={
        <button className="btn btn-secondary" type="button" disabled={isSending} onClick={submitForm}>
          {isSending ? (
            <>
              <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
              <span className="ml-2">Inviting member</span>
            </>
          ) : (
            <>Invite</>
          )}
        </button>
      }
      onClose={onCloseModal}
      error={apiError}
      cleanError={cleanApiError}
    >
      <div className="w-100">
        <form
          ref={form}
          className={classnames('w-100', { 'needs-validation': !isValidated }, { 'was-validated': isValidated })}
          onFocus={cleanApiError}
          autoComplete="on"
          noValidate
        >
          <InputField
            type="text"
            label="Username"
            labelLegend={<small className="ml-1 font-italic">(Required)</small>}
            name="alias"
            value=""
            invalidText={{
              default: 'This field is required',
              customError: 'User not found',
            }}
            isValidResource={ResourceKind.userAlias}
            setValidationStatus={setIsValidatingField}
            validateOnBlur
            autoComplete="off"
            onKeyDown={handleOnReturnKeyDown}
            required
          />
        </form>
      </div>
    </Modal>
  );
};

export default MemberModal;
