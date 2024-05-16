import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { KeyboardEvent, useContext, useRef, useState } from 'react';
import { MdAddCircle } from 'react-icons/md';

import API from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { ErrorKind, Member, RefInputField, ResourceKind } from '../../../types';
import InputField from '../../common/InputField';
import Modal from '../../common/Modal';
import styles from './Modal.module.css';

interface FormValidation {
  isValid: boolean;
  alias?: string;
}

interface Props {
  open: boolean;
  membersList: Member[] | undefined;
  onSuccess?: () => void;
  onClose: () => void;
  onAuthError: () => void;
}

const MemberModal = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const aliasInput = useRef<RefInputField>(null);
  const form = useRef<HTMLFormElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
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
      await API.addOrganizationMember(ctx.prefs.controlPanel.selectedOrg!, alias);
      if (!isUndefined(props.onSuccess)) {
        props.onSuccess();
      }
      setIsSending(false);
      onCloseModal();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setIsSending(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        let errorMessage = 'An error occurred adding the new member, please try again later.';
        if (err.kind === ErrorKind.Forbidden) {
          errorMessage = 'You do not have permissions to add a new member to the organization.';
        }
        setApiError(errorMessage);
      } else {
        props.onAuthError();
      }
    }
  }

  const submitForm = () => {
    cleanApiError();
    setIsSending(true);
    if (form.current) {
      validateForm(form.current).then((validation: FormValidation) => {
        if (validation.isValid && !isUndefined(validation.alias)) {
          handleOrganizationMember(validation.alias);
        } else {
          setIsSending(false);
        }
      });
    }
  };

  const validateForm = async (form: HTMLFormElement): Promise<FormValidation> => {
    let alias: undefined | string;

    return aliasInput.current!.checkIsValid().then((isValid: boolean) => {
      if (isValid) {
        const formData = new FormData(form);
        alias = formData.get('alias') as string;
      }
      setIsValidated(true);
      return { isValid: isValid, alias };
    });
  };

  const handleOnReturnKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter' && !isNull(form)) {
      event.preventDefault();
      event.stopPropagation();
      submitForm();
    }
  };

  const getMembers = (): string[] => {
    let members: string[] = [];
    if (!isUndefined(props.membersList)) {
      members = props.membersList.map((member: Member) => member.alias);
    }
    return members;
  };

  return (
    <Modal
      header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Add member</div>}
      open={props.open}
      modalClassName={styles.modal}
      closeButton={
        <button
          className="btn btn-sm btn-outline-secondary"
          type="button"
          disabled={isSending}
          onClick={submitForm}
          aria-label="Invite member"
        >
          {isSending ? (
            <>
              <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
              <span className="ms-2">Inviting member</span>
            </>
          ) : (
            <div className="d-flex flex-row align-items-center text-uppercase">
              <MdAddCircle className="me-2" />
              <div>Invite</div>
            </div>
          )}
        </button>
      }
      onClose={onCloseModal}
      error={apiError}
      cleanError={cleanApiError}
    >
      <div className="w-100">
        <form
          data-testid="membersForm"
          ref={form}
          className={classnames('w-100', { 'needs-validation': !isValidated }, { 'was-validated': isValidated })}
          onFocus={cleanApiError}
          autoComplete="on"
          noValidate
        >
          <InputField
            ref={aliasInput}
            type="text"
            label="Username"
            labelLegend={<small className="ms-1 fst-italic">(Required)</small>}
            name="alias"
            value=""
            invalidText={{
              default: 'This field is required',
              customError: 'User not found',
              excluded: 'This user is already a member of the organization',
            }}
            checkAvailability={{
              isAvailable: false,
              resourceKind: ResourceKind.userAlias,
              excluded: [],
            }}
            excludedValues={getMembers()}
            autoComplete="off"
            onKeyDown={handleOnReturnKeyDown}
            additionalInfo={
              <small className="text-muted text-break mt-1">
                <p>The user must be previously registered</p>
              </small>
            }
            required
          />
        </form>
      </div>
    </Modal>
  );
};

export default MemberModal;
