import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';

import { API } from '../../api';
import { UserAuth } from '../../types';

interface Props {
  setIsAuth: React.Dispatch<React.SetStateAction<UserAuth | null>>;
  onSuccess?: () => void;
  className?: string;
  privateRoute?: boolean;
}

const LogOut = (props: Props) => {
  const history = useHistory();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const logoutUser = async () => {
    try {
      setIsLoggingOut(true);
      await API.logout();
      setIsLoggingOut(false);
      if (!isUndefined(props.onSuccess)) {
        props.onSuccess();
      }
      props.setIsAuth({ status: false });
      if (!isUndefined(props.privateRoute) && props.privateRoute) {
        history.push('/');
      }
    } catch (err) {
      let error = 'An error occurred, please try again later';
      switch (err.status) {
        case 400:
          error = `Error: ${err.statusText}`;
          break;
      }
      setIsLoggingOut(false);
      setApiError(error);
    }
  };

  return (
    <>
      <button className={`dropdown-item ${props.className}`} onClick={logoutUser}>
        {isLoggingOut ? (
          <>
            <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
            <span className="ml-2">Signing out...</span>
          </>
        ) : (
          <>Sign out</>
        )}
      </button>

      {!isNull(apiError) && (
        <div className="alert alert-danger m-3" role="alert">
          {apiError}
        </div>
      )}
    </>
  );
};

export default LogOut;
