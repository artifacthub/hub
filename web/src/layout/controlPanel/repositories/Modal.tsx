import classnames from 'classnames';
import every from 'lodash/every';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useRef, useState } from 'react';
import { FaPencilAlt } from 'react-icons/fa';
import { MdAddCircle } from 'react-icons/md';

import { API } from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { ErrorKind, RefInputField, Repository, RepositoryKind, ResourceKind } from '../../../types';
import compoundErrorMessage from '../../../utils/compoundErrorMessage';
import { OCI_PREFIX, RepoKindDef, REPOSITORY_KINDS } from '../../../utils/data';
import ExternalLink from '../../common/ExternalLink';
import InputField from '../../common/InputField';
import Modal from '../../common/Modal';
import styles from './Modal.module.css';

interface FormValidation {
  isValid: boolean;
  repository: Repository | null;
}

interface Props {
  open: boolean;
  repository?: Repository;
  onSuccess?: () => void;
  onClose: () => void;
  onAuthError: () => void;
}
const DEFAULT_SELECTED_REPOSITORY_KIND = RepositoryKind.Helm;

const RepositoryModal = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const form = useRef<HTMLFormElement>(null);
  const nameInput = useRef<RefInputField>(null);
  const urlInput = useRef<RefInputField>(null);
  const [isSending, setIsSending] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const organizationName = ctx.prefs.controlPanel.selectedOrg;
  const [isDisabled, setIsDisabled] = useState<boolean>(props.repository ? props.repository.disabled! : false);
  const [isScannerDisabled, setIsScannerDisabled] = useState<boolean>(
    props.repository ? props.repository.scannerDisabled! : false
  );
  const [visibleDisabledConfirmation, setVisibleDisabledConfirmation] = useState<boolean>(false);
  const [selectedKind, setSelectedKind] = useState<RepositoryKind>(
    isUndefined(props.repository) ? DEFAULT_SELECTED_REPOSITORY_KIND : props.repository.kind
  );
  const [isValidInput, setIsValidInput] = useState<boolean>(false);
  const [urlContainsTreeTxt, setUrlContainsTreeTxt] = useState<boolean>(false);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsValidInput(e.target.value === props.repository!.name);
  };

  const onUrlInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrlContainsTreeTxt(e.target.value.includes('/tree/'));
  };

  const allowPrivateRepositories: boolean = document.querySelector(`meta[name='artifacthub:allowPrivateRepositories']`)
    ? document.querySelector(`meta[name='artifacthub:allowPrivateRepositories']`)!.getAttribute('content') === 'true'
    : false;

  // Clean API error when form is focused after validation
  const cleanApiError = () => {
    if (!isNull(apiError)) {
      setApiError(null);
    }
  };

  const onCloseModal = () => {
    props.onClose();
  };

  async function handleRepository(repository: Repository) {
    try {
      if (isUndefined(props.repository)) {
        await API.addRepository(repository, organizationName);
      } else {
        await API.updateRepository(repository, organizationName);
      }
      if (!isUndefined(props.onSuccess)) {
        props.onSuccess();
      }
      setIsSending(false);
      onCloseModal();
    } catch (err) {
      setIsSending(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        let error = compoundErrorMessage(
          err,
          `An error occurred ${isUndefined(props.repository) ? 'adding' : 'updating'} the repository`
        );

        if (!isUndefined(organizationName) && err.kind === ErrorKind.Forbidden) {
          error = `You do not have permissions to ${isUndefined(props.repository) ? 'add' : 'update'} the repository  ${
            isUndefined(props.repository) ? 'to' : 'from'
          } the organization.`;
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
    if (form.current) {
      validateForm(form.current).then((validation: FormValidation) => {
        if (validation.isValid && !isNull(validation.repository)) {
          handleRepository(validation.repository);
        } else {
          setIsSending(false);
        }
      });
    }
  };

  const validateForm = async (form: HTMLFormElement): Promise<FormValidation> => {
    let repository: Repository | null = null;

    return validateAllFields().then((isValid: boolean) => {
      if (isValid) {
        const formData = new FormData(form);
        repository = {
          kind: selectedKind,
          name: !isUndefined(props.repository) ? props.repository.name : (formData.get('name') as string),
          url: formData.get('url') as string,
          branch: formData.get('branch') as string,
          displayName: formData.get('displayName') as string,
          disabled: isDisabled,
          scannerDisabled: isScannerDisabled,
          authUser: formData.get('authUser') as string,
          authPass: formData.get('authPass') as string,
        };
      }
      setIsValidated(true);
      return { isValid, repository };
    });
  };

  const validateAllFields = async (): Promise<boolean> => {
    return Promise.all([nameInput.current!.checkIsValid(), urlInput.current!.checkIsValid()]).then((res: boolean[]) => {
      return every(res, (isValid: boolean) => isValid);
    });
  };

  const handleOnReturnKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter' && !isNull(form)) {
      submitForm();
    }
  };

  const handleKindChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedKind(parseInt(event.target.value));
    // URL is validated when value has been entered previously
    if (urlInput.current!.getValue() !== '') {
      urlInput.current!.checkIsValid();
    }
  };

  const getAdditionalInfo = (): JSX.Element | undefined => {
    let link: JSX.Element | undefined;

    switch (selectedKind) {
      case RepositoryKind.Helm:
        link = (
          <ExternalLink href="/docs/topics/repositories#helm-charts-repositories" className="text-reset">
            <u>Helm charts repositories</u>
          </ExternalLink>
        );
        break;
      case RepositoryKind.OLM:
        link = (
          <ExternalLink href="/docs/topics/repositories#olm-operators-repositories" className="text-reset">
            <u>OLM operators repositories</u>
          </ExternalLink>
        );
        break;
      case RepositoryKind.Falco:
        link = (
          <ExternalLink href="/docs/topics/repositories#falco-rules-repositories" className="text-reset">
            <u>Falco rules repositories</u>
          </ExternalLink>
        );
        break;
      case RepositoryKind.OPA:
        link = (
          <ExternalLink href="/docs/topics/repositories#opa-policies-repositories" className="text-reset">
            <u>OPA policies repositories</u>
          </ExternalLink>
        );
        break;
      case RepositoryKind.TBAction:
        link = (
          <ExternalLink href="/docs/topics/repositories#tinkerbell-actions-repositories" className="text-reset">
            <u>Tinkerbell actions</u>
          </ExternalLink>
        );
        break;
      case RepositoryKind.Krew:
        link = (
          <ExternalLink href="/docs/topics/repositories#krew-kubectl-plugins-repositories" className="text-reset">
            <u>Krew kubectl plugins</u>
          </ExternalLink>
        );
        break;
      case RepositoryKind.HelmPlugin:
        link = (
          <ExternalLink href="/docs/topics/repositories#helm-plugins-repositories" className="text-reset">
            <u>Helm plugins</u>
          </ExternalLink>
        );
        break;
      case RepositoryKind.TektonTask:
        link = (
          <ExternalLink href="/docs/topics/repositories#tekton-tasks-repositories" className="text-reset">
            <u>Tekton tasks</u>
          </ExternalLink>
        );
        break;
      case RepositoryKind.KedaScaler:
        link = (
          <ExternalLink href="/docs/topics/repositories#keda-scalers-repositories" className="text-reset">
            <u>KEDA scalers</u>
          </ExternalLink>
        );
        break;
      case RepositoryKind.CoreDNS:
        link = (
          <ExternalLink href="/docs/topics/repositories#coredns-plugins-repositories" className="text-reset">
            <u>CoreDNS plugins</u>
          </ExternalLink>
        );
        break;
    }

    if (isUndefined(link)) return;

    return (
      <div className="text-muted text-break mt-1 mb-4">
        <small>
          {selectedKind !== RepositoryKind.Helm && (
            <p
              className={classnames('mb-2', styles.repoInfo, {
                [styles.animatedWarning]: urlContainsTreeTxt,
              })}
            >
              Please DO NOT include the git hosting platform specific parts, like 
              <span className="font-weight-bold">tree/branch</span>, just the path to your packages like it would show
              in the filesystem.
            </p>
          )}
          <p className="mb-0">
            For more information about the url format and the repository structure, please see the {link} section in the{' '}
            <ExternalLink href="/docs/repositories" className="text-reset">
              <u>repositories guide</u>
            </ExternalLink>
            .
          </p>
        </small>
      </div>
    );
  };

  const getURLPattern = (): string | undefined => {
    switch (selectedKind) {
      case RepositoryKind.Helm:
        return undefined;
      case RepositoryKind.OLM:
        return `((https://(github|gitlab).com/|${OCI_PREFIX})[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)/?(.*)`;
      default:
        return '(https://(github|gitlab).com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)/?(.*)';
    }
  };

  return (
    <Modal
      header={
        <div className={`h3 m-2 flex-grow-1 ${styles.title}`}>
          {isUndefined(props.repository) ? (
            <>Add repository</>
          ) : (
            <>{visibleDisabledConfirmation ? 'Disable repository' : 'Update repository'}</>
          )}
        </div>
      }
      open={props.open}
      modalClassName={classnames(styles.modal, { [styles.allowPrivateModal]: allowPrivateRepositories })}
      closeButton={
        <>
          {visibleDisabledConfirmation ? (
            <>
              <button
                data-testid="cancelDisabledRepo"
                type="button"
                className={`btn btn-sm btn-success ${styles.btnLight}`}
                onClick={() => {
                  setVisibleDisabledConfirmation(false);
                  setIsValidInput(false);
                }}
              >
                <span>I'll leave it enabled</span>
              </button>

              <button
                data-testid="confirmDisabledRepo"
                type="button"
                className={classnames('btn btn-sm ml-3', { 'btn-dark': !isValidInput }, { 'btn-danger': isValidInput })}
                onClick={(e) => {
                  e.preventDefault();
                  setIsDisabled(!isDisabled);
                  setVisibleDisabledConfirmation(false);
                }}
                disabled={!isValidInput}
              >
                <span>I understand, continue</span>
              </button>
            </>
          ) : (
            <button
              data-testid="repoBtn"
              className="btn btn-sm btn-secondary"
              type="button"
              disabled={isSending || visibleDisabledConfirmation}
              onClick={submitForm}
            >
              {isSending ? (
                <>
                  <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                  <span className="ml-2">Validating repository...</span>
                </>
              ) : (
                <div className="d-flex flex-row align-items-center text-uppercase">
                  {isUndefined(props.repository) ? (
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
          )}
        </>
      }
      onClose={onCloseModal}
      error={apiError}
      cleanError={cleanApiError}
    >
      <div className="w-100">
        {visibleDisabledConfirmation ? (
          <>
            <div className="alert alert-warning my-4">
              <span className="font-weight-bold text-uppercase">Important:</span> Please read this carefully.
            </div>

            <p>If you disable this repository all packages belonging to it will be deleted.</p>

            <p>
              All information related to the packages in your repository will be permanently deleted as well. This
              includes packages' stars, subscriptions, webhooks, events and notifications.{' '}
              <span className="font-weight-bold">This operation cannot be undone.</span>
            </p>

            <p>
              You can enable back your repository at any time and the information available in the source repository
              will be indexed and made available in Artifact Hub again.
            </p>

            <p>
              Please type <span className="font-weight-bold">{props.repository!.name}</span> to confirm:
            </p>

            <InputField type="text" name="repoName" autoComplete="off" value="" onChange={onInputChange} />
          </>
        ) : (
          <form
            data-testid="repoForm"
            ref={form}
            className={classnames('w-100', { 'needs-validation': !isValidated }, { 'was-validated': isValidated })}
            onFocus={cleanApiError}
            autoComplete="on"
            noValidate
          >
            <div className="form-group w-75 mb-4">
              <label className={`font-weight-bold ${styles.label}`} htmlFor="repoKind">
                Kind
              </label>
              <select
                className="custom-select"
                aria-label="kind-select"
                name="repoKind"
                value={selectedKind.toString()}
                onChange={handleKindChange}
                disabled={!isUndefined(props.repository)}
                required
              >
                {REPOSITORY_KINDS.map((repoKind: RepoKindDef) => {
                  return (
                    <option key={`kind_${repoKind.label}`} value={repoKind.kind}>
                      {repoKind.name}
                    </option>
                  );
                })}
              </select>
            </div>

            <InputField
              ref={nameInput}
              type="text"
              label="Name"
              labelLegend={<small className="ml-1 font-italic">(Required)</small>}
              name="name"
              value={!isUndefined(props.repository) ? props.repository.name : ''}
              readOnly={!isUndefined(props.repository)}
              invalidText={{
                default: 'This field is required',
                patternMismatch: 'Only lower case letters, numbers or hyphens. Must start with a letter',
                customError: 'There is another repository with this name',
              }}
              validateOnBlur
              checkAvailability={{
                isAvailable: true,
                resourceKind: ResourceKind.repositoryName,
                excluded: !isUndefined(props.repository) ? [props.repository.name] : [],
              }}
              pattern="[a-z][a-z0-9-]*"
              autoComplete="off"
              disabled={!isUndefined(props.repository)}
              additionalInfo={
                <small className="text-muted text-break mt-1">
                  <p className="mb-0">
                    This name will appear in your packages' urls and{' '}
                    <span className="font-weight-bold">cannot be updated</span> once is saved.
                  </p>
                </small>
              }
              required
            />

            <InputField
              type="text"
              label="Display name"
              name="displayName"
              value={
                !isUndefined(props.repository) && !isNull(props.repository.displayName)
                  ? props.repository.displayName
                  : ''
              }
            />

            <InputField
              ref={urlInput}
              type="url"
              label="Url"
              labelLegend={<small className="ml-1 font-italic">(Required)</small>}
              name="url"
              value={props.repository ? props.repository.url || '' : ''}
              invalidText={{
                default: 'This field is required',
                typeMismatch: 'Please enter a valid url',
                patternMismatch: 'Please enter a valid repository url for this repository kind',
                customError: 'There is another repository using this url',
              }}
              onKeyDown={handleOnReturnKeyDown}
              validateOnBlur
              checkAvailability={{
                isAvailable: true,
                resourceKind: ResourceKind.repositoryURL,
                excluded: props.repository ? [props.repository.url] : [],
              }}
              pattern={getURLPattern()}
              onChange={onUrlInputChange}
              required
            />

            {getAdditionalInfo()}

            {[
              RepositoryKind.Falco,
              RepositoryKind.OLM,
              RepositoryKind.OPA,
              RepositoryKind.TBAction,
              RepositoryKind.Krew,
              RepositoryKind.HelmPlugin,
              RepositoryKind.TektonTask,
              RepositoryKind.KedaScaler,
              RepositoryKind.CoreDNS,
            ].includes(selectedKind) && (
              <div>
                <InputField
                  type="text"
                  label="Branch"
                  name="branch"
                  placeholder="master"
                  additionalInfo={
                    <small className="text-muted text-break mt-1">
                      <p className="mb-0">
                        Branch used in git based repositories. The <span className="font-weight-bold">master</span>{' '}
                        branch is used by default when none is provided.
                      </p>
                    </small>
                  }
                  value={!isUndefined(props.repository) && props.repository.branch ? props.repository.branch : ''}
                />
              </div>
            )}

            {allowPrivateRepositories && (
              <>
                {(() => {
                  switch (selectedKind) {
                    case RepositoryKind.Helm:
                      return (
                        <div className="form-row">
                          <InputField
                            className="col-sm-12 col-md-6"
                            type="text"
                            label="Username"
                            name="authUser"
                            autoComplete="off"
                            value={props.repository ? props.repository.authUser || '' : ''}
                          />

                          <InputField
                            className="col-sm-12 col-md-6"
                            type="password"
                            label="Password"
                            name="authPass"
                            autoComplete="off"
                            value={props.repository ? props.repository.authPass || '' : ''}
                            visiblePassword
                          />
                        </div>
                      );

                    default:
                      return (
                        <div>
                          <InputField
                            type="text"
                            label="Authentication token"
                            name="authPass"
                            additionalInfo={
                              <small className="text-muted text-break mt-1">
                                <p className="mb-0">Authentication token used in private git based repositories.</p>
                              </small>
                            }
                            value={props.repository ? props.repository.authPass || '' : ''}
                          />
                        </div>
                      );
                  }
                })()}
              </>
            )}

            <div className="mb-4">
              <div className="custom-control custom-switch pl-0">
                <input
                  data-testid="toggleDisabledRepo"
                  id="disabledRepo"
                  type="checkbox"
                  className="custom-control-input"
                  value="true"
                  onChange={() => {
                    // Confirmation content is displayed when an existing repo is going to be disabled and it was not disabled before
                    if (props.repository && !isDisabled && !props.repository.disabled) {
                      setVisibleDisabledConfirmation(true);
                    } else {
                      setIsDisabled(!isDisabled);
                    }
                  }}
                  checked={isDisabled}
                />
                <label
                  htmlFor="disabledRepo"
                  className={`custom-control-label font-weight-bold ${styles.label} ${styles.customControlRightLabel}`}
                >
                  Disabled
                </label>
              </div>

              <small className="form-text text-muted mt-2">
                Use this switch to disable the repository temporarily or permanently.
              </small>
            </div>

            {[
              RepositoryKind.Helm,
              RepositoryKind.Falco,
              RepositoryKind.OLM,
              RepositoryKind.OPA,
              RepositoryKind.TBAction,
              RepositoryKind.TektonTask,
              RepositoryKind.KedaScaler,
              RepositoryKind.CoreDNS,
            ].includes(selectedKind) && (
              <div className="mt-4 mb-3">
                <div className="custom-control custom-switch pl-0">
                  <input
                    id="scannerDisabledRepo"
                    type="checkbox"
                    className="custom-control-input"
                    value="true"
                    onChange={() => setIsScannerDisabled(!isScannerDisabled)}
                    checked={isScannerDisabled}
                  />
                  <label
                    htmlFor="scannerDisabledRepo"
                    className={`custom-control-label font-weight-bold ${styles.label} ${styles.customControlRightLabel}`}
                  >
                    Security scanner disabled
                  </label>
                </div>

                <small className="form-text text-muted mt-2">
                  Use this switch to disable the security scanning of the packages in this repository.
                </small>
              </div>
            )}
          </form>
        )}
      </div>
    </Modal>
  );
};

export default RepositoryModal;
