import classnames from 'classnames';
import compact from 'lodash/compact';
import every from 'lodash/every';
import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import uniq from 'lodash/uniq';
import { nanoid } from 'nanoid';
import { ChangeEvent, KeyboardEvent, useContext, useRef, useState } from 'react';
import { FaPencilAlt } from 'react-icons/fa';
import { MdAddCircle } from 'react-icons/md';

import API from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import {
  ContainerTag,
  ErrorKind,
  RefInputField,
  Repository,
  RepositoryKind,
  ResourceKind,
  VersioningOption,
} from '../../../types';
import compoundErrorMessage from '../../../utils/compoundErrorMessage';
import { OCI_PREFIX, RepoKindDef, REPOSITORY_KINDS } from '../../../utils/data';
import getMetaTag from '../../../utils/getMetaTag';
import ExternalLink from '../../common/ExternalLink';
import InputField from '../../common/InputField';
import Modal from '../../common/Modal';
import styles from './Modal.module.css';
import TagsList from './TagsList';

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
const DEFAULT_VERSIONING_OPT = VersioningOption.Git;

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
  const [resetFields, setResetFields] = useState<boolean>(false);
  const [authUser, setAuthUser] = useState<string | null>(props.repository ? props.repository.authUser || null : null);
  const [authPass, setAuthPass] = useState<string | null>(props.repository ? props.repository.authPass || null : null);

  const prepareTags = (): ContainerTag[] => {
    if (props.repository) {
      if (props.repository.data && props.repository.data.tags && !isEmpty(props.repository.data.tags)) {
        return props.repository.data.tags.map((tag: ContainerTag) => {
          return { ...tag, id: nanoid() };
        });
      } else {
        return [];
      }
    } else {
      // By default, we add mutable tag latest for new container images
      return [{ name: 'latest', mutable: true, id: nanoid() }];
    }
  };

  const [containerTags, setContainerTags] = useState<ContainerTag[]>(prepareTags());
  const [repeatedTagNames, setRepeatedTagNames] = useState<boolean>(false);
  const [versioning, setVersioning] = useState<VersioningOption>(
    props.repository && props.repository.data && props.repository.data.versioning
      ? props.repository.data.versioning
      : DEFAULT_VERSIONING_OPT
  );

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setIsValidInput(e.target.value === props.repository!.name);
  };

  const onUrlInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUrlContainsTreeTxt(e.target.value.includes('/tree/'));
  };

  const allowPrivateRepositories: boolean = getMetaTag('allowPrivateRepositories', true);
  const siteName = getMetaTag('siteName');

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
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
          authUser:
            !isUndefined(props.repository) &&
            props.repository.private &&
            !resetFields &&
            selectedKind === RepositoryKind.Helm
              ? '='
              : authUser,
          authPass: !isUndefined(props.repository) && props.repository.private && !resetFields ? '=' : authPass,
        };

        if (selectedKind === RepositoryKind.Container) {
          const cleanTags = containerTags.filter((tag: ContainerTag) => tag.name !== '');
          const readyTags = cleanTags.map((tag: ContainerTag) => ({ name: tag.name, mutable: tag.mutable }));
          repository.data = {
            tags: readyTags,
          };
        }

        if (
          [RepositoryKind.TektonTask, RepositoryKind.TektonPipeline, RepositoryKind.TektonStepAction].includes(
            selectedKind
          )
        ) {
          repository.data = {
            versioning: versioning,
          };
        }
      }
      setIsValidated(true);
      return { isValid, repository };
    });
  };

  const checkContainerTags = (): boolean => {
    if (selectedKind !== RepositoryKind.Container) return true;

    const tagNames = compact(containerTags.map((tag: ContainerTag) => tag.name));
    const uniqTagNames = uniq(tagNames);
    if (tagNames.length === uniqTagNames.length) {
      setRepeatedTagNames(false);
      return true;
    } else {
      setRepeatedTagNames(true);
      return false;
    }
  };

  const validateAllFields = async (): Promise<boolean> => {
    return Promise.all([
      nameInput.current!.checkIsValid(),
      urlInput.current!.checkIsValid(),
      checkContainerTags(),
    ]).then((res: boolean[]) => {
      return every(res, (isValid: boolean) => isValid);
    });
  };

  const handleOnReturnKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter' && !isNull(form)) {
      submitForm();
    }
  };

  const handleKindChange = (event: ChangeEvent<HTMLSelectElement>) => {
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
          <ExternalLink
            href="/docs/topics/repositories/helm-charts"
            className="text-primary fw-bold"
            label="Open documentation"
          >
            Helm charts repositories
          </ExternalLink>
        );
        break;
      case RepositoryKind.OLM:
        link = (
          <ExternalLink
            href="/docs/topics/repositories/olm-operators"
            className="text-primary fw-bold"
            label="Open documentation"
          >
            OLM operators repositories
          </ExternalLink>
        );
        break;
      case RepositoryKind.Falco:
        link = (
          <ExternalLink
            href="/docs/topics/repositories/falco-rules"
            className="text-primary fw-bold"
            label="Open documentation"
          >
            Falco rules repositories
          </ExternalLink>
        );
        break;
      case RepositoryKind.OPA:
        link = (
          <ExternalLink
            href="/docs/topics/repositories/opa-policies"
            className="text-primary fw-bold"
            label="Open documentation"
          >
            OPA policies repositories
          </ExternalLink>
        );
        break;
      case RepositoryKind.TBAction:
        link = (
          <ExternalLink
            href="/docs/topics/repositories/tinkerbell-actions"
            className="text-primary fw-bold"
            label="Open documentation"
          >
            Tinkerbell actions
          </ExternalLink>
        );
        break;
      case RepositoryKind.Krew:
        link = (
          <ExternalLink
            href="/docs/topics/repositories/krew-kubectl-plugins"
            className="text-primary fw-bold"
            label="Open documentation"
          >
            Krew kubectl plugins
          </ExternalLink>
        );
        break;
      case RepositoryKind.HelmPlugin:
        link = (
          <ExternalLink
            href="/docs/topics/repositories/helm-plugins"
            className="text-primary fw-bold"
            label="Open documentation"
          >
            Helm plugins
          </ExternalLink>
        );
        break;
      case RepositoryKind.TektonTask:
        link = (
          <ExternalLink
            href="/docs/topics/repositories/tekton-tasks"
            className="text-primary fw-bold"
            label="Open documentation"
          >
            <u>Tekton tasks</u>
          </ExternalLink>
        );
        break;
      case RepositoryKind.KedaScaler:
        link = (
          <ExternalLink
            href="/docs/topics/repositories/keda-scalers"
            className="text-primary fw-bold"
            label="Open documentation"
          >
            KEDA scalers
          </ExternalLink>
        );
        break;
      case RepositoryKind.CoreDNS:
        link = (
          <ExternalLink
            href="/docs/topics/repositories/coredns-plugins"
            className="text-primary fw-bold"
            label="Open documentation"
          >
            CoreDNS plugins
          </ExternalLink>
        );
        break;
      case RepositoryKind.Keptn:
        link = (
          <ExternalLink
            href="/docs/topics/repositories/keptn-integrations"
            className="text-primary fw-bold"
            label="Open documentation"
          >
            Keptn integrations
          </ExternalLink>
        );
        break;
      case RepositoryKind.TektonPipeline:
        link = (
          <ExternalLink
            href="/docs/topics/repositories/tekton-pipelines"
            className="text-primary fw-bold"
            label="Open documentation"
          >
            Tekton pipelines
          </ExternalLink>
        );
        break;
      case RepositoryKind.Container:
        link = (
          <ExternalLink
            href="/docs/topics/repositories/container-images"
            className="text-primary fw-bold"
            label="Open documentation"
          >
            Container images
          </ExternalLink>
        );
        break;
      case RepositoryKind.Kubewarden:
        link = (
          <ExternalLink
            href="/docs/topics/repositories/kubewarden-policies"
            className="text-primary fw-bold"
            label="Open documentation"
          >
            Kubewarden policies
          </ExternalLink>
        );
        break;
      case RepositoryKind.Gatekeeper:
        link = (
          <ExternalLink
            href="/docs/topics/repositories/gatekeeper-policies"
            className="text-primary fw-bold"
            label="Open documentation"
          >
            Gatekeeper policies
          </ExternalLink>
        );
        break;
      case RepositoryKind.Kyverno:
        link = (
          <ExternalLink
            href="/docs/topics/repositories/kyverno-policies"
            className="text-primary fw-bold"
            label="Open documentation"
          >
            Kyverno policies
          </ExternalLink>
        );
        break;
      case RepositoryKind.KnativeClientPlugin:
        link = (
          <ExternalLink
            href="/docs/topics/repositories/knative-client-plugins"
            className="text-primary fw-bold"
            label="Open documentation"
          >
            Knative client plugins
          </ExternalLink>
        );
        break;
      case RepositoryKind.Backstage:
        link = (
          <ExternalLink
            href="/docs/topics/repositories/backstage-plugins"
            className="text-primary fw-bold"
            label="Open documentation"
          >
            Backstage plugins
          </ExternalLink>
        );
        break;
      case RepositoryKind.ArgoTemplate:
        link = (
          <ExternalLink
            href="/docs/topics/repositories/argo-templates"
            className="text-primary fw-bold"
            label="Open documentation"
          >
            Argo templates
          </ExternalLink>
        );
        break;
      case RepositoryKind.KubeArmor:
        link = (
          <ExternalLink
            href="/docs/topics/repositories/kubearmor-policies"
            className="text-primary fw-bold"
            label="Open documentation"
          >
            KubeArmor policies
          </ExternalLink>
        );
        break;
      case RepositoryKind.KCL:
        link = (
          <ExternalLink
            href="/docs/topics/repositories/kcl-modules"
            className="text-primary fw-bold"
            label="Open documentation"
          >
            KCL modules
          </ExternalLink>
        );
        break;
      case RepositoryKind.Headlamp:
        link = (
          <ExternalLink
            href="/docs/topics/repositories/headlamp-plugins"
            className="text-primary fw-bold"
            label="Open documentation"
          >
            Headlamp plugins
          </ExternalLink>
        );
        break;
      case RepositoryKind.InspektorGadget:
        link = (
          <ExternalLink
            href="/docs/topics/repositories/inspektor-gadgets"
            className="text-primary fw-bold"
            label="Open documentation"
          >
            Inspektor gadgets
          </ExternalLink>
        );
        break;
      case RepositoryKind.TektonStepAction:
        link = (
          <ExternalLink
            href="/docs/topics/repositories/tekton-stepactions"
            className="text-primary fw-bold"
            label="Open documentation"
          >
            Tekton stepactions
          </ExternalLink>
        );
        break;
      case RepositoryKind.MesheryDesign:
        link = (
          <ExternalLink
            href="/docs/topics/repositories/meshery-designs"
            className="text-primary fw-bold"
            label="Open documentation"
          >
            Meshery designs
          </ExternalLink>
        );
        break;
      case RepositoryKind.OpenCost:
        link = (
          <ExternalLink
            href="/docs/topics/repositories/opencost-plugins"
            className="text-primary fw-bold"
            label="Open documentation"
          >
            OpenCost plugins
          </ExternalLink>
        );
        break;
      case RepositoryKind.RadiusRecipe:
        link = (
          <ExternalLink
            href="/docs/topics/repositories/radius-recipes"
            className="text-primary fw-bold"
            label="Open documentation"
          >
            Radius recipes
          </ExternalLink>
        );
        break;
    }

    if (isUndefined(link)) return;

    return (
      <div className="text-muted text-break mt-1 mb-4">
        <small>
          {(() => {
            switch (selectedKind) {
              case RepositoryKind.Falco:
              case RepositoryKind.OLM:
              case RepositoryKind.OPA:
              case RepositoryKind.TBAction:
              case RepositoryKind.Krew:
              case RepositoryKind.HelmPlugin:
              case RepositoryKind.TektonTask:
              case RepositoryKind.KedaScaler:
              case RepositoryKind.CoreDNS:
              case RepositoryKind.Keptn:
              case RepositoryKind.TektonPipeline:
              case RepositoryKind.Kubewarden:
              case RepositoryKind.Gatekeeper:
              case RepositoryKind.Kyverno:
              case RepositoryKind.KnativeClientPlugin:
              case RepositoryKind.Backstage:
              case RepositoryKind.ArgoTemplate:
              case RepositoryKind.KubeArmor:
              case RepositoryKind.KCL:
              case RepositoryKind.Headlamp:
              case RepositoryKind.InspektorGadget:
              case RepositoryKind.TektonStepAction:
              case RepositoryKind.MesheryDesign:
              case RepositoryKind.OpenCost:
              case RepositoryKind.RadiusRecipe:
                return (
                  <>
                    <p
                      className={classnames('mb-2 opacity-100', {
                        [styles.animatedWarning]: urlContainsTreeTxt,
                      })}
                    >
                      Please DO NOT include the git hosting platform specific parts, like
                      <span className="fw-bold">tree/branch</span>, just the path to your packages like it would show in
                      the filesystem.
                    </p>
                    <p className="mb-0">
                      For more information about the url format and the repository structure, please see the {link}{' '}
                      section in the{' '}
                      <ExternalLink
                        href="/docs/repositories"
                        className="text-primary fw-bold"
                        label="Open documentation"
                      >
                        repositories guide
                      </ExternalLink>
                      .
                    </p>
                  </>
                );

              case RepositoryKind.Container:
                return (
                  <>
                    <p className="mb-3">
                      The url <span className="fw-bold">must</span> follow the following format:
                    </p>
                    <p className="mb-3 ms-3">
                      <code className={`me-2 ${styles.code}`}>oci://registry/[namespace]/repository</code> (example:{' '}
                      <span className="fst-italic">oci://index.docker.io/artifacthub/ah</span>)
                    </p>
                    <p>
                      The registry host is required, please use <code className={styles.code}>index.docker.io</code>{' '}
                      when referring to repositories hosted in the Docker Hub. The url should not contain any tag. For
                      more information please see the {link} section in the{' '}
                      <ExternalLink
                        href="/docs/repositories"
                        className="text-primary fw-bold"
                        label="Open documentation"
                      >
                        repositories guide
                      </ExternalLink>
                      .
                    </p>
                  </>
                );

              default:
                return (
                  <p className="mb-0">
                    For more information about the url format and the repository structure, please see the {link}{' '}
                    section in the{' '}
                    <ExternalLink href="/docs/repositories" className="text-primary fw-bold" label="Open documentation">
                      repositories guide
                    </ExternalLink>
                    .
                  </p>
                );
            }
          })()}
        </small>
      </div>
    );
  };

  const getURLPattern = (): string | undefined => {
    switch (selectedKind) {
      case RepositoryKind.Helm:
        return undefined;
      case RepositoryKind.OLM:
        return `^((https?://)|${OCI_PREFIX}).*`;
      case RepositoryKind.Container:
        return `^${OCI_PREFIX}.*`;
      default:
        return `^https?://.*`;
    }
  };

  const renderPrivateFields = (): JSX.Element => (
    <>
      {(() => {
        switch (selectedKind) {
          case RepositoryKind.Helm:
          case RepositoryKind.Container:
            return (
              <div className="row">
                <InputField
                  className="col-sm-12 col-md-6"
                  type="text"
                  label="Username"
                  name="authUser"
                  autoComplete="off"
                  value={authUser || ''}
                  onChange={onAuthUserChange}
                />

                <InputField
                  className="col-sm-12 col-md-6"
                  type="password"
                  label="Password"
                  name="authPass"
                  autoComplete="new-password"
                  value={authPass || ''}
                  onChange={onAuthPassChange}
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
                  value={authPass || ''}
                  onChange={onAuthPassChange}
                />
              </div>
            );
        }
      })()}
    </>
  );

  const resetAuthFields = () => {
    setResetFields(true);
    setAuthPass(null);
    setAuthUser(null);
  };

  const onAuthUserChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAuthUser(e.target.value);
  };

  const onAuthPassChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAuthPass(e.target.value);
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
                type="button"
                className={`btn btn-sm btn-success ${styles.btnLight}`}
                onClick={() => {
                  setVisibleDisabledConfirmation(false);
                  setIsValidInput(false);
                }}
                aria-label="Cancel"
              >
                <span>I'll leave it enabled</span>
              </button>

              <button
                type="button"
                className={classnames(
                  'btn btn-sm ms-3',
                  { 'btn-outline-secondary': !isValidInput },
                  { 'btn-danger': isValidInput }
                )}
                onClick={(e) => {
                  e.preventDefault();
                  setIsDisabled(!isDisabled);
                  setVisibleDisabledConfirmation(false);
                }}
                disabled={!isValidInput}
                aria-label="Disable repository"
              >
                <span>I understand, continue</span>
              </button>
            </>
          ) : (
            <button
              className="btn btn-sm btn-outline-secondary"
              type="button"
              disabled={isSending || visibleDisabledConfirmation}
              onClick={submitForm}
              aria-label={`${isUndefined(props.repository) ? 'Add' : 'Update'} repository`}
            >
              {isSending ? (
                <>
                  <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                  <span className="ms-2">Validating repository...</span>
                </>
              ) : (
                <div className="d-flex flex-row align-items-center text-uppercase">
                  {isUndefined(props.repository) ? (
                    <>
                      <MdAddCircle className="me-2" />
                      <div>Add</div>
                    </>
                  ) : (
                    <>
                      <FaPencilAlt className="me-2" />
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
              <span className="fw-bold text-uppercase">Important:</span> Please read this carefully.
            </div>

            <p>If you disable this repository all packages belonging to it will be deleted.</p>

            <p>
              All information related to the packages in your repository will be permanently deleted as well. This
              includes packages' stars, subscriptions, webhooks, events and notifications.{' '}
              <span className="fw-bold">This operation cannot be undone.</span>
            </p>

            <p>
              You can enable back your repository at any time and the information available in the source repository
              will be indexed and made available in {siteName} again.
            </p>

            <p>
              Please type <span className="fw-bold">{props.repository!.name}</span> to confirm:
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
            <div className="w-75 mb-4">
              <label className={`form-label fw-bold ${styles.label}`} htmlFor="repoKind">
                Kind
              </label>
              <select
                className="form-select"
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
              labelLegend={<small className="ms-1 fst-italic">(Required)</small>}
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
              pattern="[a-z][a-z0-9\-]*"
              autoComplete="off"
              disabled={!isUndefined(props.repository)}
              additionalInfo={
                <small className="text-muted text-break mt-1">
                  <p className="mb-0">
                    This name will appear in your packages' urls and <span className="fw-bold">cannot be updated</span>{' '}
                    once is saved.
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
              labelLegend={<small className="ms-1 fst-italic">(Required)</small>}
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
              placeholder={selectedKind === RepositoryKind.Container ? OCI_PREFIX : ''}
              pattern={getURLPattern()}
              onChange={onUrlInputChange}
              required
            />

            {getAdditionalInfo()}

            {selectedKind === RepositoryKind.Container && (
              <TagsList
                tags={containerTags}
                setContainerTags={setContainerTags}
                repeatedTagNames={repeatedTagNames}
                setRepeatedTagNames={setRepeatedTagNames}
              />
            )}

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
              RepositoryKind.Keptn,
              RepositoryKind.TektonPipeline,
              RepositoryKind.Kubewarden,
              RepositoryKind.Gatekeeper,
              RepositoryKind.Kyverno,
              RepositoryKind.KnativeClientPlugin,
              RepositoryKind.Backstage,
              RepositoryKind.ArgoTemplate,
              RepositoryKind.KubeArmor,
              RepositoryKind.KCL,
              RepositoryKind.Headlamp,
              RepositoryKind.InspektorGadget,
              RepositoryKind.TektonStepAction,
              RepositoryKind.MesheryDesign,
              RepositoryKind.OpenCost,
              RepositoryKind.RadiusRecipe,
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
                        Branch used in git based repositories. The <span className="fw-bold">master</span> branch is
                        used by default when none is provided.
                      </p>
                    </small>
                  }
                  value={!isUndefined(props.repository) && props.repository.branch ? props.repository.branch : ''}
                />
              </div>
            )}

            {[RepositoryKind.TektonTask, RepositoryKind.TektonPipeline, RepositoryKind.TektonStepAction].includes(
              selectedKind
            ) && (
              <>
                <label className={`form-label fw-bold ${styles.label}`}>Versioning</label>

                <div className="d-flex flex-row mb-2">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {Object.entries(VersioningOption).map((opt: any) => {
                    return (
                      <div className="form-check me-4 mb-2" key={`versioning_${opt[1]}`}>
                        <input
                          className="form-check-input"
                          type="radio"
                          id={opt[1]}
                          name="payload"
                          value={opt[1]}
                          checked={versioning === opt[1]}
                          onChange={() => setVersioning(opt[1])}
                        />
                        <label className={`form-check-label ${styles.label}`} htmlFor={opt[1]}>
                          {opt[0]}
                        </label>
                      </div>
                    );
                  })}
                </div>

                <div className="mb-4">
                  <small className="text-muted text-break">
                    <p className="mb-0">
                      Select the layout of your Tekton catalog (the Tekton community recommends using{' '}
                      <code className={styles.code}>git</code> based versioning). For more details please see the{' '}
                      <ExternalLink
                        href="https://github.com/tektoncd/community/blob/main/teps/0115-tekton-catalog-git-based-versioning.md#tep-0115-tekton-catalog-git-based-versioning"
                        className="text-primary fw-bold"
                        label="Open Tekton docs"
                      >
                        Tekton docs
                      </ExternalLink>
                      .
                    </p>
                  </small>
                </div>
              </>
            )}

            {allowPrivateRepositories && (
              <>
                {props.repository && props.repository.private ? (
                  <>
                    {!resetFields ? (
                      <div className="mt-1 mb-4">
                        <div className={`fw-bold mb-2 ${styles.label}`}>Credentials</div>
                        <small>
                          <p className="mb-0 text-muted text-break">
                            This repository is private and has some credentials set. Current credentials cannot be
                            viewed, but you can{' '}
                            <button
                              type="button"
                              className={`btn btn-link btn-sm p-0 m-0 text-primary fw-bold position-relative d-inline-block ${styles.btnInline}`}
                              onClick={resetAuthFields}
                              aria-label="Reset credentials"
                            >
                              reset them
                            </button>
                            .
                          </p>
                        </small>
                      </div>
                    ) : (
                      <>{renderPrivateFields()}</>
                    )}
                  </>
                ) : (
                  <>{renderPrivateFields()}</>
                )}
              </>
            )}

            <div className="mb-4">
              <div className="form-check form-switch ps-0">
                <label htmlFor="disabledRepo" className={`form-check-label fw-bold ${styles.label}`}>
                  Disabled
                </label>
                <input
                  id="disabledRepo"
                  type="checkbox"
                  className="form-check-input position-absolute ms-2"
                  role="switch"
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
              </div>

              <div className="form-text text-muted mt-2">
                Use this switch to disable the repository temporarily or permanently.
              </div>
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
              RepositoryKind.Keptn,
              RepositoryKind.TektonPipeline,
              RepositoryKind.Container,
              RepositoryKind.Kubewarden,
              RepositoryKind.Gatekeeper,
              RepositoryKind.Kyverno,
              RepositoryKind.KnativeClientPlugin,
              RepositoryKind.Backstage,
              RepositoryKind.ArgoTemplate,
              RepositoryKind.KubeArmor,
              RepositoryKind.KCL,
              RepositoryKind.Headlamp,
              RepositoryKind.InspektorGadget,
              RepositoryKind.TektonStepAction,
              RepositoryKind.MesheryDesign,
              RepositoryKind.OpenCost,
              RepositoryKind.RadiusRecipe,
            ].includes(selectedKind) && (
              <div className="mt-4 mb-3">
                <div className="form-check form-switch ps-0">
                  <label htmlFor="scannerDisabledRepo" className={`form-check-label fw-bold ${styles.label}`}>
                    Security scanner disabled
                  </label>{' '}
                  <input
                    id="scannerDisabledRepo"
                    type="checkbox"
                    className="form-check-input position-absolute ms-2"
                    value="true"
                    role="switch"
                    onChange={() => setIsScannerDisabled(!isScannerDisabled)}
                    checked={isScannerDisabled}
                  />
                </div>

                <div className="form-text text-muted mt-2">
                  Use this switch to disable the security scanning of the packages in this repository.
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </Modal>
  );
};

export default RepositoryModal;
