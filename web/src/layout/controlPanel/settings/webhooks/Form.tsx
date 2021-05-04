import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { FaCheck, FaPencilAlt } from 'react-icons/fa';
import { IoIosArrowBack } from 'react-icons/io';
import { MdAddCircle, MdClose } from 'react-icons/md';
import { RiTestTubeFill } from 'react-icons/ri';

import { API } from '../../../../api';
import { AppCtx } from '../../../../context/AppCtx';
import { ErrorKind, EventKind, Package, PayloadKind, RefInputField, TestWebhook, Webhook } from '../../../../types';
import compoundErrorMessage from '../../../../utils/compoundErrorMessage';
import {
  PACKAGE_SUBSCRIPTIONS_LIST,
  PAYLOAD_KINDS_LIST,
  PayloadKindsItem,
  SubscriptionItem,
} from '../../../../utils/data';
import Alert from '../../../common/Alert';
import AutoresizeTextarea from '../../../common/AutoresizeTextarea';
import CheckBox from '../../../common/Checkbox';
import ExternalLink from '../../../common/ExternalLink';
import Image from '../../../common/Image';
import InputField from '../../../common/InputField';
import RepositoryIcon from '../../../common/RepositoryIcon';
import SearchPackages from '../../../common/SearchPackages';
import styles from './Form.module.css';

interface Props {
  webhook?: Webhook;
  onSuccess: () => void;
  onClose: () => void;
  onAuthError: () => void;
}

interface FormValidation {
  isValid: boolean;
  webhook: Webhook | null;
}

const DEAFULT_PAYLOAD_KIND: PayloadKind = PayloadKind.default;

export const DEFAULT_PAYLOAD_TEMPLATE = `{
    "specversion" : "1.0",
    "id" : "{{ .Event.ID }}",
    "source" : "https://artifacthub.io/cloudevents",
    "type" : "io.artifacthub.{{ .Event.Kind }}",
    "datacontenttype" : "application/json",
    "data" : {
        "package": {
            "name": "{{ .Package.Name }}",
            "version": "{{ .Package.Version }}",
            "url": "{{ .Package.URL }}",
            "changes": [{{range $i, $e := .Package.Changes}}{{if $i}}, {{end}}"{{.Description}}"{{end}}],
            "containsSecurityUpdates": {{ .Package.ContainsSecurityUpdates }},
            "prerelease": {{ .Package.Prerelease }},
            "repository": {
                "kind": "{{ .Package.Repository.Kind }}",
                "name": "{{ .Package.Repository.Name }}",
                "publisher": "{{ .Package.Repository.Publisher }}"
            }
        }
    }
}`;

const WebhookForm = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const form = useRef<HTMLFormElement>(null);
  const urlInput = useRef<RefInputField>(null);
  const contentTypeInput = useRef<RefInputField>(null);
  const [isSending, setIsSending] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedPackages, setSelectedPackages] = useState<Package[]>(
    !isUndefined(props.webhook) && props.webhook.packages ? props.webhook.packages : []
  );
  const [eventKinds, setEventKinds] = useState<EventKind[]>(
    !isUndefined(props.webhook) ? props.webhook.eventKinds : [EventKind.NewPackageRelease]
  );
  const [isActive, setIsActive] = useState<boolean>(!isUndefined(props.webhook) ? props.webhook.active : true);
  const [contentType, setContentType] = useState<string>(
    !isUndefined(props.webhook) && props.webhook.contentType ? props.webhook.contentType : ''
  );
  const [template, setTemplate] = useState<string>(
    !isUndefined(props.webhook) && props.webhook.template ? props.webhook.template : ''
  );
  const [isAvailableTest, setIsAvailableTest] = useState<boolean>(false);
  const [currentTestWebhook, setCurrentTestWebhook] = useState<TestWebhook | null>(null);
  const [isTestSent, setIsTestSent] = useState<boolean>(false);
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);

  const getPayloadKind = (): PayloadKind => {
    let currentPayloadKind: PayloadKind = DEAFULT_PAYLOAD_KIND;
    if (!isUndefined(props.webhook) && props.webhook.contentType && props.webhook.template) {
      currentPayloadKind = PayloadKind.custom;
    }
    return currentPayloadKind;
  };

  const [payloadKind, setPayloadKind] = useState<PayloadKind>(getPayloadKind());

  const onCloseForm = () => {
    props.onClose();
  };

  const onContentTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContentType(e.target.value);
  };

  async function handleWebhook(webhook: Webhook) {
    try {
      setIsSending(true);
      if (isUndefined(props.webhook)) {
        await API.addWebhook(webhook, ctx.prefs.controlPanel.selectedOrg!);
      } else {
        await API.updateWebhook(webhook, ctx.prefs.controlPanel.selectedOrg!);
      }
      setIsSending(false);
      props.onSuccess();
      onCloseForm();
    } catch (err) {
      setIsSending(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        let error = compoundErrorMessage(
          err,
          `An error occurred ${isUndefined(props.webhook) ? 'adding' : 'updating'} the webhook`
        );
        if (!isUndefined(props.webhook) && err.kind === ErrorKind.Forbidden) {
          error = `You do not have permissions to ${isUndefined(props.webhook) ? 'add' : 'update'} the webhook ${
            isUndefined(props.webhook) ? 'to' : 'from'
          } the organization.`;
        }
        setApiError(error);
      } else {
        props.onAuthError();
      }
    }
  }

  async function triggerWebhookTest(webhook: TestWebhook) {
    try {
      setIsSendingTest(true);
      setIsTestSent(false);
      await API.triggerWebhookTest(webhook);
      setIsTestSent(true);
      setIsSendingTest(false);
    } catch (err) {
      setIsSendingTest(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        let error = compoundErrorMessage(err, `An error occurred testing the webhook`);
        setApiError(error);
      } else {
        props.onAuthError();
      }
    }
  }

  const triggerTest = () => {
    if (!isNull(currentTestWebhook)) {
      cleanApiError();
      triggerWebhookTest(currentTestWebhook);
    }
  };

  const submitForm = () => {
    if (form.current) {
      cleanApiError();
      const { isValid, webhook } = validateForm(form.current);
      if (isValid && !isNull(webhook)) {
        handleWebhook(webhook);
      }
    }
  };

  const validateForm = (form: HTMLFormElement): FormValidation => {
    let webhook: Webhook | null = null;
    const formData = new FormData(form);
    const isValid = form.checkValidity() && selectedPackages.length > 0;

    if (isValid) {
      webhook = {
        name: formData.get('name') as string,
        url: formData.get('url') as string,
        secret: formData.get('secret') as string,
        description: formData.get('description') as string,
        eventKinds: eventKinds,
        active: isActive,
        packages: selectedPackages,
      };

      if (payloadKind === PayloadKind.custom) {
        webhook = {
          ...webhook,
          template: template,
          contentType: contentType,
        };
      }

      if (props.webhook) {
        webhook = {
          ...webhook,
          webhookId: props.webhook.webhookId,
        };
      }
    }
    setIsValidated(true);
    return { isValid, webhook };
  };

  const addPackage = (packageItem: Package) => {
    const packagesList = [...selectedPackages];
    packagesList.push(packageItem);
    setSelectedPackages(packagesList);
  };

  const deletePackage = (packageId: string) => {
    const packagesList = selectedPackages.filter((item: Package) => item.packageId !== packageId);
    setSelectedPackages(packagesList);
  };

  const getPackagesIds = (): string[] => {
    return selectedPackages.map((item: Package) => item.packageId);
  };

  const updateEventKindList = (eventKind: EventKind) => {
    let updatedEventKinds: EventKind[] = [...eventKinds];
    if (eventKinds.includes(eventKind)) {
      // At least event kind must be selected
      if (updatedEventKinds.length > 1) {
        updatedEventKinds = eventKinds.filter((kind: EventKind) => kind !== eventKind);
      }
    } else {
      updatedEventKinds.push(eventKind);
    }
    setEventKinds(updatedEventKinds);
  };

  const cleanApiError = () => {
    if (!isNull(apiError)) {
      setApiError(null);
    }
  };

  const updateTemplate = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTemplate(e.target.value);
    checkTestAvailability();
  };

  const checkTestAvailability = () => {
    const formData = new FormData(form.current!);

    let webhook: TestWebhook = {
      url: formData.get('url') as string,
      eventKinds: eventKinds,
    };

    if (payloadKind === PayloadKind.custom) {
      webhook = {
        ...webhook,
        template: template,
        contentType: contentType,
      };
    }

    const isFilled = Object.values(webhook).every((x) => x !== null && x !== '');

    if (urlInput.current!.checkValidity() && isFilled) {
      setCurrentTestWebhook(webhook);
      setIsAvailableTest(true);
    } else {
      setCurrentTestWebhook(null);
      setIsAvailableTest(false);
    }
  };

  useEffect(() => {
    checkTestAvailability();
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <div>
      <div className="mb-4 pb-2 border-bottom">
        <button
          data-testid="goBack"
          className={`btn btn-link text-dark btn-sm pl-0 d-flex align-items-center ${styles.link}`}
          onClick={onCloseForm}
        >
          <IoIosArrowBack className="mr-2" />
          Back to webhooks list
        </button>
      </div>

      <div className="mt-2">
        <form
          ref={form}
          data-testid="webhookForm"
          className={classnames('w-100', { 'needs-validation': !isValidated }, { 'was-validated': isValidated })}
          onClick={() => setApiError(null)}
          autoComplete="off"
          noValidate
        >
          <div className="form-row">
            <div className="col-md-8">
              <InputField
                type="text"
                label="Name"
                labelLegend={<small className="ml-1 font-italic">(Required)</small>}
                name="name"
                value={!isUndefined(props.webhook) ? props.webhook.name : ''}
                invalidText={{
                  default: 'This field is required',
                }}
                validateOnBlur
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="col-md-8">
              <InputField
                type="text"
                label="Description"
                name="description"
                value={!isUndefined(props.webhook) ? props.webhook.description : ''}
              />
            </div>
          </div>

          <div>
            <label className={`font-weight-bold ${styles.label}`} htmlFor="url">
              Url<small className="ml-1 font-italic">(Required)</small>
            </label>
            <div>
              <small className="form-text text-muted mb-2 mt-0">
                A POST request will be sent to the provided URL when any of the events selected in the triggers section
                happens.
              </small>
            </div>
            <div className="form-row">
              <div className="col-md-8">
                <InputField
                  ref={urlInput}
                  type="url"
                  name="url"
                  value={!isUndefined(props.webhook) ? props.webhook.url : ''}
                  invalidText={{
                    default: 'This field is required',
                    typeMismatch: 'Please enter a valid url',
                  }}
                  onChange={checkTestAvailability}
                  validateOnBlur
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className={`font-weight-bold ${styles.label}`} htmlFor="secret">
              Secret
            </label>
            <div>
              <small className="form-text text-muted mb-2 mt-0">
                If you provide a secret, we'll send it to you in the{' '}
                <span className="font-weight-bold">X-ArtifactHub-Secret</span> header on each request. This will allow
                you to validate that the request comes from ArtifactHub.
              </small>
            </div>
            <div className="form-row">
              <div className="col-md-8">
                <InputField type="text" name="secret" value={!isUndefined(props.webhook) ? props.webhook.secret : ''} />
              </div>
            </div>
          </div>

          <div className="mb-3">
            <div className="custom-control custom-switch pl-0">
              <input
                data-testid="activeCheckbox"
                id="active"
                type="checkbox"
                className={`custom-control-input ${styles.checkbox}`}
                value="true"
                onChange={() => setIsActive(!isActive)}
                checked={isActive}
              />
              <label
                htmlFor="active"
                className={`custom-control-label font-weight-bold ${styles.label} ${styles.customControlRightLabel}`}
              >
                Active
              </label>
            </div>

            <small className="form-text text-muted mt-2">
              This flag indicates if the webhook is active or not. Inactive webhooks will not receive notifications.
            </small>
          </div>

          <div className="h4 pb-2 mt-4 mt-md-5 mb-4 border-bottom">Triggers</div>

          <div className="my-4">
            <label className={`font-weight-bold ${styles.label}`} htmlFor="kind">
              Events
            </label>

            {PACKAGE_SUBSCRIPTIONS_LIST.map((subs: SubscriptionItem) => {
              return (
                <CheckBox
                  key={`check_${subs.kind}`}
                  name="eventKind"
                  value={subs.kind.toString()}
                  label={subs.title}
                  checked={eventKinds.includes(subs.kind)}
                  onChange={() => {
                    updateEventKindList(subs.kind);
                    checkTestAvailability();
                  }}
                  disabled
                />
              );
            })}
          </div>

          <div className="mb-4">
            <label className={`font-weight-bold ${styles.label}`} htmlFor="packages">
              Packages<small className="ml-1 font-italic">(Required)</small>
            </label>
            <div>
              <small className="form-text text-muted mb-4 mt-0">
                When the events selected happen for any of the packages you've chosen, a notification will be triggered
                and the configured url will be called. At least one package must be selected.
              </small>
            </div>
            <div className="mb-3 row">
              <div className="col-12 col-xxl-8">
                <SearchPackages disabledPackages={getPackagesIds()} onSelection={addPackage} />
              </div>
            </div>

            {isValidated && selectedPackages.length === 0 && (
              <div className="invalid-feedback mt-0 d-block">At least one package has to be selected</div>
            )}

            {selectedPackages.length > 0 && (
              <div className="row">
                <div className="col-12 col-xxl-8">
                  <table className={`table table-hover table-sm ${styles.table}`}>
                    <thead>
                      <tr className={`table-primary ${styles.tableTitle}`}>
                        <th scope="col" className={`align-middle d-none d-sm-table-cell ${styles.fitCell}`}></th>
                        <th scope="col" className="align-middle w-50">
                          Package
                        </th>
                        <th scope="col" className="align-middle w-50">
                          Publisher
                        </th>
                        <th scope="col" className={`align-middle ${styles.fitCell}`}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPackages.map((item: Package) => (
                        <tr key={`subs_${item.packageId}`} data-testid="packageTableCell">
                          <td className="align-middle text-center d-none d-sm-table-cell">
                            <RepositoryIcon kind={item.repository.kind} className={`${styles.icon} mx-2`} />
                          </td>
                          <td className="align-middle">
                            <div className="d-flex flex-row align-items-center">
                              <div
                                className={`d-flex align-items-center justify-content-center overflow-hidden ${styles.imageWrapper} imageWrapper`}
                              >
                                <Image
                                  alt={item.displayName || item.name}
                                  imageId={item.logoImageId}
                                  className={styles.image}
                                />
                              </div>

                              <div className="ml-2 text-dark">{item.displayName || item.name}</div>
                            </div>
                          </td>
                          <td className="align-middle position-relative text-dark">
                            {item.repository.userAlias ||
                              item.repository.organizationDisplayName ||
                              item.repository.organizationName}

                            <small className="ml-2">
                              (
                              <span className={`text-uppercase text-muted d-none d-sm-inline ${styles.legend}`}>
                                Repo:{' '}
                              </span>
                              <span className="text-dark">{item.repository.displayName || item.repository.name}</span>)
                            </small>
                          </td>

                          <td className="align-middle">
                            <button
                              data-testid="deletePackageButton"
                              className={`close text-danger mx-2 ${styles.closeBtn}`}
                              type="button"
                              onClick={(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
                                event.preventDefault();
                                event.stopPropagation();
                                deletePackage(item.packageId);
                              }}
                            >
                              <span aria-hidden="true">&times;</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="h4 pb-2 mt-4 mt-md-5 mb-4 border-bottom">Payload</div>

          <div className="d-flex flex-row mb-3">
            {PAYLOAD_KINDS_LIST.map((item: PayloadKindsItem) => {
              return (
                <div className="custom-control custom-radio mr-4" key={`payload_${item.kind}`}>
                  <input
                    data-testid={`${item.name}Radio`}
                    className="custom-control-input"
                    type="radio"
                    id={`payload_${item.kind}`}
                    name="payloadKind"
                    value={item.name}
                    checked={payloadKind === item.kind}
                    onChange={() => {
                      setPayloadKind(item.kind);
                      setIsValidated(false);
                      checkTestAvailability();
                    }}
                  />
                  <label className="custom-control-label" htmlFor={`payload_${item.kind}`}>
                    {item.title}
                  </label>
                </div>
              );
            })}
          </div>

          {payloadKind === PayloadKind.custom && (
            <small className="form-text text-muted mb-3">
              It's possible to customize the payload used to notify your service. This may help integrating ArtifactHub
              webhooks with other services without requiring you to write any code. To integrate ArtifactHub webhooks
              with Slack, for example, you could use a custom payload using the following template:
              <div className="my-3 w-100">
                <div className={`alert alert-light text-nowrap ${styles.codeWrapper}`} role="alert">
                  {'{'}
                  <br />
                  <span className="ml-3">
                    {`"text": "Package`} <span className="font-weight-bold">{`{{ .Package.Name }}`}</span> {`version`}{' '}
                    <span className="font-weight-bold">{`{{ .Package.Version }}`}</span> released!{' '}
                    <span className="font-weight-bold">{`{{ .Package.URL }}`}</span>
                    {`"`}
                    <br />
                    {'}'}
                  </span>
                </div>
              </div>
            </small>
          )}

          <div className="form-row">
            <div className="col-md-8">
              <InputField
                ref={contentTypeInput}
                type="text"
                label="Request Content-Type"
                name="contentType"
                value={contentType}
                placeholder={payloadKind === PayloadKind.default ? 'application/cloudevents+json' : 'application/json'}
                disabled={payloadKind === PayloadKind.default}
                required={payloadKind !== PayloadKind.default}
                invalidText={{
                  default: 'This field is required',
                }}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  onContentTypeChange(e);
                  checkTestAvailability();
                }}
              />
            </div>
          </div>

          <div className="form-group mb-4">
            <label className={`font-weight-bold ${styles.label}`} htmlFor="template">
              Template
            </label>

            {payloadKind === PayloadKind.custom && (
              <div>
                <small className="form-text text-muted mb-4 mt-0">
                  Custom payloads are generated using{' '}
                  <ExternalLink href="https://golang.org/pkg/text/template/" className="font-weight-bold text-dark">
                    Go templates
                  </ExternalLink>
                  . Below you will find a list of the variables available for use in your template.
                </small>
              </div>
            )}

            <div className="form-row">
              <div className="col-xxl-8">
                <AutoresizeTextarea
                  name="template"
                  value={payloadKind === PayloadKind.default ? DEFAULT_PAYLOAD_TEMPLATE : template}
                  disabled={payloadKind === PayloadKind.default}
                  required={payloadKind !== PayloadKind.default}
                  invalidText="This field is required"
                  minRows={6}
                  onChange={updateTemplate}
                />
              </div>
            </div>
          </div>

          <div className="mb-3">
            <label className={`font-weight-bold ${styles.label}`} htmlFor="template">
              Variables reference
            </label>
            <div className="form-row">
              <div className="col-xxl-8">
                <small className="form-text text-muted">
                  <table className={`table table-sm ${styles.variablesTable}`}>
                    <tbody>
                      <tr>
                        <th scope="row">
                          <span className="text-nowrap">{`{{ .Event.ID }}`}</span>
                        </th>
                        <td>Id of the event triggering the notification.</td>
                      </tr>
                      <tr>
                        <th scope="row">
                          <span className="text-nowrap">{`{{ .Event.Kind }}`}</span>
                        </th>
                        <td>
                          Kind of the event triggering notification. At the moment the only possible value is{' '}
                          <span className="font-weight-bold">package.new-release</span>.
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">
                          <span className="text-nowrap">{`{{ .Package.Name }}`}</span>
                        </th>
                        <td>Name of the package.</td>
                      </tr>
                      <tr>
                        <th scope="row">
                          <span className="text-nowrap">{`{{ .Package.Version }}`}</span>
                        </th>
                        <td>Version of the new release.</td>
                      </tr>
                      <tr>
                        <th scope="row">
                          <span className="text-nowrap">{`{{ .Package.URL }}`}</span>
                        </th>
                        <td>ArtifactHub URL of the package.</td>
                      </tr>
                      <tr>
                        <th scope="row">
                          <span className="text-nowrap">{`{{ .Package.Changes }}`}</span>
                        </th>
                        <td>List of changes this package version introduces.</td>
                      </tr>
                      <tr>
                        <th scope="row">
                          <span className="text-nowrap">{`{{ .Package.Changes[i].Kind }}`}</span>
                        </th>
                        <td>
                          Kind of the change. Possible values are <span className="font-weight-bold">added</span>,{' '}
                          <span className="font-weight-bold">changed</span>,{' '}
                          <span className="font-weight-bold">deprecated</span>,{' '}
                          <span className="font-weight-bold">removed</span>,{' '}
                          <span className="font-weight-bold">fixed</span> and{' '}
                          <span className="font-weight-bold">security</span>. When the change kind is not provided, the
                          value will be empty.
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">
                          <span className="text-nowrap">{`{{ .Package.Changes[i].Description }}`}</span>
                        </th>
                        <td>Brief text explaining the change.</td>
                      </tr>
                      <tr>
                        <th scope="row">
                          <span className="text-nowrap">{`{{ .Package.Changes[i].Links }}`}</span>
                        </th>
                        <td>List of links related to the change.</td>
                      </tr>
                      <tr>
                        <th scope="row">
                          <span className="text-nowrap">{`{{ .Package.Changes[i].Links[i].Name }}`}</span>
                        </th>
                        <td>Name of the link.</td>
                      </tr>
                      <tr>
                        <th scope="row">
                          <span className="text-nowrap">{`{{ .Package.Changes[i].Links[i].URL }}`}</span>
                        </th>
                        <td>Url of the link.</td>
                      </tr>
                      <tr>
                        <th scope="row">
                          <span className="text-nowrap">{`{{ .Package.ContainsSecurityUpdates }}`}</span>
                        </th>
                        <td>Boolean flag that indicates whether this package contains security updates or not.</td>
                      </tr>
                      <tr>
                        <th scope="row">
                          <span className="text-nowrap">{`{{ .Package.Prerelease }}`}</span>
                        </th>
                        <td>Boolean flag that indicates whether this package version is a pre-release or not.</td>
                      </tr>
                      <tr>
                        <th scope="row">
                          <span className="text-nowrap">{`{{ .Package.Repository.Kind }}`}</span>
                        </th>
                        <td>
                          Kind of the repository associated with the notification. Possible values are{' '}
                          <span className="font-weight-bold">falco</span>,{' '}
                          <span className="font-weight-bold">helm</span>, <span className="font-weight-bold">olm</span>{' '}
                          and <span className="font-weight-bold">opa</span>.
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">
                          <span className="text-nowrap">{`{{ .Package.Repository.Name }}`}</span>
                        </th>
                        <td>Name of the repository.</td>
                      </tr>
                      <tr>
                        <th scope="row">
                          <span className="text-nowrap">{`{{ .Package.Repository.Publisher }}`}</span>
                        </th>
                        <td>
                          Publisher of the repository. If the owner is a user it'll be the user alias. If it's an
                          organization, it'll be the organization name.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </small>
              </div>
            </div>
          </div>

          <div className="mt-4 mt-md-5">
            <div className="d-flex flex-row justify-content-between">
              <div className="d-flex flex-row align-items-center mr-3">
                <button
                  data-testid="testWebhookBtn"
                  type="button"
                  className="btn btn-sm btn-success"
                  onClick={triggerTest}
                  disabled={!isAvailableTest || isSendingTest}
                >
                  {isSendingTest ? (
                    <>
                      <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                      <span className="ml-2">
                        Testing <span className="d-none d-md-inline"> webhook</span>
                      </span>
                    </>
                  ) : (
                    <div className="d-flex flex-row align-items-center text-uppercase">
                      <RiTestTubeFill className="mr-2" />{' '}
                      <div>
                        Test <span className="d-none d-sm-inline-block">webhook</span>
                      </div>
                    </div>
                  )}
                </button>

                {isTestSent && (
                  <span className="text-success ml-2" data-testid="testWebhookTick">
                    <FaCheck />
                  </span>
                )}
              </div>

              <div className="ml-auto">
                <button type="button" className={`btn btn-sm btn-light mr-3 ${styles.btnLight}`} onClick={onCloseForm}>
                  <div className="d-flex flex-row align-items-center text-uppercase">
                    <MdClose className="mr-2" />
                    <div>Cancel</div>
                  </div>
                </button>

                <button
                  className="btn btn-sm btn-secondary"
                  type="button"
                  disabled={isSending}
                  onClick={submitForm}
                  data-testid="sendWebhookBtn"
                >
                  {isSending ? (
                    <>
                      <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                      <span className="ml-2">{isUndefined(props.webhook) ? 'Adding' : 'Updating'} webhook</span>
                    </>
                  ) : (
                    <div className="d-flex flex-row align-items-center text-uppercase">
                      {isUndefined(props.webhook) ? (
                        <>
                          <MdAddCircle className="mr-2" />
                          <span>Add</span>
                        </>
                      ) : (
                        <>
                          <FaPencilAlt className="mr-2" />
                          <div>Save</div>
                        </>
                      )}
                    </div>
                  )}
                </button>
              </div>
            </div>

            <Alert message={apiError} type="danger" onClose={() => setApiError(null)} />
          </div>
        </form>
      </div>
    </div>
  );
};

export default WebhookForm;
