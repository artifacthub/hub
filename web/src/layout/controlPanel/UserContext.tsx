import classnames from 'classnames';
import isString from 'lodash/isString';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { FaCaretDown, FaUser } from 'react-icons/fa';
import { GoCheck } from 'react-icons/go';
import { MdBusiness } from 'react-icons/md';

import { API } from '../../api';
import { AppCtx, unselectOrg, updateOrg } from '../../context/AppCtx';
import useOutsideClick from '../../hooks/useOutsideClick';
import { ErrorKind, Organization } from '../../types';
import authorizer from '../../utils/authorizer';
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
      authorizer.updateCtx();
      dispatch(unselectOrg());
    } else {
      authorizer.updateCtx(value.name);
      dispatch(updateOrg(value.name));
    }
    setOpenStatus(false);
  };

  async function fetchOrganizations() {
    try {
      setIsLoading(true);
      const allOrganizations = await API.getUserOrganizations();
      const confirmedOrganizations = allOrganizations.filter((org: Organization) => org.confirmed);
      if (ctx.prefs.controlPanel.selectedOrg) {
        const selectedOrg = confirmedOrganizations.find(
          (org: Organization) => org.name === ctx.prefs.controlPanel.selectedOrg
        );
        if (isUndefined(selectedOrg)) {
          dispatch(unselectOrg());
        } else {
          authorizer.updateCtx(ctx.prefs.controlPanel.selectedOrg);
        }
      }
      setOrganizations(confirmedOrganizations);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        setOrganizations([]);
      }
    }
  }

  useEffect(() => {
    fetchOrganizations();
    authorizer.init(ctx.prefs.controlPanel.selectedOrg);
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <div className={`position-relative ${styles.ctxWrapper}`}>
      <div className="d-flex flex-column">
        <small className={`text-uppercase text-muted ${styles.legendCtx}`}>Control panel context</small>
        <div className="d-flex flex-row align-items-center">
          <button
            data-testid="ctxBtn"
            className={`btn btn-primary badge-pill btn-sm pr-3 position-relative ${styles.ctxBtn}`}
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
                  <div className="flex-grow-1 text-left mr-1 text-truncate">{ctx.prefs.controlPanel.selectedOrg}</div>
                </>
              ) : (
                <>
                  <div className={`badge badge-light badge-pill mr-2 p-0 ${styles.badgeIcon}`}>
                    <FaUser />
                  </div>
                  <div className="flex-grow-1 text-left mr-1 text-truncate">{alias}</div>
                </>
              )}
            </div>

            <div className={`position-absolute textLight ${styles.caret}`}>
              <FaCaretDown />
            </div>
          </button>
        </div>
        {isLoading && (
          <div className={`position-absolute text-secondary ${styles.loading}`} role="status">
            <span className="spinner-border spinner-border-sm" />
          </div>
        )}
      </div>

      <div
        ref={ref}
        data-testid="ctxDropdown"
        className={classnames('dropdown-menu dropdown-menu-right', styles.dropdown, { show: openStatus })}
      >
        <div className={`arrow ${styles.arrow}`} />

        <button data-testid="userCtxBtn" className="dropdown-item mw-100" onClick={() => handleChange(alias)}>
          <div className="d-flex flex-row align-items-center text-truncate">
            <FaUser className={`mr-2 ${styles.icon}`} />
            <div className="flex-grow-1 text-truncate">{alias}</div>
            {isUndefined(ctx.prefs.controlPanel.selectedOrg) && (
              <GoCheck className={`ml-2 text-success ${styles.icon}`} />
            )}
          </div>
        </button>
        {organizations && (
          <>
            {organizations.map((org: Organization) => (
              <button
                data-testid="orgCtxBtn"
                key={`opt_${org.name}`}
                className="dropdown-item"
                onClick={() => handleChange(org)}
              >
                <div className="d-flex flex-row align-items-center text-truncate">
                  <MdBusiness className={`mr-2 ${styles.icon}`} />
                  <div className="flex-grow-1 text-truncate">{org.name}</div>
                  {!isUndefined(ctx.prefs.controlPanel.selectedOrg) &&
                    org.name === ctx.prefs.controlPanel.selectedOrg && (
                      <GoCheck className={`ml-2 text-success ${styles.icon}`} />
                    )}
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
