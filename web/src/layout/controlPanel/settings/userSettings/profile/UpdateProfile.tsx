import classnames from 'classnames';
import every from 'lodash/every';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { useContext, useEffect, useRef, useState } from 'react';
import { FaPencilAlt } from 'react-icons/fa';

import API from '../../../../../api';
import { AppCtx, updateUser } from '../../../../../context/AppCtx';
import { ErrorKind, Profile, RefInputField, ResourceKind, UserFullName } from '../../../../../types';
import alertDispatcher from '../../../../../utils/alertDispatcher';
import compoundErrorMessage from '../../../../../utils/compoundErrorMessage';
import InputField from '../../../../common/InputField';
import InputFileField from '../../../../common/InputFileField';

interface Props {
  onAuthError: () => void;
  profile: Profile | null | undefined;
}

interface User {
  alias: string;
  firstName?: string;
  lastName?: string;
  profileImageId?: string;
}

interface FormValidation {
  isValid: boolean;
  user: User | null;
}

const UpdateProfile = (props: Props) => {
  const { dispatch } = useContext(AppCtx);
  const form = useRef<HTMLFormElement>(null);
  const usernameInput = useRef<RefInputField>(null);
  const [isSending, setIsSending] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [profile, setProfile] = useState<Profile | null | undefined>(props.profile);
  const [imageId, setImageId] = useState<string | undefined>(
    props.profile && props.profile.profileImageId ? props.profile.profileImageId : undefined
  );

  useEffect(() => {
    setProfile(props.profile);
  }, [props.profile]);

  async function updateProfile(user: UserFullName) {
    try {
      setIsSending(true);
      const formattedUser = { ...user };
      await API.updateUserProfile(user);
      dispatch(updateUser(formattedUser));
      setIsSending(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setIsSending(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        const error = compoundErrorMessage(err, 'An error occurred updating your profile');
        alertDispatcher.postAlert({
          type: 'danger',
          message: error,
        });
      } else {
        props.onAuthError();
      }
    }
  }

  const submitForm = () => {
    setIsSending(true);
    if (form.current) {
      validateForm(form.current).then((validation: FormValidation) => {
        if (validation.isValid && !isNull(validation.user)) {
          updateProfile(validation.user);
        } else {
          setIsSending(false);
        }
      });
    }
  };

  const validateForm = (form: HTMLFormElement): Promise<FormValidation> => {
    let user: User | null = null;

    return validateAllFields().then((isValid: boolean) => {
      if (isValid) {
        const formData = new FormData(form);
        user = {
          alias: formData.get('alias') as string,
        };
        if (formData.get('firstName') !== '') {
          user['firstName'] = formData.get('firstName') as string;
        }

        if (formData.get('lastName') !== '') {
          user['lastName'] = formData.get('lastName') as string;
        }

        if (!isUndefined(imageId)) {
          user['profileImageId'] = imageId;
        }
      }
      setIsValidated(true);
      return { isValid, user };
    });
  };

  const validateAllFields = async (): Promise<boolean> => {
    return Promise.all([usernameInput.current!.checkIsValid()]).then((res: boolean[]) => {
      return every(res, (isValid: boolean) => isValid);
    });
  };

  return (
    <form
      data-testid="updateProfileForm"
      ref={form}
      className={classnames('w-100', { 'needs-validation': !isValidated }, { 'was-validated': isValidated })}
      autoComplete="on"
      noValidate
    >
      <InputFileField
        name="image"
        label="Profile image"
        labelLegend={<small className="ms-1 fst-italic">(Click on the image to update)</small>}
        value={imageId}
        circularCrop
        onImageChange={(imageId: string) => setImageId(imageId)}
        onAuthError={props.onAuthError}
      />

      <InputField
        type="email"
        label="Email"
        name="email"
        value={!isUndefined(profile) && !isNull(profile) ? profile.email : ''}
        readOnly
      />

      <InputField
        ref={usernameInput}
        type="text"
        label="Username"
        labelLegend={<small className="ms-1 fst-italic">(Required)</small>}
        name="alias"
        value={!isUndefined(profile) && !isNull(profile) ? profile.alias : ''}
        invalidText={{
          default: 'This field is required',
          customError: 'Username not available',
        }}
        checkAvailability={{
          isAvailable: true,
          resourceKind: ResourceKind.userAlias,
          excluded: !isUndefined(profile) && !isNull(profile) ? [profile.alias] : [],
        }}
        validateOnBlur
        autoComplete="username"
        required
      />

      <InputField
        type="text"
        label="First Name"
        name="firstName"
        autoComplete="given-name"
        value={!isUndefined(profile) && !isNull(profile) ? profile.firstName : ''}
      />

      <InputField
        type="text"
        label="Last Name"
        name="lastName"
        autoComplete="family-name"
        value={!isUndefined(profile) && !isNull(profile) ? profile.lastName : ''}
      />

      <div className="mt-4">
        <button
          className="btn btn-sm btn-outline-secondary"
          type="button"
          disabled={isSending}
          onClick={submitForm}
          aria-label="Update profile"
        >
          {isSending ? (
            <>
              <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
              <span className="ms-2">Updating profile</span>
            </>
          ) : (
            <div className="d-flex flex-row align-items-center text-uppercase">
              <FaPencilAlt className="me-2" />
              <div>Update</div>
            </div>
          )}
        </button>
      </div>
    </form>
  );
};

export default UpdateProfile;
