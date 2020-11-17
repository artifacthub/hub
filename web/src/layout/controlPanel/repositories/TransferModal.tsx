import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { RiArrowLeftRightLine } from 'react-icons/ri';

import { API } from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { ErrorKind, Organization, Repository } from '../../../types';
import compoundErrorMessage from '../../../utils/compoundErrorMessage';
import Modal from '../../common/Modal';
import styles from './TransferModal.module.css';

interface Props {
  open: boolean;
  repository: Repository;
  onSuccess?: () => void;
  onClose: () => void;
  onAuthError: () => void;
}

const TransferRepositoryModal = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const form = useRef<HTMLFormElement>(null);
  const [isFetchingOrgs, setIsFetchingOrgs] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const organizationName = ctx.prefs.controlPanel.selectedOrg;
  const [selectedTransferOption, setSelectedTransferOption] = useState<'org' | 'user'>(
    isUndefined(organizationName) ? 'org' : 'user'
  );
  const [orgToTransfer, setOrgToTransfer] = useState<string | undefined>(undefined);
  const [organizations, setOrganizations] = useState<Organization[] | undefined>(undefined);

  const handleOrgChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setOrgToTransfer(event.target.value || undefined);
  };

  // Clean API error when form is focused after validation
  const cleanApiError = () => {
    if (!isNull(apiError)) {
      setApiError(null);
    }
  };

  const onCloseModal = () => {
    props.onClose();
  };

  async function transferRepository() {
    try {
      await API.transferRepository({
        repositoryName: props.repository.name,
        toOrgName: orgToTransfer,
        fromOrgName: organizationName,
      });
      if (!isUndefined(props.onSuccess)) {
        props.onSuccess();
      }
      setIsSending(false);
      onCloseModal();
    } catch (err) {
      setIsSending(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        let error = compoundErrorMessage(err, 'An error occurred transfering the repository');
        if (!isUndefined(organizationName) && err.kind === ErrorKind.Forbidden) {
          error = 'You do not have permissions to transfer a repository to the organization.';
        }
        setApiError(error);
      } else {
        props.onAuthError();
      }
    }
  }

  const submitForm = () => {
    cleanApiError();
    setIsSending(true);
    if (form.current && validateForm(form.current)) {
      transferRepository();
    } else {
      setIsSending(false);
    }
  };

  const validateForm = (form: HTMLFormElement): boolean => {
    setIsValidated(true);
    return form.checkValidity();
  };

  useEffect(() => {
    async function fetchOrganizations() {
      try {
        setIsFetchingOrgs(true);
        let orgs = await API.getUserOrganizations();
        if (!isUndefined(organizationName)) {
          orgs = orgs.filter((org: Organization) => org.name !== organizationName);
        }
        setOrganizations(orgs);
        setApiError(null);
        setIsFetchingOrgs(false);
      } catch (err) {
        setIsFetchingOrgs(false);
        if (err.kind !== ErrorKind.Unauthorized) {
          setOrganizations([]);
          setApiError('An error occurred getting your organizations, please try again later.');
        } else {
          props.onAuthError();
        }
      }
    }

    fetchOrganizations();
  }, [organizationName, props]);

  return (
    <Modal
      header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Transfer repository</div>}
      open={props.open}
      modalClassName={styles.modal}
      closeButton={
        <button
          data-testid="transferRepoBtn"
          className="btn btn-sm btn-secondary"
          type="button"
          disabled={isSending}
          onClick={submitForm}
        >
          {isSending ? (
            <>
              <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
              <span className="ml-2">Transfering repository...</span>
            </>
          ) : (
            <div className="d-flex flex-row align-items-center text-uppercase">
              <RiArrowLeftRightLine className="mr-2" />
              <span>Transfer</span>
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
          data-testid="transferRepoForm"
          ref={form}
          className={classnames('w-100', { 'needs-validation': !isValidated }, { 'was-validated': isValidated })}
          onFocus={cleanApiError}
          autoComplete="on"
          noValidate
        >
          {!isUndefined(organizationName) ? (
            <>
              <div className="form-check mb-3">
                <input
                  data-testid="radio_user"
                  className="form-check-input"
                  type="radio"
                  name="transfer"
                  id="user"
                  value="user"
                  checked={selectedTransferOption === 'user'}
                  onChange={() => setSelectedTransferOption('user')}
                  required
                />
                <label className={`form-check-label font-weight-bold ${styles.label}`} htmlFor="user">
                  Transfer to my user
                </label>
              </div>

              <div className="form-check mb-3">
                <input
                  data-testid="radio_org"
                  className="form-check-input"
                  type="radio"
                  name="transfer"
                  id="org"
                  value="org"
                  checked={selectedTransferOption === 'org'}
                  onChange={() => setSelectedTransferOption('org')}
                  required
                />
                <label className={`form-check-label font-weight-bold ${styles.label}`} htmlFor="org">
                  Transfer to organization
                </label>
              </div>
            </>
          ) : (
            <label className={`font-weight-bold ${styles.label}`}>Transfer to organization</label>
          )}

          <div
            data-testid="selectOrgsWrapper"
            className={classnames('d-flex flex-row align-items-center position-relative mb-3', {
              invisible: selectedTransferOption === 'user',
            })}
          >
            <div className="form-group w-75 mb-2">
              <select
                data-testid="select_orgs"
                className="custom-select"
                aria-label="org-select"
                value={orgToTransfer}
                onChange={handleOrgChange}
                required={selectedTransferOption === 'org'}
              >
                {!isUndefined(organizations) && (
                  <>
                    <option value="">Select organization</option>
                    {organizations.map((org: Organization) => (
                      <option key={`opt_${org.name}`} value={org.name}>
                        {org.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
              <div className={`invalid-feedback ${styles.fieldFeedback}`}>This field is required</div>
            </div>
            {isFetchingOrgs && (
              <div className="d-inline ml-3">
                <span className="spinner-border spinner-border-sm text-primary" />
              </div>
            )}
          </div>

          <small className="text-muted text-break mt-3">
            <p>It may take a few minutes for this change to be visible across the Hub.</p>
          </small>
        </form>
      </div>
    </Modal>
  );
};

export default TransferRepositoryModal;
