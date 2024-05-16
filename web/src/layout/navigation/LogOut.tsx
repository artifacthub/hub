import isUndefined from 'lodash/isUndefined';
import { useContext, useState } from 'react';
import { FaSignOutAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

import API from '../../api';
import { AppCtx, signOut } from '../../context/AppCtx';
import alertDispatcher from '../../utils/alertDispatcher';

interface Props {
  onSuccess?: () => void;
  className?: string;
  privateRoute?: boolean;
}

const LogOut = (props: Props) => {
  const { dispatch } = useContext(AppCtx);
  const navigate = useNavigate();
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
        navigate('/');
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
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
      <button className={`dropdown-item ${props.className}`} onClick={logoutUser} aria-label="Sign out">
        {isLoggingOut ? (
          <>
            <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
            <span className="ms-2">Signing out...</span>
          </>
        ) : (
          <div className="d-flex align-items-center">
            <FaSignOutAlt className="me-2" />
            <div>Sign out</div>
          </div>
        )}
      </button>
    </>
  );
};

export default LogOut;
