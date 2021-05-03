import classnames from 'classnames';
import { isNull, isUndefined } from 'lodash';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { BsDot } from 'react-icons/bs';
import { CgFileDocument } from 'react-icons/cg';
import { FaLink, FaTrash, FaWrench } from 'react-icons/fa';
import { MdSecurity } from 'react-icons/md';
import { RiTimerFill } from 'react-icons/ri';
import { TiArrowSync, TiPlus } from 'react-icons/ti';
import { useHistory } from 'react-router-dom';
import semver from 'semver';

import { API } from '../../api';
import { Change, ChangeKind, ChangeLog, PackageLink, Repository, RepositoryKind, SearchFiltersURL } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import buildPackageURL from '../../utils/buildPackageURL';
import ElementWithTooltip from '../common/ElementWithTooltip';
import ExternalLink from '../common/ExternalLink';
import Modal from '../common/Modal';
import styles from './ChangelogModal.module.css';

interface Props {
  normalizedName: string;
  repository: Repository;
  packageId: string;
  hasChangelog: boolean;
  visibleChangelog: boolean;
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
}

const ChangelogModal = (props: Props) => {
  const history = useHistory();
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  const [changelog, setChangelog] = useState<ChangeLog[] | null | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPkgId, setCurrentPkgId] = useState<string>(props.packageId);

  useEffect(() => {
    if (props.visibleChangelog && !openStatus) {
      if (props.hasChangelog) {
        onOpenModal();
      } else {
        history.replace({
          search: '',
        });
      }
    }
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    if (props.packageId !== currentPkgId && openStatus) {
      setOpenStatus(false);
    }
  }, [props.packageId]); /* eslint-disable-line react-hooks/exhaustive-deps */

  if ([RepositoryKind.Falco, RepositoryKind.Krew, RepositoryKind.HelmPlugin].includes(props.repository.kind))
    return null;

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
      const changelog = await API.getChangelog(props.packageId);
      setCurrentPkgId(props.packageId);
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

  const onOpenModal = () => {
    if (props.hasChangelog) {
      if (changelog && props.packageId === currentPkgId) {
        setOpenStatus(true);
      } else {
        getChangelog();
      }
      history.replace({
        search: '?modal=changelog',
        state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
      });
    }
  };

  const onCloseModal = () => {
    setOpenStatus(false);
    history.replace({
      search: '',
      state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
    });
  };

  const openPackagePage = (newVersion: string) => {
    history.push({
      pathname: buildPackageURL(props.normalizedName, props.repository, newVersion, true),
      state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
    });
    setOpenStatus(false);
  };

  return (
    <>
      <ElementWithTooltip
        element={
          <button
            data-testid="changelogBtn"
            className={classnames('btn btn-secondary btn-block btn-sm text-nowrap', {
              disabled: !props.hasChangelog,
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
        visibleTooltip={!props.hasChangelog}
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

              const hasBadge = item.changes.some(
                (change: Change) =>
                  change.hasOwnProperty('kind') && !isUndefined(change.kind) && change.kind.toString() !== ''
              );

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
                      <small className="text-muted">Released {moment(item.ts * 1000).fromNow()}</small>
                    </div>
                  </div>

                  <div className={`d-flex flex-column mb-4 ${styles.list}`}>
                    {item.changes.map((change: Change, index: number) => (
                      <div key={`change_${item.version}_${index}`} className="mb-1 w-100 d-flex flex-row">
                        <div className="d-flex align-items-start flex-row w-100">
                          {change.kind ? (
                            <div className={`position-relative ${styles.changeBadgeWrapper}`}>
                              <div
                                className={classnames(
                                  'd-flex flex-row align-items-center justify-content-center text-uppercase badge badge-pill mr-2',
                                  styles.changeBadge,
                                  styles[`${change.kind.toString()}ChangeBadge`]
                                )}
                              >
                                <span className={`position-relative ${styles.badgeIcon}`}>
                                  {(() => {
                                    switch (change.kind) {
                                      case ChangeKind.added:
                                        return <TiPlus />;
                                      case ChangeKind.changed:
                                        return <TiArrowSync />;
                                      case ChangeKind.removed:
                                        return <FaTrash />;
                                      case ChangeKind.fixed:
                                        return <FaWrench />;
                                      case ChangeKind.security:
                                        return <MdSecurity />;
                                      case ChangeKind.deprecated:
                                        return <RiTimerFill />;
                                      default:
                                        return <>-</>;
                                    }
                                  })()}
                                </span>
                                <span className="d-none d-md-block ml-1">{change.kind.toString()}</span>
                              </div>
                            </div>
                          ) : (
                            <>
                              {hasBadge ? (
                                <div className={`position-relative ${styles.changeBadgeWrapper}`}>
                                  <div
                                    className={classnames(
                                      'd-flex flex-row align-items-center justify-content-center text-uppercase badge badge-pill mr-2',
                                      styles.changeBadge
                                    )}
                                  >
                                    -
                                  </div>
                                </div>
                              ) : (
                                <div className="mr-1 mr-md-2">
                                  <BsDot />
                                </div>
                              )}
                            </>
                          )}
                          <div className="flex-grow-1">
                            <div>{change.description}</div>
                            {!isUndefined(change.links) && (
                              <div className={`d-flex flex-row ${styles.linksWrapper}`}>
                                {change.links.map((link: PackageLink, idx: number) => {
                                  return (
                                    <div key={`change_${index}_link${idx}`}>
                                      <ExternalLink className={`text-muted ${styles.link}`} href={link.url}>
                                        {link.name}
                                      </ExternalLink>
                                      {idx !== change.links!.length - 1 && <BsDot className="text-muted" />}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </>
  );
};

export default ChangelogModal;
