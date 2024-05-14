import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { ChangeEvent, MouseEvent as ReactMouseEvent, useContext, useEffect, useRef, useState } from 'react';
import { FaCheck, FaPencilAlt } from 'react-icons/fa';
import { IoIosArrowBack } from 'react-icons/io';
import { MdAddCircle, MdClose } from 'react-icons/md';
import { RiTestTubeFill } from 'react-icons/ri';

import API from '../../../../api';
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

const DEFAULT_PAYLOAD_KIND: PayloadKind = PayloadKind.default;

export const DEFAULT_PAYLOAD_TEMPLATE = `{
    "specversion" : "1.0",
    "id" : "{{ .Event.ID }}",
    "source" : "{{ .BaseURL }}",
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
    let currentPayloadKind: PayloadKind = DEFAULT_PAYLOAD_KIND;
    if (!isUndefined(props.webhook) && props.webhook.contentType && props.webhook.template) {
      currentPayloadKind = PayloadKind.custom;
    }
    return currentPayloadKind;
  };

  const [payloadKind, setPayloadKind] = useState<PayloadKind>(getPayloadKind());

  const onCloseForm = () => {
    props.onClose();
  };

  const onContentTypeChange = (e: ChangeEvent<HTMLInputElement>) => {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setIsSendingTest(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        const error = compoundErrorMessage(err, `An error occurred testing the webhook`);
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

  const updateTemplate = (e: ChangeEvent<HTMLTextAreaElement>) => {
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
  }, []);

  const getPublisher = (pkg: Package): JSX.Element => {
    return (
      <>
        {pkg.repository.userAlias || pkg.repository.organizationDisplayName || pkg.repository.organizationName}

        <small className="ms-2">
          (<span className={`text-uppercase text-muted d-none d-sm-inline ${styles.legend}`}>Repo: </span>
          <span className="text-dark">{pkg.repository.displayName || pkg.repository.name}</span>)
        </small>
      </>
    );
  };

  return (
    <div>
      <div className="mb-4 pb-2 border-bottom border-1">
        <button
          className={`btn btn-link text-dark btn-sm ps-0 d-flex align-items-center ${styles.link}`}
          onClick={onCloseForm}
          aria-label="Back to webhooks list"
        >
          <IoIosArrowBack className="me-2" />
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
          <div className="d-flex">
            <div className="col-md-8">
              <InputField
                type="text"
                label="Name"
                labelLegend={<small className="ms-1 fst-italic">(Required)</small>}
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

          <div className="d-flex">
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
            <label className={`form-label fw-bold ${styles.label}`} htmlFor="url">
              Url<small className="ms-1 fst-italic">(Required)</small>
            </label>
            <div className="form-text text-muted mb-2 mt-0">
              A POST request will be sent to the provided URL when any of the events selected in the triggers section
              happens.
            </div>
            <div className="d-flex">
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
            <label className={`form-label fw-bold ${styles.label}`} htmlFor="secret">
              Secret
            </label>
            <div className="form-text text-muted mb-2 mt-0">
              If you provide a secret, we'll send it to you in the <span className="fw-bold">X-ArtifactHub-Secret</span>{' '}
              header on each request. This will allow you to validate that the request comes from ArtifactHub.
            </div>
            <div className="d-flex">
              <div className="col-md-8">
                <InputField type="text" name="secret" value={!isUndefined(props.webhook) ? props.webhook.secret : ''} />
              </div>
            </div>
          </div>

          <div className="mb-3">
            <div className="form-check form-switch ps-0">
              <label htmlFor="active" className={`form-check-label fw-bold ${styles.label}`}>
                Active
              </label>
              <input
                id="active"
                type="checkbox"
                role="switch"
                className={`position-absolute ms-2 form-check-input ${styles.checkbox}`}
                value="true"
                onChange={() => setIsActive(!isActive)}
                checked={isActive}
              />
            </div>

            <div className="form-text text-muted mt-2">
              This flag indicates if the webhook is active or not. Inactive webhooks will not receive notifications.
            </div>
          </div>

          <div className="h4 pb-2 mt-4 mt-md-5 mb-4 border-bottom border-1">Triggers</div>

          <div className="my-4">
            <label className={`form-label fw-bold ${styles.label}`} htmlFor="kind" id="events-group">
              Events
            </label>

            <div role="group" aria-labelledby="events-group">
              {PACKAGE_SUBSCRIPTIONS_LIST.map((subs: SubscriptionItem) => {
                return (
                  <CheckBox
                    key={`check_${subs.kind}`}
                    name="eventKind"
                    value={subs.kind.toString()}
                    device="all"
                    label={subs.title}
                    checked={eventKinds.includes(subs.kind)}
                    onChange={() => {
                      updateEventKindList(subs.kind);
                      checkTestAvailability();
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div className="mb-4">
            <label className={`form-label fw-bold ${styles.label}`} htmlFor="packages" id="webhook-pkg-list">
              Packages<small className="ms-1 fst-italic">(Required)</small>
            </label>
            <div className="form-text text-muted mb-4 mt-0">
              When the events selected happen for any of the packages you've chosen, a notification will be triggered
              and the configured url will be called. At least one package must be selected.
            </div>
            <div className="mb-3 row">
              <div className="col-12 col-xxl-10 col-xxxl-8">
                <SearchPackages disabledPackages={getPackagesIds()} onSelection={addPackage} label="webhook-pkg-list" />
              </div>
            </div>

            {isValidated && selectedPackages.length === 0 && (
              <div className="invalid-feedback mt-0 d-block">At least one package has to be selected</div>
            )}

            {selectedPackages.length > 0 && (
              <div className="row">
                <div className="col-12 col-xxl-10 col-xxxl-8">
                  <table
                    className={`table table-hover table-sm border border-1 transparentBorder text-break ${styles.table}`}
                  >
                    <thead>
                      <tr className={styles.tableTitle}>
                        <th scope="col" className={`align-middle d-none d-sm-table-cell ${styles.fitCell}`}></th>
                        <th scope="col" className={`align-middle ${styles.packageCell}`}>
                          Package
                        </th>
                        <th scope="col" className="align-middle w-50 d-none d-sm-table-cell">
                          Publisher
                        </th>
                        <th scope="col" className={`align-middle ${styles.fitCell}`}></th>
                      </tr>
                    </thead>
                    <tbody className={styles.body}>
                      {selectedPackages.map((item: Package) => (
                        <tr key={`subs_${item.packageId}`} data-testid="packageTableCell">
                          <td className="align-middle text-center d-none d-sm-table-cell">
                            <RepositoryIcon kind={item.repository.kind} className={`${styles.icon} h-auto mx-2`} />
                          </td>
                          <td className="align-middle">
                            <div className="d-flex flex-row align-items-center">
                              <Image
                                alt={item.displayName || item.name}
                                imageId={item.logoImageId}
                                className={`fs-4 ${styles.image}`}
                                kind={item.repository.kind}
                              />

                              <div className={`ms-2 text-dark ${styles.cellWrapper}`}>
                                <div className="text-truncate">
                                  {item.displayName || item.name}
                                  <span className={`d-inline d-sm-none ${styles.legend}`}>
                                    <span className="mx-2">/</span>
                                    {getPublisher(item)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="align-middle position-relative text-dark d-none d-sm-table-cell">
                            <div className={`d-table w-100 ${styles.cellWrapper}`}>
                              <div className="text-truncate">{getPublisher(item)}</div>
                            </div>
                          </td>

                          <td className="align-middle">
                            <button
                              className={`btn btn-link btn-sm mx-2 ${styles.closeBtn}`}
                              type="button"
                              onClick={(event: ReactMouseEvent<HTMLButtonElement, MouseEvent>) => {
                                event.preventDefault();
                                event.stopPropagation();
                                deletePackage(item.packageId);
                              }}
                              aria-label="Delete package from webhook"
                            >
                              <MdClose className="text-danger fs-5" />
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

          <div className="h4 pb-2 mt-4 mt-md-5 mb-4 border-bottom border-1">Payload</div>

          <div className="d-flex flex-row mb-3">
            {PAYLOAD_KINDS_LIST.map((item: PayloadKindsItem) => {
              return (
                <div className="form-check me-4" key={`payload_${item.kind}`}>
                  <input
                    className="form-check-input"
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
                  <label className="form-check-label" htmlFor={`payload_${item.kind}`}>
                    {item.title}
                  </label>
                </div>
              );
            })}
          </div>

          {payloadKind === PayloadKind.custom && (
            <div className="lh-base">
              <div className="form-text text-muted mb-3">
                It's possible to customize the payload used to notify your service. This may help integrating
                ArtifactHub webhooks with other services without requiring you to write any code. To integrate
                ArtifactHub webhooks with Slack, for example, you could use a custom payload using the following
                template:
                <div className="my-3 w-100">
                  <div
                    className={`alert alert-light text-nowrap ${styles.codeWrapper}`}
                    role="alert"
                    aria-live="off"
                    aria-atomic="true"
                  >
                    {'{'}
                    <br />
                    <span className="ms-3">
                      {`"text": "Package`} <span className="fw-bold">{`{{ .Package.Name }}`}</span> {`version`}{' '}
                      <span className="fw-bold">{`{{ .Package.Version }}`}</span> released!{' '}
                      <span className="fw-bold">{`{{ .Package.URL }}`}</span>
                      {`"`}
                      <br />
                      {'}'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="d-flex">
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
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  onContentTypeChange(e);
                  checkTestAvailability();
                }}
              />
            </div>
          </div>

          <div className=" mb-4">
            <label className={`form-label fw-bold ${styles.label}`} htmlFor="template">
              Template
            </label>

            {payloadKind === PayloadKind.custom && (
              <div className="form-text text-muted mb-4 mt-0">
                Custom payloads are generated using{' '}
                <ExternalLink
                  href="https://golang.org/pkg/text/template/"
                  className="fw-bold text-dark"
                  label="Open Go templates documentation"
                >
                  Go templates
                </ExternalLink>
                . Below you will find a list of the variables available for use in your template.
              </div>
            )}

            <div className="row">
              <div className="col col-xxl-10 col-xxxl-8">
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
            <label className={`form-label fw-bold ${styles.label}`} htmlFor="template">
              Variables reference
            </label>
            <div className="row">
              <div className="col col-xxxl-8 overflow-auto">
                <small className={`text-muted ${styles.tableWrapper}`}>
                  <table className={`table table-sm border border-1 ${styles.variablesTable}`}>
                    <tbody>
                      <tr>
                        <th scope="row">
                          <span className="text-nowrap">{`{{ .BaseURL }}`}</span>
                        </th>
                        <td>Artifact Hub deployment base url.</td>
                      </tr>
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
                          Kind of the event triggering notification. Possible values are{' '}
                          <span className="fw-bold">package.new-release</span> and{' '}
                          <span className="fw-bold">package.security-alert</span>.
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
                          Kind of the change. Possible values are <span className="fw-bold">added</span>,{' '}
                          <span className="fw-bold">changed</span>, <span className="fw-bold">deprecated</span>,{' '}
                          <span className="fw-bold">removed</span>, <span className="fw-bold">fixed</span> and{' '}
                          <span className="fw-bold">security</span>. When the change kind is not provided, the value
                          will be empty.
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
                          <span className="fw-bold">falco</span>, <span className="fw-bold">helm</span>,{' '}
                          <span className="fw-bold">olm</span> and <span className="fw-bold">opa</span>.
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

          <div className={`mt-4 mt-md-5 ${styles.btnWrapper}`}>
            <div className="d-flex flex-row justify-content-between">
              <div className="d-flex flex-row align-items-center me-3">
                <button
                  type="button"
                  className="btn btn-sm btn-success"
                  onClick={triggerTest}
                  disabled={!isAvailableTest || isSendingTest}
                  aria-label="Test webhook"
                >
                  {isSendingTest ? (
                    <>
                      <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                      <span className="ms-2">
                        Testing <span className="d-none d-md-inline"> webhook</span>
                      </span>
                    </>
                  ) : (
                    <div className="d-flex flex-row align-items-center text-uppercase">
                      <RiTestTubeFill className="me-2" />{' '}
                      <div>
                        Test <span className="d-none d-sm-inline-block">webhook</span>
                      </div>
                    </div>
                  )}
                </button>

                {isTestSent && (
                  <span className="text-success ms-2" data-testid="testWebhookTick">
                    <FaCheck />
                  </span>
                )}
              </div>

              <div className="ms-auto">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary me-3"
                  onClick={onCloseForm}
                  aria-label="Cancel"
                >
                  <div className="d-flex flex-row align-items-center text-uppercase">
                    <MdClose className="me-2" />
                    <div>Cancel</div>
                  </div>
                </button>

                <button
                  className="btn btn-sm btn-outline-secondary"
                  type="button"
                  disabled={isSending}
                  onClick={submitForm}
                  aria-label="Add webhook"
                >
                  {isSending ? (
                    <>
                      <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                      <span className="ms-2">{isUndefined(props.webhook) ? 'Adding' : 'Updating'} webhook</span>
                    </>
                  ) : (
                    <div className="d-flex flex-row align-items-center text-uppercase">
                      {isUndefined(props.webhook) ? (
                        <>
                          <MdAddCircle className="me-2" />
                          <span>Add</span>
                        </>
                      ) : (
                        <>
                          <FaPencilAlt className="me-2" />
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
