import { MouseEvent as ReactMouseEvent, useRef, useState } from 'react';
import { FaPencilAlt } from 'react-icons/fa';

import { AuthorizerAction, Organization } from '../../../../../types';
import ActionBtn from '../../../ActionBtn';
import OrganizationForm from '../../../organizations/Form';

interface Props {
  onAuthError: () => void;
  onSuccess: () => void;
  selectedOrg: string;
  isLoading: boolean;
  organization?: Organization;
}

const UpdateOrganization = (props: Props) => {
  const form = useRef<HTMLFormElement>(null);
  const [isSending, setIsSending] = useState(false);

  const submitForm = () => {
    if (form.current) {
      form.current.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  };

  return (
    <>
      {!props.isLoading && (
        <OrganizationForm
          ref={form}
          organization={!props.isLoading ? props.organization : undefined}
          onAuthError={props.onAuthError}
          onSuccess={props.onSuccess}
          setIsSending={setIsSending}
        />
      )}

      <div className="mt-4">
        <ActionBtn
          className="btn btn-sm btn-outline-secondary"
          onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
            e.preventDefault();
            submitForm();
          }}
          action={AuthorizerAction.UpdateOrganization}
          disabled={isSending}
          label="Update organization modal"
        >
          <>
            {isSending ? (
              <>
                <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                <span className="ms-2">Updating organization</span>
              </>
            ) : (
              <div className="d-flex flex-row align-items-center text-uppercase">
                <FaPencilAlt className="me-2" />
                <div>Update</div>
              </div>
            )}
          </>
        </ActionBtn>
      </div>
    </>
  );
};

export default UpdateOrganization;
