import classnames from 'classnames';
import { isNull, isUndefined } from 'lodash';
import moment from 'moment';
import React, { useCallback, useEffect, useState } from 'react';
import { CgFileDocument } from 'react-icons/cg';
import { FaLink } from 'react-icons/fa';
import { useHistory } from 'react-router-dom';
import semver from 'semver';

import { API } from '../../api';
import { ChangeLog, Repository, RepositoryKind, SearchFiltersURL } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import buildPackageURL from '../../utils/buildPackageURL';
import ElementWithTooltip from '../common/ElementWithTooltip';
import Modal from '../common/Modal';
import styles from './ChangelogModal.module.css';

interface Props {
  normalizedName: string;
  repository: Repository;
  packageId: string;
  hasChangelog?: boolean;
  visibleChangelog: boolean;
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
}

const ChangelogModal = (props: Props) => {
  const {
    searchUrlReferer,
    fromStarredPage,
    normalizedName,
    repository,
    packageId,
    hasChangelog,
    visibleChangelog,
  } = props;
  const history = useHistory();
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  const [changelog, setChangelog] = useState<ChangeLog[] | null | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPkgId, setCurrentPkgId] = useState<string>(packageId);

  useEffect(() => {
    if (visibleChangelog && !openStatus) {
      if (hasChangelog) {
        onOpenModal();
      } else {
        history.replace({
          search: '',
        });
      }
    }
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  const onOpenModal = useCallback(() => {
    const sortChangelog = (items: ChangeLog[]): ChangeLog[] => {
      const validVersions: ChangeLog[] = items.filter((item: ChangeLog) => semver.valid(item.version));
      const invalidVersions: ChangeLog[] = items.filter((item: ChangeLog) => !semver.valid(item.version));
      try {
        const sortedValidVersions = validVersions.sort((a, b) => (semver.lt(a.version, b.version) ? 1 : -1));
        return [...sortedValidVersions, ...invalidVersions];
      } catch {
        return items;
      }
    };

    async function getChangelog() {
      try {
        setIsLoading(true);
        const changelog = await API.getChangelog(packageId);
        setCurrentPkgId(packageId);
        setChangelog(sortChangelog(changelog));
        setIsLoading(false);
        setOpenStatus(true);
      } catch {
        setChangelog(null);
        alertDispatcher.postAlert({
          type: 'danger',
          message: 'An error occurred getting package changelog, please try again later.',
        });
        setIsLoading(false);
      }
    }

    if (hasChangelog) {
      if (changelog && packageId === currentPkgId) {
        setOpenStatus(true);
      } else {
        getChangelog();
      }
      history.replace({
        search: '?modal=changelog',
        state: { searchUrlReferer: searchUrlReferer, fromStarredPage: fromStarredPage },
      });
    }
  }, [packageId, fromStarredPage, searchUrlReferer, currentPkgId, history, changelog, hasChangelog]);

  const onCloseModal = useCallback(() => {
    setOpenStatus(false);
    history.replace({
      search: '',
      state: { searchUrlReferer: searchUrlReferer, fromStarredPage: fromStarredPage },
    });
  }, [fromStarredPage, searchUrlReferer, history]);

  const openPackagePage = useCallback(
    (newVersion: string) => {
      history.push({
        pathname: buildPackageURL(normalizedName, repository, newVersion, true),
        state: { searchUrlReferer: searchUrlReferer, fromStarredPage: fromStarredPage },
      });
      setOpenStatus(false);
    },
    [normalizedName, repository, fromStarredPage, searchUrlReferer, history]
  );

  if ([RepositoryKind.Falco, RepositoryKind.Krew, RepositoryKind.HelmPlugin].includes(repository.kind)) return null;

  return (
    <>
      <ElementWithTooltip
        element={
          <button
            data-testid="changelogBtn"
            className={classnames('btn btn-secondary btn-block btn-sm text-nowrap', {
              disabled: !hasChangelog,
            })}
            onClick={onOpenModal}
          >
            <div className="d-flex flex-row align-items-center justify-content-center text-uppercase">
              {isLoading ? (
                <>
                  <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                  <span className="d-none d-md-inline ml-2 font-weight-bold">Getting changelog...</span>
                </>
              ) : (
                <>
                  <CgFileDocument />
                  <span className="ml-2 font-weight-bold">Changelog</span>
                </>
              )}
            </div>
          </button>
        }
        visibleTooltip={!hasChangelog}
        tooltipClassName={styles.tooltip}
        tooltipMessage="No versions of this package include an annotation with information about the changes it introduces."
        active
      />

      {openStatus && changelog && (
        <Modal
          modalDialogClassName={styles.modalDialog}
          modalClassName="h-100"
          header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Changelog</div>}
          onClose={onCloseModal}
          open={openStatus}
        >
          <div className="mx-0 mx-md-3 my-1 mw-100">
            {changelog.map((item: ChangeLog) => {
              if (isNull(item.changes) || isUndefined(item.changes)) return null;
              return (
                <div key={`v_${item.version}`} data-testid="changelogBlock">
                  <div className="d-inline-block d-md-flex flex-row align-items-baseline border-bottom w-100 mb-3 pb-2">
                    <div className={`d-flex flex-row align-items-baseline ${styles.versionWrapper}`}>
                      <div className="h5 text-secondary text-truncate mb-0" data-testid="changelogBlockTitle">
                        {item.version}
                      </div>
                      <button
                        className={`btn btn-link btn-sm text-secondary py-0 position-relative ${styles.btnLink}`}
                        onClick={() => openPackagePage(item.version)}
                      >
                        <FaLink />
                      </button>
                    </div>

                    {(item.containsSecurityUpdates || item.prerelease) && (
                      <div className={styles.badgesWrapper}>
                        {item.prerelease && (
                          <span className={`badge badge-sm badge-pill mr-2 position-relative ${styles.badge}`}>
                            Pre-release
                          </span>
                        )}
                        {item.containsSecurityUpdates && (
                          <span className={`badge badge-sm badge-pill mr-2 position-relative ${styles.badge}`}>
                            Contains security updates
                          </span>
                        )}
                      </div>
                    )}

                    <div className="ml-auto pl-0 pl-md-2 text-nowrap">
                      <small className="text-muted">Released {moment(item.createdAt * 1000).fromNow()}</small>
                    </div>
                  </div>

                  <ul className={`mb-4 ${styles.list}`}>
                    {item.changes.map((change: string, index: number) => (
                      <li key={`change_${item.version}_${index}`}>{change}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </>
  );
};

export default React.memo(ChangelogModal);
