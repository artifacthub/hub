import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useEffect, useState } from 'react';

import { API } from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { Profile } from '../../../types';
import Loading from '../../common/Loading';
import NoData from '../../common/NoData';
import ResetPassword from './ResetPassword';
import UpdateProfile from './UpdateProfile';
import styles from './UserSettings.module.css';

interface Props {
  onAuthError: () => void;
}

const UserSettings = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null | undefined>(
    !isNull(ctx.user) && !isUndefined(ctx.user) ? ctx.user : undefined
  );

  useEffect(() => {
    async function fetchProfile() {
      try {
        setIsLoading(true);
        setProfile(await API.getUserProfile());
        setIsLoading(false);
      } catch (err) {
        setIsLoading(false);
        if (err.statusText !== 'ErrLoginRedirect') {
          setProfile(null);
        } else {
          props.onAuthError();
        }
      }
    }
    fetchProfile();
  }, [props]);

  return (
    <main role="main" className="container d-flex flex-column flex-md-row justify-content-between my-md-4 p-0">
      <div className="flex-grow-1">
        {(isUndefined(profile) || isLoading) && <Loading />}

        {!isUndefined(profile) && (
          <>
            {isNull(profile) ? (
              <NoData>Sorry, an error occurred fetching your profile, please try again later.</NoData>
            ) : (
              <>
                <div>
                  <div className="h3 mb-4 text-center">Profile information</div>

                  <div className={`mx-auto mt-5 ${styles.formWrapper}`}>
                    <UpdateProfile onAuthError={props.onAuthError} profile={profile} />
                  </div>
                </div>

                <div className="mt-5">
                  <div className="h3 mb-4 text-center">Change password</div>

                  <div className={`mx-auto mt-5 ${styles.formWrapper}`}>
                    <ResetPassword />
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default UserSettings;
