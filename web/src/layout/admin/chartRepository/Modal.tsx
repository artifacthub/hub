import React, { useState, useRef } from 'react';
import classnames from 'classnames';
import isNull from 'lodash/isNull';
import { API } from '../../../api';
import { ChartRepository } from '../../../types';
import InputField from '../../common/InputField';
import isUndefined from 'lodash/isUndefined';
import Modal from '../../common/Modal';
import styles from './Modal.module.css';

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
      <div className="h-100 d-flex align-items-center">
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
            invalidText="This field is required"
            validateOnBlur
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
            invalidText="Please enter a valid url"
            onKeyDown={handleOnReturnKeyDown}
            validateOnBlur
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
