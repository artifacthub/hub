import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import trim from 'lodash/trim';
import { ChangeEvent, MouseEvent as ReactMouseEvent, useContext, useEffect, useRef, useState } from 'react';
import { FaPencilAlt } from 'react-icons/fa';
import { RiTestTubeFill } from 'react-icons/ri';
import { unstable_usePrompt as usePrompt } from 'react-router-dom';

import API from '../../../../../api';
import { AppCtx, updateOrg } from '../../../../../context/AppCtx';
import {
  AuthorizationPolicy,
  AuthorizerAction,
  ErrorKind,
  Member,
  OrganizationPolicy,
  RefActionBtn,
  RegoPlaygroundResult,
} from '../../../../../types';
import alertDispatcher from '../../../../../utils/alertDispatcher';
import authorizer from '../../../../../utils/authorizer';
import { checkUnsavedPolicyChanges, PolicyChangeAction } from '../../../../../utils/checkUnsavedPolicyChanges';
import compoundErrorMessage from '../../../../../utils/compoundErrorMessage';
import { PREDEFINED_POLICIES } from '../../../../../utils/data';
import getMetaTag from '../../../../../utils/getMetaTag';
import isValidJSON from '../../../../../utils/isValidJSON';
import prepareRegoPolicyForPlayground from '../../../../../utils/prepareRegoPolicyForPlayground';
import stringifyPolicyData from '../../../../../utils/stringifyPolicyData';
import Alert from '../../../../common/Alert';
import CodeEditor from '../../../../common/CodeEditor';
import ExternalLink from '../../../../common/ExternalLink';
import Loading from '../../../../common/Loading';
import Modal from '../../../../common/Modal';
import NoData from '../../../../common/NoData';
import ActionBtn from '../../../ActionBtn';
import styles from './AuthorizationSection.module.css';

interface Props {
  onAuthError: () => void;
}

interface ConfirmationModal {
  open: boolean;
  message?: JSX.Element;
  onConfirm?: () => void;
}

interface Option {
  name: string;
  label: string;
}

const PAYLOAD_OPTION: Option[] = [
  {
    name: 'predefined',
    label: 'Use predefined policy',
  },
  {
    name: 'custom',
    label: 'Use custom policy',
  },
];

const DEFAULT_POLICY_NAME = 'rbac.v1';

const AuthorizationSection = (props: Props) => {
  const { ctx, dispatch } = useContext(AppCtx);
  const siteName = getMetaTag('siteName');
  const updateActionBtn = useRef<RefActionBtn>(null);
  const [apiError, setApiError] = useState<string | JSX.Element | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [savedOrgPolicy, setSavedOrgPolicy] = useState<OrganizationPolicy | undefined>(undefined);
  const [orgPolicy, setOrgPolicy] = useState<OrganizationPolicy | undefined | null>(undefined);
  const [invalidPolicy, setInvalidPolicy] = useState<boolean>(false);
  const [invalidPolicyDataJSON, setInvalidPolicyDataJSON] = useState<boolean>(false);
  const [selectedOrg, setSelectedOrg] = useState<string | undefined>(undefined);
  const [members, setMembers] = useState<string[] | undefined>(undefined);
  const [notGetPolicyAllowed, setNotGetPolicyAllowed] = useState<boolean>(false);
  const [updatePolicyAllowed, setUpdatePolicyAllowed] = useState<boolean>(false);
  const [confirmationModal, setConfirmationModal] = useState<ConfirmationModal>({ open: false });

  const getPredefinedPolicy = (name?: string): AuthorizationPolicy | undefined => {
    let policy = PREDEFINED_POLICIES.find((item: AuthorizationPolicy) => item.name === name);
    if (!isUndefined(policy) && !isUndefined(members)) {
      policy = {
        ...policy,
        data: {
          roles: {
            ...policy.data.roles,
            owner: {
              users: members,
            },
          },
        },
      };
    }
    return policy;
  };

  const onPayloadChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    let updatedOrgPolicy: OrganizationPolicy | undefined = undefined;
    if (value === 'predefined') {
      if (savedOrgPolicy && savedOrgPolicy.predefinedPolicy) {
        updatedOrgPolicy = {
          ...savedOrgPolicy,
          authorizationEnabled: true,
        };
      } else {
        const defaultPolicy = getPredefinedPolicy(DEFAULT_POLICY_NAME);
        if (defaultPolicy) {
          updatedOrgPolicy = {
            ...orgPolicy!,
            customPolicy: null,
            predefinedPolicy: defaultPolicy.name,
            policyData: stringifyPolicyData(defaultPolicy.data),
          };
        }
      }

      checkPolicyChanges(
        () => setOrgPolicy(updatedOrgPolicy!),
        PolicyChangeAction.OnSwitchFromCustomToPredefinedPolicy
      );
    } else {
      let updatedOrgPolicy: OrganizationPolicy | undefined = undefined;

      if (savedOrgPolicy && savedOrgPolicy.customPolicy) {
        updatedOrgPolicy = {
          ...savedOrgPolicy,
          authorizationEnabled: true,
        };
      } else {
        updatedOrgPolicy = {
          ...orgPolicy!,
          customPolicy: null,
          predefinedPolicy: null,
          policyData: null,
        };
      }

      checkPolicyChanges(
        () => setOrgPolicy(updatedOrgPolicy!),
        PolicyChangeAction.OnSwitchFromPredefinedToCustomPolicy
      );
    }
  };

  const checkIfUnsavedChanges = (): boolean => {
    const lostData = checkUnsavedPolicyChanges(savedOrgPolicy!, orgPolicy!);
    return lostData.lostData;
  };

  async function triggerTestInRegoPlayground() {
    try {
      setIsTesting(true);
      let policy: string = '';
      if (orgPolicy!.predefinedPolicy) {
        const predefined = getPredefinedPolicy(orgPolicy!.predefinedPolicy);
        if (predefined) {
          policy = predefined.policy;
        }
      } else {
        policy = orgPolicy!.customPolicy || '';
      }

      const data = prepareRegoPolicyForPlayground(policy, JSON.parse(orgPolicy!.policyData!), ctx.user!.alias);
      const share: RegoPlaygroundResult = await API.triggerTestInRegoPlayground(data);
      const popup = window.open(share.result, '_blank');
      if (isNull(popup)) {
        alertDispatcher.postAlert({
          type: 'warning',
          message:
            'You have Pop-up windows blocked for this site. Please allow them so that we can open the OPA Playground for you.',
        });
      }
      setIsTesting(false);
    } catch {
      setIsTesting(false);
      alertDispatcher.postAlert({
        type: 'danger',
        message: 'An error occurred opening the Playground, please try again later.',
      });
    }
  }

  async function getAuthorizationPolicy() {
    try {
      setIsLoading(true);
      const policy = await API.getAuthorizationPolicy(selectedOrg!);
      const formattedPolicy = {
        authorizationEnabled: policy.authorizationEnabled,
        predefinedPolicy: policy.predefinedPolicy || null,
        customPolicy: policy.customPolicy || null,
        policyData: policy.policyData ? stringifyPolicyData(policy.policyData) : null,
      };
      setSavedOrgPolicy(formattedPolicy);
      setOrgPolicy(formattedPolicy);
      setNotGetPolicyAllowed(false);
      setUpdatePolicyAllowed(
        authorizer.check({
          organizationName: selectedOrg!,
          action: AuthorizerAction.UpdateAuthorizationPolicy,
          user: ctx.user!.alias,
        })
      );
      setIsLoading(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setIsLoading(false);
      if (err.kind === ErrorKind.Unauthorized) {
        props.onAuthError();
      } else if (err.kind === ErrorKind.Forbidden) {
        setNotGetPolicyAllowed(true);
        setOrgPolicy(null);
      } else {
        setNotGetPolicyAllowed(false);
        setOrgPolicy(null);
        alertDispatcher.postAlert({
          type: 'danger',
          message: 'An error occurred getting the policy from the organization, please try again later.',
        });
      }
    }
  }

  async function updateAuthorizationPolicy() {
    try {
      setIsSaving(true);
      await API.updateAuthorizationPolicy(selectedOrg!, orgPolicy!);
      getAuthorizationPolicy();
      // Update allowed actions and re-render button
      authorizer.getAllowedActionsList(() => updateActionBtn.current!.reRender());
      setIsSaving(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setIsSaving(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        let error: string | JSX.Element = compoundErrorMessage(err, 'An error occurred updating the policy');
        error = (
          <>
            {error}. For more information please see the{' '}
            <ExternalLink
              href="https://github.com/artifacthub/hub/blob/master/docs/authorization.md"
              className="text-primary fw-bold"
              label="Open documentation"
            >
              documentation
            </ExternalLink>
            .
          </>
        );
        if (err.kind === ErrorKind.Forbidden) {
          error = 'You do not have permissions to update the policy from the organization.';
          setUpdatePolicyAllowed(false);
        }
        setApiError(error);
      } else {
        props.onAuthError();
      }
    }
  }

  async function fetchMembers() {
    try {
      const membersList: Member[] = await API.getAllOrganizationMembers(ctx.prefs.controlPanel.selectedOrg!);
      setMembers(membersList.map((member: Member) => member.alias));
    } catch {
      setMembers(undefined);
    }
  }

  const onSaveAuthorizationPolicy = () => {
    const policy = orgPolicy!.customPolicy || orgPolicy!.predefinedPolicy;
    if (isNull(policy) || isUndefined(policy) || trim(policy) === '') {
      setInvalidPolicy(true);
    } else if (!isValidJSON(orgPolicy!.policyData || '')) {
      setInvalidPolicyDataJSON(true);
    } else {
      checkPolicyChanges(updateAuthorizationPolicy, PolicyChangeAction.OnSavePolicy);
    }
  };

  const onAuthorizationEnabledChange = () => {
    let extraData = {};
    const authorized = !orgPolicy!.authorizationEnabled;
    const defaultPolicy = getPredefinedPolicy(DEFAULT_POLICY_NAME);
    if (
      authorized &&
      (isNull(savedOrgPolicy!.customPolicy) || isUndefined(savedOrgPolicy!.customPolicy)) &&
      (isNull(savedOrgPolicy!.predefinedPolicy) || isUndefined(savedOrgPolicy!.predefinedPolicy)) &&
      !isUndefined(defaultPolicy)
    ) {
      extraData = {
        predefinedPolicy: defaultPolicy.name,
        policyData: stringifyPolicyData(defaultPolicy.data),
      };
    }

    const updatedOrgPolicy = {
      ...savedOrgPolicy!,
      ...extraData,
      authorizationEnabled: authorized,
    };

    if (!authorized) {
      checkPolicyChanges(() => setOrgPolicy(updatedOrgPolicy), PolicyChangeAction.OnDisableAuthorization);
    } else {
      setOrgPolicy(updatedOrgPolicy);
    }
  };

  const onPredefinedPolicyChange = (e: ChangeEvent<HTMLSelectElement>) => {
    e.preventDefault();
    const activePredefinedPolicy = getPredefinedPolicy(e.target.value);
    const updatedOrgPolicy = {
      ...orgPolicy!,
      predefinedPolicy: e.target.value,
      policyData: !isUndefined(activePredefinedPolicy) ? stringifyPolicyData(activePredefinedPolicy.data) : '',
    };

    checkPolicyChanges(() => setOrgPolicy(updatedOrgPolicy!), PolicyChangeAction.OnChangePredefinedPolicy);
  };

  const checkPolicyChanges = (onConfirmAction: () => void, action?: PolicyChangeAction) => {
    const currentPredefinedPolicy =
      orgPolicy && orgPolicy.predefinedPolicy ? getPredefinedPolicy(orgPolicy.predefinedPolicy) : undefined;
    const lostData = checkUnsavedPolicyChanges(
      savedOrgPolicy!,
      orgPolicy!,
      action,
      currentPredefinedPolicy ? currentPredefinedPolicy.data : undefined
    );
    if (lostData.lostData) {
      setConfirmationModal({
        open: true,
        message: lostData.message,
        onConfirm: onConfirmAction,
      });
    } else {
      onConfirmAction();
    }
  };

  useEffect(() => {
    if (selectedOrg) {
      getAuthorizationPolicy();
      fetchMembers();
    }
  }, [selectedOrg]);

  useEffect(() => {
    if (ctx.prefs.controlPanel.selectedOrg) {
      if (selectedOrg !== ctx.prefs.controlPanel.selectedOrg) {
        if (!checkIfUnsavedChanges()) {
          setSelectedOrg(ctx.prefs.controlPanel.selectedOrg);
        } else {
          const warningPrompt = window.confirm(
            'You have some unsaved changes in your policy data. If you continue without saving, those changes will be lost.'
          );
          if (!warningPrompt) {
            dispatch(updateOrg(selectedOrg!));
          } else {
            setSelectedOrg(ctx.prefs.controlPanel.selectedOrg);
          }
        }
      }
    }
  }, [ctx.prefs.controlPanel.selectedOrg]);

  const onBeforeUnload = (e: BeforeUnloadEvent) => {
    e.preventDefault();

    e.returnValue =
      'You have some unsaved changes in your policy data. If you continue without saving, those changes will be lost.';
  };

  useEffect(() => {
    if (checkIfUnsavedChanges()) {
      window.addEventListener('beforeunload', onBeforeUnload);
    } else {
      window.removeEventListener('beforeunload', onBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [orgPolicy]);

  usePrompt({
    when: !isNull(orgPolicy) && !isUndefined(orgPolicy) && !notGetPolicyAllowed && checkIfUnsavedChanges(),
    message:
      'You have some unsaved changes in your policy data. If you continue without saving, those changes will be lost.',
  });

  return (
    <main role="main" className="p-0">
      {(isUndefined(orgPolicy) || isLoading) && <Loading />}

      <div className={`h3 pb-2 border-bottom border-1 ${styles.title}`}>Authorization</div>

      <div className="mt-4 mt-md-5" onClick={() => setApiError(null)}>
        <p>
          {siteName} allows you to setup fine-grained access control based on authorization policies. Authorization
          polices are written in{' '}
          <ExternalLink
            href="https://www.openpolicyagent.org/docs/latest/#rego"
            className="text-primary fw-bold"
            label="Open rego documentation"
          >
            rego
          </ExternalLink>{' '}
          and they are evaluated using the{' '}
          <ExternalLink
            href="https://www.openpolicyagent.org"
            className="text-primary fw-bold"
            label="Open Open Policy Agent documentation"
          >
            Open Policy Agent
          </ExternalLink>
          . Depending on your requirements, you can use a predefined policy and only supply a data file, or you can
          provide your custom policy for maximum flexibility. For more information please see the{' '}
          <ExternalLink href="/docs/authorization" className="text-primary fw-bold" label="Open documentation">
            documentation
          </ExternalLink>
          .
        </p>

        {(isNull(orgPolicy) || isUndefined(orgPolicy)) && notGetPolicyAllowed && (
          <NoData>You are not allowed to manage this organization's authorization policy</NoData>
        )}

        {orgPolicy && (
          <>
            <div className="form-check form-switch mb-4">
              <input
                id="activeAuthorization"
                type="checkbox"
                className="form-check-input"
                value="true"
                role="switch"
                onChange={onAuthorizationEnabledChange}
                checked={orgPolicy.authorizationEnabled}
                disabled={!updatePolicyAllowed}
              />
              <label className="form-check-label" htmlFor="activeAuthorization">
                Fine-grained access control
              </label>
            </div>

            {orgPolicy.authorizationEnabled && (
              <>
                <label className={`form-label ${styles.label}`} htmlFor="payload">
                  <span className="fw-bold">Select authorization policy:</span>
                </label>
                <div className="d-flex flex-row mb-2">
                  {PAYLOAD_OPTION.map((item: Option) => {
                    const activeOption = !isNull(orgPolicy.predefinedPolicy) ? 'predefined' : 'custom';
                    return (
                      <div className="form-check me-4 mb-2" key={`payload_${item.name}`}>
                        <input
                          className="form-check-input"
                          type="radio"
                          id={item.name}
                          name="payload"
                          value={item.name}
                          checked={activeOption === item.name}
                          onChange={onPayloadChange}
                          disabled={!updatePolicyAllowed}
                        />
                        <label className="form-check-label" htmlFor={item.name}>
                          {item.label}
                        </label>
                      </div>
                    );
                  })}
                </div>
                {orgPolicy.predefinedPolicy && (
                  <div className=" w-75 mb-4">
                    <select
                      className="form-select"
                      aria-label="org-select"
                      value={orgPolicy.predefinedPolicy || ''}
                      onChange={onPredefinedPolicyChange}
                      required={!isNull(orgPolicy.predefinedPolicy)}
                      disabled={!updatePolicyAllowed}
                    >
                      <option value="" disabled>
                        Select policy
                      </option>
                      {PREDEFINED_POLICIES.map((item: Option) => (
                        <option key={`policy_${item.name}`} value={item.name}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <div className={`invalid-feedback ${styles.fieldFeedback}`}>This field is required</div>
                  </div>
                )}
                <div className="d-flex flex-row align-self-stretch">
                  <div className="d-flex flex-column w-50 pe-2">
                    <div className="text-uppercase text-muted mb-2">Policy</div>

                    <div className="flex-grow-1">
                      <CodeEditor
                        mode="rego"
                        value={
                          orgPolicy.predefinedPolicy
                            ? getPredefinedPolicy(orgPolicy.predefinedPolicy)!.policy
                            : orgPolicy.customPolicy
                        }
                        onChange={(value: string) => {
                          if (invalidPolicy) {
                            setInvalidPolicy(false);
                          }
                          setOrgPolicy({
                            ...orgPolicy!,
                            customPolicy: value || null,
                          });
                        }}
                        disabled={orgPolicy.predefinedPolicy || !updatePolicyAllowed}
                      />
                      {invalidPolicy && (
                        <small className="text-danger">
                          <span className="fw-bold">Error: </span> This field is required
                        </small>
                      )}
                    </div>
                  </div>

                  <div className="d-flex flex-column w-50 ps-2">
                    <div className="text-uppercase text-muted mb-2">Data</div>

                    <div className="flex-grow-1">
                      <CodeEditor
                        value={orgPolicy.policyData}
                        mode="javascript"
                        onChange={(value: string) => {
                          if (invalidPolicyDataJSON) {
                            setInvalidPolicyDataJSON(false);
                          }
                          setOrgPolicy({
                            ...orgPolicy!,
                            policyData: value || null,
                          });
                        }}
                        disabled={!updatePolicyAllowed}
                      />
                      {invalidPolicyDataJSON && (
                        <small className="text-danger">
                          <span className="fw-bold">Error: </span> Invalid JSON format
                        </small>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="d-flex flex-row mt-4">
              {orgPolicy.authorizationEnabled && (
                <button
                  type="button"
                  className="btn btn-sm btn-success"
                  onClick={triggerTestInRegoPlayground}
                  aria-label="Test in playground"
                >
                  {isTesting ? (
                    <>
                      <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                      <span className="ms-2">Preparing Playground...</span>
                    </>
                  ) : (
                    <div className="d-flex flex-row align-items-center text-uppercase">
                      <RiTestTubeFill className="me-2" /> <div>Test in Playground</div>
                    </div>
                  )}
                </button>
              )}

              <div className="ms-auto">
                <ActionBtn
                  ref={updateActionBtn}
                  className="btn btn-sm btn-outline-secondary"
                  onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    onSaveAuthorizationPolicy();
                  }}
                  action={AuthorizerAction.UpdateAuthorizationPolicy}
                  disabled={isSaving}
                  label="Update authorization policy"
                >
                  <>
                    {isSaving ? (
                      <>
                        <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                        <span className="ms-2">Saving</span>
                      </>
                    ) : (
                      <div className="d-flex flex-row align-items-center text-uppercase">
                        <FaPencilAlt className="me-2" />
                        <div>Save</div>
                      </div>
                    )}
                  </>
                </ActionBtn>
              </div>
            </div>
          </>
        )}

        <Alert message={apiError} type="danger" onClose={() => setApiError(null)} />
      </div>

      {confirmationModal.open && (
        <Modal
          className={`d-inline-block ${styles.modal}`}
          closeButton={
            <>
              <button
                className="btn btn-sm btn-outline-secondary text-uppercase"
                onClick={() => setConfirmationModal({ open: false })}
                aria-label="Cancel"
              >
                Cancel
              </button>

              <button
                className="btn btn-sm btn-outline-secondary text-uppercase ms-3"
                onClick={(e) => {
                  e.preventDefault();
                  confirmationModal.onConfirm!();
                  setConfirmationModal({ open: false });
                }}
                aria-label="Confirm"
              >
                Ok
              </button>
            </>
          }
          header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Confirm action</div>}
          onClose={() => setConfirmationModal({ open: false })}
          open
        >
          <div className="mt-3 mw-100 text-center">
            <p>{confirmationModal.message!}</p>
          </div>
        </Modal>
      )}
    </main>
  );
};

export default AuthorizationSection;
