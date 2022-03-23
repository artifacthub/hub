import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { useContext, useRef, useState } from 'react';
import { FaRegCheckCircle, FaRegCircle } from 'react-icons/fa';
import { MdBusiness } from 'react-icons/md';
import { RiMedalLine } from 'react-icons/ri';
import { useHistory } from 'react-router';

import API from '../../api';
import { AppCtx, signOut } from '../../context/AppCtx';
import useOutsideClick from '../../hooks/useOutsideClick';
import { ErrorKind, Organization, Repository } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import { getRepoKindName } from '../../utils/repoKind';
import ElementWithTooltip from '../common/ElementWithTooltip';
import Image from '../common/Image';
import styles from './InProductionButton.module.css';

interface Props {
  normalizedName: string;
  repository: Repository;
}

const InProductionButton = (props: Props) => {
  const { ctx, dispatch } = useContext(AppCtx);
  const history = useHistory();
  const [openStatus, setOpenStatus] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[] | undefined | null>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const ref = useRef(null);
  useOutsideClick([ref], openStatus, () => setOpenStatus(false));

  async function fetchOrganizations(visibleLoading: boolean = false) {
    if (isNull(ctx.user)) {
      setOrganizations(undefined);
    } else {
      try {
        if (visibleLoading) {
          setIsLoading(true);
        }
        setOrganizations(
          await API.getProductionUsage({
            packageName: props.normalizedName,
            repositoryKind: getRepoKindName(props.repository.kind)!,
            repositoryName: props.repository.name,
          })
        );
        setOpenStatus(true);

        if (visibleLoading) {
          setIsLoading(false);
        }
      } catch (err: any) {
        setOrganizations(null);
        setOpenStatus(true);

        if (visibleLoading) {
          setIsLoading(false);
        }
        if (err.kind !== ErrorKind.Unauthorized) {
          alertDispatcher.postAlert({
            type: 'danger',
            message:
              'Something went wrong checking if your organizations use this package in production, please try again later.',
          });
        } else {
          dispatch(signOut());
          history.push(`${window.location.pathname}?modal=login&redirect=${window.location.pathname}`);
        }
      }
    }
  }

  async function changeUsage(name: string, isActive: boolean) {
    try {
      setUpdatingStatus(name);
      if (isActive) {
        await API.deleteProductionUsage(
          {
            packageName: props.normalizedName,
            repositoryKind: getRepoKindName(props.repository.kind)!,
            repositoryName: props.repository.name,
          },
          name
        );
      } else {
        await API.addProductionUsage(
          {
            packageName: props.normalizedName,
            repositoryKind: getRepoKindName(props.repository.kind)!,
            repositoryName: props.repository.name,
          },
          name
        );
      }
      alertDispatcher.postAlert({
        type: 'info',
        message: "Your change was applied successfully. It'll be visible across the site in a few minutes",
      });
      setUpdatingStatus(null);
      // We don't need to get orgs after changing it due to we are closing the dropdown
      // and we get them again every time we open the dropdown
      setOpenStatus(false);
    } catch (err: any) {
      setUpdatingStatus(null);
      setOpenStatus(false);

      if (err.kind !== ErrorKind.Unauthorized) {
        alertDispatcher.postAlert({
          type: 'danger',
          message: `${
            isActive
              ? 'Something went wrong deleting the selected organization from the list of production users of this package'
              : 'Something went wrong adding the selected organization to the list of production users of this package'
          }, please try again later.`,
        });
      } else {
        dispatch(signOut());
        history.push(`${window.location.pathname}?modal=login&redirect=${window.location.pathname}`);
      }
    }
  }

  const isDisabled = isNull(ctx.user) || isUndefined(ctx.user);

  return (
    <div className="d-none d-md-block position-relative ms-2">
      <ElementWithTooltip
        active
        tooltipClassName={styles.tooltip}
        element={
          <button
            className={classnames(
              'btn btn-outline-primary rounded-circle p-0 position-relative lh-1 fs-5',
              styles.iconWrapper,
              {
                [`disabled ${styles.isDisabled}`]: isDisabled,
              }
            )}
            type="button"
            onClick={() => {
              if (!isLoading || isDisabled) {
                fetchOrganizations(true);
              }
            }}
            aria-label="Open organizations menu"
            aria-expanded={openStatus}
          >
            <div className="d-flex align-items-center justify-content-center">
              {isLoading && (
                <div className={styles.loading}>
                  <div className={`spinner-border text-primary ${styles.spinner}`} role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              )}
              <RiMedalLine className={classnames('rounded-circle', { 'text-muted': isDisabled })} />
            </div>
          </button>
        }
        tooltipMessage="You must be signed in to specify which of your organizations are using this package in production"
        visibleTooltip={isDisabled}
      />

      <div
        ref={ref}
        role="menu"
        className={classnames('dropdown-menu dropdown-menu-end p-0', styles.dropdown, {
          show: openStatus,
        })}
      >
        <div
          className={classnames('dropdown-arrow', styles.arrow, {
            [styles.darkArrow]: organizations && organizations.length > 0,
          })}
        />

        {isNull(organizations) || isUndefined(organizations) || organizations.length === 0 ? (
          <div className={`p-4 text-center ${styles.emptyListMsg}`}>
            Here you'll be able to specify which of the organizations you belong to are using this package in
            production.
          </div>
        ) : (
          <div>
            <div className={`p-3 border-bottom ${styles.title}`}>
              Select which of your organizations are using this package in production
            </div>
            <div className={`overflow-auto ${styles.buttonsWrapper}`}>
              {organizations!.map((org: Organization) => {
                const isActive = org.usedInProduction || false;
                const isUpdating = !isNull(updatingStatus) && updatingStatus === org.name;

                return (
                  <button
                    className={`${styles.dropdownItem} dropdownItem btn p-3 rounded-0 w-100`}
                    onClick={() => changeUsage(org.name, isActive)}
                    key={`subs_${org.name}`}
                    aria-label={
                      isActive
                        ? `Delete ${org.displayName || org.name} organization from package's production users list`
                        : `Add ${org.displayName || org.name} organization to package's production users list`
                    }
                  >
                    <div className="d-flex flex-row align-items-start w-100 justify-content-between">
                      <div className="me-3 position-relative">
                        <span className={classnames({ 'd-none': isUpdating })}>
                          {isActive ? <FaRegCheckCircle className="text-success" /> : <FaRegCircle />}
                        </span>
                        {isUpdating && (
                          <div className="text-secondary top-0">
                            <span className="spinner-border spinner-border-sm" />
                          </div>
                        )}
                      </div>
                      <div className={`d-flex flex-column flex-grow-1 ${styles.growWidth}`}>
                        <div className="d-flex flex-row align-items-center">
                          <div className="me-2">
                            <div
                              className={`d-flex align-items-center justify-content-center overflow-hidden rounded-circle border bg-white ${styles.imageWrapper} imageWrapper`}
                            >
                              <Image
                                alt={org.displayName || org.name}
                                imageId={org.logoImageId}
                                className={`m-auto ${styles.image}`}
                                placeholderIcon={<MdBusiness className={styles.orgIcon} />}
                              />
                            </div>
                          </div>
                          <div className="h6 mb-0 mw-100 text-truncate">{org.displayName || org.name}</div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InProductionButton;
