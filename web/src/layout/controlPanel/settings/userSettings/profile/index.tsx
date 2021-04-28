import React, { useContext, useEffect, useState } from 'react';

import { API } from '../../../../../api';
import { AppCtx } from '../../../../../context/AppCtx';
import { ErrorKind, Profile } from '../../../../../types';
import styles from './ProfileSection.module.css';
import TwoFactorAuth from './twoFactorAuth';
import UpdatePassword from './UpdatePassword';
import UpdateProfile from './UpdateProfile';

interface Props {
  onAuthError: () => void;
}

const ProfileSection = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const [profile, setProfile] = useState<Profile | null | undefined>(ctx.user || undefined);

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

  useEffect(() => {
    fetchProfile();
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <main role="main" className="p-0">
      {profile && (
        <>
          <div className="mb-5">
            <div className={`h3 mb-4 pb-2 border-bottom ${styles.title}`}>Profile information</div>

            <div className={`mt-4 mt-md-5 ${styles.formWrapper}`}>
              <UpdateProfile onAuthError={props.onAuthError} profile={profile} />
            </div>
          </div>

          {profile.passwordSet && (
            <>
              <div className="mb-5">
                <div className={`h3 mb-4 pb-2 border-bottom ${styles.title}`}>Change password</div>

                <div className={`mt-4 mt-md-5 ${styles.formWrapper}`}>
                  <UpdatePassword />
                </div>
              </div>

              <div>
                <div className={`h3 mb-4 pb-2 border-bottom ${styles.title}`}>Two-factor authentication</div>

                <div className="mt-4 mt-md-5">
                  <TwoFactorAuth
                    tfaEnabled={profile.tfaEnabled || false}
                    onAuthError={props.onAuthError}
                    onChange={fetchProfile}
                  />
                </div>
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
};

export default ProfileSection;
