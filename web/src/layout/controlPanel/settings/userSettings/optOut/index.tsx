import { isNull, isUndefined } from 'lodash';
import React, { useEffect, useState } from 'react';
import { FaUser } from 'react-icons/fa';
import { IoMdLogOut } from 'react-icons/io';
import { MdBusiness } from 'react-icons/md';
import { TiWarning } from 'react-icons/ti';
import { Link } from 'react-router-dom';

import { API } from '../../../../../api';
import { ErrorKind, OptOutItem, Repository } from '../../../../../types';
import alertDispatcher from '../../../../../utils/alertDispatcher';
import prepareQueryString from '../../../../../utils/prepareQueryString';
import Loading from '../../../../common/Loading';
import RepositoryIcon from '../../../../common/RepositoryIcon';
import OptOutModal from './Modal';
import styles from './OptOutSection.module.css';

interface Props {
  onAuthError: () => void;
}

const OptOutSection = (props: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [optOutList, setOptOutList] = useState<OptOutItem[] | undefined>(undefined);
  const [modalStatus, setModalStatus] = useState<boolean>(false);

  async function getOptOutList() {
    try {
      setIsLoading(true);
      setOptOutList(await API.getOptOutList());
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        alertDispatcher.postAlert({
          type: 'danger',
          message: 'An error occurred getting your opt-out entries list, please try again later.',
        });
        setOptOutList([]);
      } else {
        props.onAuthError();
      }
    }
  }

  async function deleteOptOut(optOutId: string, repo: Repository) {
    try {
      await API.deleteOptOut(optOutId);
      getOptOutList();
    } catch (err) {
      if (err.kind !== ErrorKind.Unauthorized) {
        alertDispatcher.postAlert({
          type: 'danger',
          message: `An error occurred deleting the opt-out entry for tracking errors notifications for repository ${
            repo.displayName || repo.name
          }, please try again later.`,
        });
        getOptOutList(); // Get opt-out list after getting an error
      } else {
        props.onAuthError();
      }
    }
  }

  useEffect(() => {
    getOptOutList();
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <div className="mt-5 pt-3">
      {(isUndefined(optOutList) || isLoading) && <Loading />}
      <div className="d-flex flex-row align-items-start justify-content-between pb-2">
        <div className={`h4 pb-0 ${styles.title}`}>Repositories</div>
        <div>
          <button
            className={`btn btn-secondary btn-sm text-uppercase ${styles.btnAction}`}
            onClick={() => setModalStatus(true)}
          >
            <div className="d-flex flex-row align-items-center justify-content-center">
              <IoMdLogOut />
              <span className="d-none d-md-inline ml-2">Opt-out</span>
            </div>
          </button>
        </div>
      </div>

      <div className="mt-3 mt-md-3">
        <p>
          Repositories notifications are <span className="font-weight-bold">enabled by default</span>. However, you can
          opt-out of notifications for certain kinds of events that happen in any of the repositories you can manage.
        </p>

        <div className="mt-4 mt-md-5">
          {!isUndefined(optOutList) && optOutList.length > 0 && (
            <table className={`table table-bordered table-hover ${styles.table}`}>
              <thead>
                <tr className={`table-primary ${styles.tableTitle}`}>
                  <th scope="col" className={`align-middle text-center d-none d-sm-table-cell ${styles.fitCell}`}>
                    Kind
                  </th>
                  <th scope="col" className="align-middle text-center w-50">
                    Repository
                  </th>
                  <th scope="col" className="align-middle text-center w-50 d-none d-sm-table-cell">
                    Publisher
                  </th>
                  <th scope="col" className={`align-middle text-nowrap ${styles.fitCell}`}>
                    <div className="d-flex flex-row align-items-center justify-content-center">
                      <TiWarning />
                      <span className="d-none d-lg-inline ml-2">Tracking errors</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {optOutList.map((item: OptOutItem) => (
                  <tr key={`subs_${item.optOutId}`} data-testid="optOutRow">
                    <td className="align-middle text-center d-none d-sm-table-cell">
                      <RepositoryIcon kind={item.repository.kind} className={styles.icon} />
                    </td>
                    <td className="align-middle">
                      <div className="d-flex flex-row align-items-center">
                        <Link
                          data-testid="repoLink"
                          className="text-dark text-capitalize"
                          to={{
                            pathname: '/packages/search',
                            search: prepareQueryString({
                              pageNumber: 1,
                              filters: {
                                repo: [item.repository.name],
                              },
                            }),
                          }}
                        >
                          {item.repository.name}
                        </Link>
                      </div>
                    </td>
                    <td className="align-middle position-relative d-none d-sm-table-cell">
                      <span className={`mx-1 mb-1 ${styles.tinyIcon}`}>
                        {!isNull(item.repository.userAlias) ? <FaUser /> : <MdBusiness />}
                      </span>{' '}
                      {!isNull(item.repository.userAlias) ? (
                        <Link
                          data-testid="userLink"
                          className="text-dark"
                          to={{
                            pathname: '/packages/search',
                            search: prepareQueryString({
                              pageNumber: 1,
                              filters: {
                                user: [item.repository.userAlias!],
                              },
                            }),
                          }}
                        >
                          {item.repository.userAlias}
                        </Link>
                      ) : (
                        <Link
                          data-testid="orgLink"
                          className="text-dark"
                          to={{
                            pathname: '/packages/search',
                            search: prepareQueryString({
                              pageNumber: 1,
                              filters: {
                                org: [item.repository.organizationName!],
                              },
                            }),
                          }}
                        >
                          {item.repository.organizationDisplayName || item.repository.organizationName}
                        </Link>
                      )}
                    </td>
                    <td className="align-middle text-center">
                      <div className="custom-control custom-switch ml-2">
                        <input
                          id="repositoryTrackingErrors"
                          type="checkbox"
                          className={`custom-control-input ${styles.checkbox}`}
                          onChange={() => deleteOptOut(item.optOutId, item.repository)}
                          checked
                        />
                        <label className="custom-control-label" htmlFor="repositoryTrackingErrors" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalStatus && (
        <OptOutModal
          optOutList={optOutList}
          onSuccess={getOptOutList}
          onClose={() => setModalStatus(false)}
          onAuthError={props.onAuthError}
          open
        />
      )}
    </div>
  );
};

export default OptOutSection;
