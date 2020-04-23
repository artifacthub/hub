import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isString from 'lodash/isString';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { FaCaretDown, FaUser } from 'react-icons/fa';
import { GoCheck } from 'react-icons/go';
import { MdBusiness } from 'react-icons/md';

import { API } from '../../api';
import { AppCtx, unselectOrg, updateOrg } from '../../context/AppCtx';
import useOutsideClick from '../../hooks/useOutsideClick';
import { Organization } from '../../types';
import styles from './UserContext.module.css';

const UserContext = () => {
  const { ctx, dispatch } = useContext(AppCtx);
  const [organizations, setOrganizations] = useState<Organization[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const alias = ctx.user!.alias;
  const [openStatus, setOpenStatus] = useState(false);
  const ref = useRef(null);
  useOutsideClick([ref], openStatus, () => setOpenStatus(false));

  const handleChange = (value: string | Organization): void => {
    if (isString(value)) {
      dispatch(unselectOrg());
    } else {
      dispatch(updateOrg(value.name));
    }
    setOpenStatus(false);
  };

  async function fetchOrganizations() {
    try {
      setIsLoading(true);
      const allOrganizations = await API.getUserOrganizations();
      const confirmedOrganizations = allOrganizations.filter((org: Organization) => org.confirmed);
      setOrganizations(confirmedOrganizations);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      if (err.statusText !== 'ErrLoginRedirect') {
        setOrganizations([]);
      }
    }
  }

  useEffect(() => {
    fetchOrganizations();
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <div className={`position-relative ${styles.ctxWrapper}`}>
      <div className="d-flex flex-column">
        <small className={`text-uppercase text-muted ${styles.legendCtx}`}>Control panel context</small>
        <div className="d-flex flex-row align-items-center">
          <button
            className={`btn btn-primary badge-pill btn-sm pr-3 ${styles.ctxBtn}`}
            type="button"
            onClick={() => {
              fetchOrganizations();
              setOpenStatus(true);
            }}
          >
            <div className="d-flex flex-row align-items-center">
              {!isUndefined(ctx.prefs.controlPanel.selectedOrg) ? (
                <>
                  <div className={`badge badge-light badge-pill mr-2 p-0 ${styles.badgeIcon}`}>
                    <MdBusiness />
                  </div>
                  <div className="flex-grow-1 text-left text-truncate">{ctx.prefs.controlPanel.selectedOrg}</div>
                </>
              ) : (
                <>
                  <div className={`badge badge-light badge-pill mr-2 p-0 ${styles.badgeIcon}`}>
                    <FaUser />
                  </div>
                  <div className="flex-grow-1 text-left text-truncate">{alias}</div>
                </>
              )}
            </div>

            <div className={`position-absolute text-light ${styles.caret}`}>
              <FaCaretDown />
            </div>
          </button>
        </div>
        {isLoading && (
          <div className={`position-absolute text-secondary ${styles.loading}`}>
            <span className="spinner-border spinner-border-sm" />
          </div>
        )}
      </div>

      <div ref={ref} className={classnames('dropdown-menu dropdown-menu-right', styles.dropdown, { show: openStatus })}>
        <div className={`arrow ${styles.arrow}`} />

        <button className="dropdown-item" onClick={() => handleChange(alias)}>
          <div className="d-flex flex-row align-items-center">
            <FaUser className="mr-2" />
            <span>{alias}</span>
            {isUndefined(ctx.prefs.controlPanel.selectedOrg) && <GoCheck className="ml-2 text-success" />}
          </div>
        </button>
        {!isNull(organizations) && (
          <>
            {organizations.map((org: Organization) => (
              <button key={`opt_${org.name}`} className="dropdown-item" onClick={() => handleChange(org)}>
                <div className="d-flex flex-row align-items-center">
                  <MdBusiness className="mr-2" />
                  <span>{org.name}</span>
                  {!isUndefined(ctx.prefs.controlPanel.selectedOrg) &&
                    org.name === ctx.prefs.controlPanel.selectedOrg && <GoCheck className="ml-2 text-success" />}
                </div>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default UserContext;
