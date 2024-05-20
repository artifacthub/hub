import classnames from 'classnames';
import every from 'lodash/every';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { Dispatch, FormEvent, forwardRef, SetStateAction, useContext, useRef, useState } from 'react';
import { MdBusiness } from 'react-icons/md';

import API from '../../../api';
import { AppCtx, updateOrg } from '../../../context/AppCtx';
import { ErrorKind, Organization, RefInputField, ResourceKind } from '../../../types';
import compoundErrorMessage from '../../../utils/compoundErrorMessage';
import InputField from '../../common/InputField';
import InputFileField from '../../common/InputFileField';
import styles from './Form.module.css';

interface FormValidation {
  isValid: boolean;
  organization: Organization | null;
}

interface Props {
  organization?: Organization;
  onSuccess?: () => void;
  onAuthError: () => void;
  setIsSending: (status: boolean) => void;
  setApiError?: Dispatch<SetStateAction<null | string>>;
}

const OrganizationForm = forwardRef<HTMLFormElement, Props>((props, ref) => {
  const { ctx, dispatch } = useContext(AppCtx);
  const [imageId, setImageId] = useState<string | undefined>(
    props.organization ? props.organization.logoImageId : undefined
  );
  const nameInput = useRef<RefInputField>(null);
  const homeUrlInput = useRef<RefInputField>(null);
  const [isValidated, setIsValidated] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Clean API error when form is focused after validation
  const cleanApiError = () => {
    if (!isNull(apiError)) {
      setApiError(null);
      if (!isUndefined(props.setApiError)) {
        props.setApiError(null);
      }
    }
  };

  async function handleOrganization(organization: Organization) {
    try {
      if (isUndefined(props.organization)) {
        await API.addOrganization(organization);
        if (!isUndefined(props.onSuccess)) {
          props.onSuccess();
        }
      } else {
        await API.updateOrganization(organization, props.organization.name);
        if (ctx.prefs.controlPanel.selectedOrg && ctx.prefs.controlPanel.selectedOrg === props.organization.name) {
          dispatch(updateOrg(organization.name));
        }
      }
      props.setIsSending(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      props.setIsSending(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        let error = compoundErrorMessage(
          err,
          `An error occurred ${isUndefined(props.organization) ? 'adding' : 'updating'} the organization`
        );
        if (err.kind === ErrorKind.Forbidden && !isUndefined(props.organization)) {
          error = `You do not have permissions to update the organization.`;
        }
        setApiError(error);
        if (!isUndefined(props.setApiError)) {
          props.setApiError(error);
        }
      } else {
        props.onAuthError();
      }
    }
  }

  const submitForm = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    cleanApiError();
    props.setIsSending(true);
    if (e.currentTarget) {
      validateForm(e.currentTarget).then((validation: FormValidation) => {
        if (validation.isValid && !isNull(validation.organization)) {
          handleOrganization(validation.organization);
        } else {
          props.setIsSending(false);
        }
      });
    }
  };

  const validateForm = async (form: HTMLFormElement): Promise<FormValidation> => {
    let organization: Organization | null = null;

    return validateAllFields().then((isValid: boolean) => {
      if (isValid) {
        const formData = new FormData(form);
        organization = {
          name: formData.get('name') as string,
          displayName: formData.get('displayName') as string,
          homeUrl: formData.get('homeUrl') as string,
          description: formData.get('description') as string,
        };

        if (!isUndefined(imageId)) {
          organization.logoImageId = imageId;
        }
      }
      setIsValidated(true);
      return { isValid, organization };
    });
  };

  const validateAllFields = async (): Promise<boolean> => {
    return Promise.all([nameInput.current!.checkIsValid(), homeUrlInput.current!.checkIsValid()]).then(
      (res: boolean[]) => {
        return every(res, (isValid: boolean) => isValid);
      }
    );
  };

  return (
    <form
      ref={ref}
      data-testid="organizationForm"
      className={classnames('w-100', { 'needs-validation': !isValidated }, { 'was-validated': isValidated })}
      onFocus={cleanApiError}
      autoComplete="on"
      onSubmit={(e: FormEvent<HTMLFormElement>) => submitForm(e)}
      noValidate
    >
      <InputFileField
        name="logo"
        label="Logo"
        labelLegend={<small className="ms-1 fst-italic">(Click on the image to update)</small>}
        value={imageId}
        placeholderIcon={<MdBusiness />}
        circularCrop={false}
        onImageChange={(imageId: string) => setImageId(imageId)}
        onAuthError={props.onAuthError}
      />

      <InputField
        ref={nameInput}
        type="text"
        label="Name"
        labelLegend={<small className="ms-1 fst-italic">(Required)</small>}
        name="name"
        value={props.organization ? props.organization.name : ''}
        invalidText={{
          default: 'This field is required',
          patternMismatch: 'Only lower case letters, numbers or hyphens',
          customError: 'There is another organization with this name',
        }}
        validateOnBlur
        checkAvailability={{
          isAvailable: true,
          resourceKind: ResourceKind.organizationName,
          excluded: props.organization ? [props.organization.name] : [],
        }}
        pattern="[a-z0-9\-]+"
        autoComplete="off"
        required
      />

      <InputField
        type="text"
        label="Display name"
        name="displayName"
        value={props.organization ? props.organization.displayName || '' : ''}
      />

      <InputField
        ref={homeUrlInput}
        type="url"
        label="Home URL"
        name="homeUrl"
        invalidText={{
          default: 'Please enter a valid url',
        }}
        validateOnBlur
        value={props.organization ? props.organization.homeUrl || '' : ''}
      />

      <div className="">
        <label className={`form-label fw-bold ${styles.label}`} htmlFor="description">
          Description
        </label>
        <textarea
          data-testid="descriptionTextarea"
          className="form-control"
          id="description"
          name="description"
          defaultValue={props.organization ? props.organization.description || '' : ''}
        />
      </div>

      {!isNull(apiError) && isUndefined(props.setApiError) && (
        <div className="alert alert-danger mt-3" role="alert" aria-live="assertive" aria-atomic="true">
          {apiError}
        </div>
      )}
    </form>
  );
});

export default OrganizationForm;
