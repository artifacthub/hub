import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useState } from 'react';

import { API } from '../../../api';
import { AppCtx, updateOrg } from '../../../context/AppCtx';
import { Organization, ResourceKind } from '../../../types';
import InputField from '../../common/InputField';

interface FormValidation {
  isValid: boolean;
  organization: Organization | null;
}

interface Props {
  organization?: Organization;
  onSuccess?: () => void;
  onAuthError: () => void;
  setIsSending: (status: boolean) => void;
}

const OrganizationForm = React.forwardRef<HTMLFormElement, Props>((props, ref) => {
  const { ctx, dispatch } = useContext(AppCtx);
  const [isValidated, setIsValidated] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Clean API error when form is focused after validation
  const cleanApiError = () => {
    if (!isNull(apiError)) {
      setApiError(null);
    }
  };

  async function handleOrganization(organization: Organization) {
    try {
      if (isUndefined(props.organization)) {
        await API.addOrganization(organization);
      } else {
        if (!isNull(ctx.org) && ctx.org.name === organization.name) {
          dispatch(updateOrg(organization.name, organization.displayName));
        }
        await API.updateOrganization(organization);
      }
      props.setIsSending(false);
      if (!isUndefined(props.onSuccess)) {
        props.onSuccess();
      }
    } catch (err) {
      props.setIsSending(false);
      if (err.statusText !== 'ErrLoginRedirect') {
        setApiError('An error occurred adding the organization, please try again later');
      } else {
        props.onAuthError();
      }
    }
  }

  const submitForm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    cleanApiError();
    props.setIsSending(true);
    if (e.currentTarget) {
      const { isValid, organization } = validateForm(e.currentTarget);
      if (isValid) {
        handleOrganization(organization!);
      } else {
        props.setIsSending(false);
      }
    }
  };

  const validateForm = (form: HTMLFormElement): FormValidation => {
    let isValid = form.checkValidity();
    let organization: Organization | null = null;

    if (isValid) {
      const formData = new FormData(form);
      organization = {
        name: formData.get('name') as string,
        displayName: formData.get('displayName') as string,
        homeUrl: formData.get('homeUrl') as string,
        description: formData.get('description') as string,
      };
    } else {
      setIsValidated(true);
    }
    return { isValid, organization };
  };

  return (
    <form
      ref={ref}
      className={classnames('w-100', { 'needs-validation': !isValidated }, { 'was-validated': isValidated })}
      onFocus={cleanApiError}
      autoComplete="on"
      onSubmit={(e: React.FormEvent<HTMLFormElement>) => submitForm(e)}
      noValidate
    >
      <InputField
        type="text"
        label="Name"
        labelLegend={<small className="ml-1 font-italic">(Required)</small>}
        name="name"
        value={!isUndefined(props.organization) ? props.organization.name : ''}
        readOnly={!isUndefined(props.organization)}
        invalidText={{
          default: 'This field is required',
          patternMismatch: 'Only lower case letters, numbers or hyphens',
          customError: 'There is another organization with this name',
        }}
        validateOnBlur
        checkAvailability={ResourceKind.organizationName}
        pattern="[a-z0-9-]+"
        autoComplete="off"
        required
      />

      <InputField
        type="text"
        label="Display name"
        name="displayName"
        value={
          !isUndefined(props.organization) && !isNull(props.organization.displayName)
            ? props.organization.displayName
            : ''
        }
      />

      <InputField
        type="url"
        label="Home URL"
        name="homeUrl"
        invalidText={{
          default: 'Please enter a valid url',
        }}
        validateOnBlur
        value={
          !isUndefined(props.organization) && !isNull(props.organization.homeUrl) ? props.organization.homeUrl : ''
        }
      />

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          className="form-control"
          id="description"
          name="description"
          defaultValue={
            !isUndefined(props.organization) && !isNull(props.organization.description)
              ? props.organization.description
              : ''
          }
        />
      </div>

      {!isNull(apiError) && (
        <div className="alert alert-danger mt-3" role="alert">
          {apiError}
        </div>
      )}
    </form>
  );
});

export default OrganizationForm;
