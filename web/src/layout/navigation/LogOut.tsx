import isUndefined from 'lodash/isUndefined';
import React, { useContext, useState } from 'react';
import { FaSignOutAlt } from 'react-icons/fa';
import { useHistory } from 'react-router-dom';

import { API } from '../../api';
import { AppCtx, signOut } from '../../context/AppCtx';
import alertDispatcher from '../../utils/alertDispatcher';

interface Props {
  onSuccess?: () => void;
  className?: string;
  privateRoute?: boolean;
}

const LogOut = (props: Props) => {
  const { dispatch } = useContext(AppCtx);
  const history = useHistory();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logoutUser = async () => {
    try {
      setIsLoggingOut(true);
      await API.logout();
      setIsLoggingOut(false);
      if (!isUndefined(props.onSuccess)) {
        props.onSuccess();
      }
      dispatch(signOut());
      if (!isUndefined(props.privateRoute) && props.privateRoute) {
        history.push('/');
      }
    } catch (err) {
      let error = 'An error occurred, please try again later.';
      if (!isUndefined(err.message)) {
        error = `Error: ${err.message}`;
      }
      setIsLoggingOut(false);
      alertDispatcher.postAlert({
        type: 'danger',
        message: error,
      });
    }
  };

  return (
    <>
      <button data-testid="logOutBtn" className={`dropdown-item ${props.className}`} onClick={logoutUser}>
        {isLoggingOut ? (
          <>
            <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
            <span className="ml-2">Signing out...</span>
          </>
        ) : (
          <div className="d-flex align-items-center">
            <FaSignOutAlt className="mr-2" />
            <div>Sign out</div>
          </div>
        )}
      </button>
    </>
  );
};

export default LogOut;
