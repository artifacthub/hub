import classnames from 'classnames';
import { isNull } from 'lodash';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { CgFileDocument } from 'react-icons/cg';
import { FaLink } from 'react-icons/fa';
import { useHistory } from 'react-router-dom';
import semver from 'semver';

import { API } from '../../api';
import { ChangeLog, Package, RepositoryKind, SearchFiltersURL } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import buildPackageURL from '../../utils/buildPackageURL';
import ElementWithTooltip from '../common/ElementWithTooltip';
import Modal from '../common/Modal';
import styles from './ChangelogModal.module.css';

interface Props {
  packageItem: Package;
  visibleChangelog: boolean;
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
}

const ChangelogModal = (props: Props) => {
  const history = useHistory();
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  const [changelog, setChangelog] = useState<ChangeLog[] | null | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (props.visibleChangelog && !openStatus) {
      if (props.packageItem.hasChangelog) {
        onOpenModal();
      } else {
        history.replace({
          search: '',
        });
      }
    }
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  if (props.packageItem.repository.kind === RepositoryKind.Falco) return null;

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
      const changelog = await API.getChangelog(props.packageItem.packageId);
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
    if (props.packageItem.hasChangelog) {
      if (changelog) {
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
      pathname: buildPackageURL({ ...props.packageItem, version: newVersion }, true),
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
              disabled: !props.packageItem.hasChangelog,
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
        visibleTooltip={!props.packageItem.hasChangelog}
        tooltipClassName={styles.tooltip}
        tooltipMessage="No versions of this package include an annotation with information about the changes it introduces."
        active
      />

      {openStatus && changelog && (
        <Modal
          modalDialogClassName={styles.modalDialog}
          modalClassName="h-100"
          header={<div className={`h3 m-2 ${styles.title}`}>Changelog</div>}
          onClose={onCloseModal}
          open={openStatus}
        >
          <div className="mx-0 mx-md-3 my-1 mw-100">
            {changelog.map((item: ChangeLog) => {
              if (isNull(item.changes)) return null;
              return (
                <div key={`v_${item.version}`} data-testid="changelogBlock">
                  <div className="d-inline-block d-md-flex flex-row justify-content-between align-items-baseline border-bottom w-100 mb-3 pb-2">
                    <div className={`flex-grow-1 d-flex flex-row align-items-baseline ${styles.versionWrapper}`}>
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

                    <div className="ml-0 ml-md-2 text-nowrap">
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

export default ChangelogModal;
