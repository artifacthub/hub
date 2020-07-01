import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useEffect, useState } from 'react';

import { API } from '../../../../../api';
import { AppCtx } from '../../../../../context/AppCtx';
import { ErrorKind, Profile } from '../../../../../types';
import styles from './ProfileSection.module.css';
import UpdatePassword from './UpdatePassword';
import UpdateProfile from './UpdateProfile';

interface Props {
  onAuthError: () => void;
}

const ProfileSection = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const [profile, setProfile] = useState<Profile | null | undefined>(
    !isNull(ctx.user) && !isUndefined(ctx.user) ? ctx.user : undefined
  );

  useEffect(() => {
    async function fetchProfile() {
      try {
        setProfile(await API.getUserProfile());
      } catch (err) {
        if (err.kind !== ErrorKind.Unauthorized) {
          setProfile(null);
        } else {
          props.onAuthError();
        }
      }
    }
    fetchProfile();
  }, [props]);

  return (
    <main role="main" className="container p-0">
      {!isNull(profile) && !isUndefined(profile) && (
        <div className="mb-5">
          <div className={`h3 mb-4 pb-2 border-bottom ${styles.title}`}>Profile information</div>

          <div className={`mt-4 mt-md-5 ${styles.formWrapper}`}>
            <UpdateProfile onAuthError={props.onAuthError} profile={profile} />
          </div>
        </div>
      )}

      <div>
        <div className={`h3 mb-4 pb-2 border-bottom ${styles.title}`}>Change password</div>

        <div className={`mt-4 mt-md-5 ${styles.formWrapper}`}>
          <UpdatePassword />
        </div>
      </div>
    </main>
  );
};

export default ProfileSection;
