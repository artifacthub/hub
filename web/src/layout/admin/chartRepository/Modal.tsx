import React, { useState, useRef } from 'react';
import classnames from 'classnames';
import isNull from 'lodash/isNull';
import { API } from '../../../api';
import { ChartRepository, ResourceKind } from '../../../types';
import InputField from '../../common/InputField';
import isUndefined from 'lodash/isUndefined';
import Modal from '../../common/Modal';
import styles from './Modal.module.css';
import ExternalLink from '../../common/ExternalLink';

interface FormValidation {
  isValid: boolean;
  chartRepository: ChartRepository | null;
}

interface Props {
  open: boolean;
  chartRepository?: ChartRepository;
  onSuccess?: () => void;
  onClose: () => void;
  onAuthError: () => void;
}

const ChartRepositoryModal = (props: Props) => {
  const form = useRef<HTMLFormElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Clean API error when form is focused after validation
  const cleanApiError = () => {
    if (!isNull(apiError)) {
      setApiError(null);
    }
  }

  const onCloseModal = () => {
    props.onClose();
  }

  async function handleChartRepository(chartRepository: ChartRepository) {
    try {
      if (isUndefined(props.chartRepository)) {
        await API.addChartRepository(chartRepository);
      } else {
        await API.updateChartRepository(chartRepository);
      }
      if (!isUndefined(props.onSuccess)) {
        props.onSuccess();
      }
      setIsSending(false);
      onCloseModal();
    } catch(err) {
      setIsSending(false);
      if (err.statusText !== 'ErrLoginRedirect') {
        setApiError('An error occureed adding the chart repository, please try again later');
      } else {
        props.onAuthError();
      }
    }
  }

  const submitForm = () => {
    cleanApiError();
    setIsSending(true);
    if (form.current) {
      const {isValid, chartRepository} = validateForm(form.current);
      if (isValid) {
        handleChartRepository(chartRepository!);
      } else {
        setIsSending(false);
      }
    }
  }

  const validateForm = (form: HTMLFormElement): FormValidation => {
    let isValid = form.checkValidity();
    let chartRepository: ChartRepository | null = null;

    if (isValid) {
      const formData = new FormData(form);
      chartRepository = {
        name: formData.get('name') as string,
        url: formData.get('url') as string,
        displayName: formData.get('displayName') as string,
      };
    } else {
      setIsValidated(true);
    }
    return { isValid, chartRepository };
  }

  const handleOnReturnKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter' && !isNull(form)) {
      submitForm();
    }
  }

  return (
    <Modal
      header={(
        <div className="h3 m-2">
          {isUndefined(props.chartRepository) ? (
            <>Add chart repository</>
          ) : (
            <>Update chart repository</>
          )}
        </div>
      )}
      open={props.open}
      modalClassName={styles.modal}
      closeButton={(
        <button
          className="btn btn-secondary"
          type="button"
          disabled={isSending}
          onClick={submitForm}
        >
          {isSending ? (
            <>
              <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
              <span className="ml-2">
                {isUndefined(props.chartRepository) ? (
                  <>Adding chart repository</>
                ) : (
                  <>Updating chart repository</>
                )}
              </span>
            </>
          ) : (
            <>
              {isUndefined(props.chartRepository) ? (
                <>Add</>
              ) : (
                <>Update</>
              )}
            </>
          )}
        </button>
      )}
      onClose={onCloseModal}
    >
      <div className="w-100">
        <form
          ref={form}
          className={classnames(
            'w-100',
            {'needs-validation': !isValidated},
            {'was-validated': isValidated},
          )}
          onFocus={cleanApiError}
          autoComplete="on"
          noValidate
        >
          <InputField
            type="text"
            label="Name"
            labelLegend={<small className="ml-1 font-italic">(Required)</small>}
            name="name"
            value={!isUndefined(props.chartRepository) ? props.chartRepository.name : ''}
            readOnly={!isUndefined(props.chartRepository)}
            invalidText={{
              default: "This field is required",
              patternMismatch: "Only lower case letters, numbers or hyphens. Must start with a letter",
              customError: "There is another repository with this name",
            }}
            validateOnBlur
            checkAvailability={ResourceKind.chartRepositoryName}
            pattern="[a-z][a-z0-9-]*"
            autoComplete="off"
            required
          />

          <InputField
            type="text"
            label="Display name"
            name="displayName"
            value={!isUndefined(props.chartRepository) && !isNull(props.chartRepository.displayName) ? props.chartRepository.displayName : ''}
          />

          <InputField
            type="url"
            label="Url"
            labelLegend={<small className="ml-1 font-italic">(Required)</small>}
            name="url"
            value={!isUndefined(props.chartRepository) ? props.chartRepository.url : ''}
            invalidText={{
              default: "This field is required",
              typeMismatch: "Please enter a valid url",
              customError: "There is another repository using this url",
            }}
            onKeyDown={handleOnReturnKeyDown}
            validateOnBlur
            checkAvailability={ResourceKind.chartRepositoryURL}
            additionalInfo={(
              <small className="text-muted text-break mt-1">
                <p>Base URL of the repository where the index.yaml and optionally some package charts are hosted.</p>
                <p>
                  If you host your charts in Github, you can use <ExternalLink href="https://helm.sh/docs/topics/chart_repository/#github-pages-example" className="text-reset"><u>GitHub Pages</u></ExternalLink> to serve them or you can use a URL like the one below:
                </p>
                <p className={`font-italic ml-3 ${styles.inputAdditionalInfoURL}`}>
                  https://raw.githubusercontent.com/USERNAME/REPO/BRANCH/PATH/TO/CHARTS
                </p>
                <p className="mb-0">
                  For more information about how to create and host your own chart repository please visit the <ExternalLink href="https://helm.sh/docs/topics/chart_repository/" className="text-reset"><u>Helm chart repository guide</u></ExternalLink>.
                </p>
              </small>
            )}
            required
          />

          {!isNull(apiError) && (
            <div className="alert alert-danger mt-3" role="alert">
              {apiError}
            </div>
          )}
        </form>
      </div>
    </Modal>
  );
}

export default ChartRepositoryModal;
