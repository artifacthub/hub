import classnames from 'classnames';
import { isNull, isUndefined } from 'lodash';
import moment from 'moment';
import React, { useEffect, useRef, useState } from 'react';
import { CgFileDocument } from 'react-icons/cg';
import { FaMarkdown } from 'react-icons/fa';
import { MdClose } from 'react-icons/md';
import { useHistory } from 'react-router-dom';
import semver from 'semver';

import API from '../../../api';
import { ChangeLog, Repository, RepositoryKind, SearchFiltersURL } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
import { getRepoKindName } from '../../../utils/repoKind';
import ElementWithTooltip from '../../common/ElementWithTooltip';
import Modal from '../../common/Modal';
import Content from './Content';
import styles from './Modal.module.css';

interface Props {
  normalizedName: string;
  repository: Repository;
  packageId: string;
  hasChangelog: boolean;
  visibleChangelog: boolean;
  currentVersion?: string;
  visibleVersion?: string;
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
}

const ChangelogModal = (props: Props) => {
  const history = useHistory();
  const btnsWrapper = useRef<HTMLDivElement>(null);
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  const [changelog, setChangelog] = useState<ChangeLog[] | null | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPkgId, setCurrentPkgId] = useState<string>(props.packageId);
  const [activeVersionIndex, setActiveVersionIndex] = useState<number | undefined>(undefined);
  const [isGettingMd, setIsGettingMd] = useState<boolean>(false);
  const [changelogMD, setChangelogMD] = useState<string | undefined>();

  const updateVersionInQueryString = (currentVersion?: string) => {
    let version = currentVersion;
    if (changelog && changelog.length > 0 && !isUndefined(activeVersionIndex)) {
      version = changelog[activeVersionIndex].version;
    }
    if (version) {
      history.replace({
        search: `?modal=changelog&version=${version}`,
        state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
      });
    }
  };

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
      setActiveVersionIndex(0);
    }
  }, [props.packageId]); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    if (btnsWrapper && btnsWrapper.current && !isUndefined(activeVersionIndex)) {
      if (!isUndefined(btnsWrapper.current.children[activeVersionIndex])) {
        // Scroll to active button
        btnsWrapper.current.children[activeVersionIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      // When changelog is defined, url with new active version is updated
      if (changelog) {
        updateVersionInQueryString(changelog[activeVersionIndex].version);
      }
    }
  }, [activeVersionIndex]); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    // We load correct active version after rendering modal
    if (openStatus && changelog && isUndefined(activeVersionIndex)) {
      const version = props.visibleVersion || props.currentVersion || changelog[0].version;
      const currentIndex = changelog.findIndex((ch: ChangeLog) => ch.version === version);
      if (currentIndex >= 0) {
        updateActiveVersion(changelog.findIndex((ch: ChangeLog) => ch.version === version));
        // If version doesn't exist
      } else {
        setActiveVersionIndex(0);
      }
    }
  }, [openStatus, changelog]); /* eslint-disable-line react-hooks/exhaustive-deps */

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
      setChangelogMD(undefined);
      const changelog = await API.getChangelog(props.packageId);
      const sortedChangelog: ChangeLog[] = sortChangelog(changelog);
      setCurrentPkgId(props.packageId);
      setChangelog(sortedChangelog);
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
    }
  };

  const onCloseModal = () => {
    setOpenStatus(false);
    setActiveVersionIndex(undefined);
    history.replace({
      search: '',
      state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
    });
  };

  const updateActiveVersion = (versionIndex: number) => {
    if (versionIndex !== activeVersionIndex) {
      const element = document.getElementById(`changelog-${versionIndex}`);
      if (element) {
        element.scrollIntoView({ block: 'start', inline: 'nearest' });
      }
      setActiveVersionIndex(versionIndex);
    }
  };

  const getChangelogMarkdown = () => {
    async function getChangelogMd() {
      try {
        setIsGettingMd(true);
        let markdown = changelogMD;
        if (isUndefined(markdown)) {
          markdown = await API.getChangelogMD({
            packageName: props.normalizedName,
            repositoryKind: getRepoKindName(props.repository.kind)!,
            repositoryName: props.repository.name,
          });

          setChangelogMD(markdown);
        }
        const blob = new Blob([markdown], {
          type: 'text/markdown',
        });
        const link: HTMLAnchorElement = document.createElement('a');
        link.download = 'changelog.md';
        link.href = window.URL.createObjectURL(blob);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setIsGettingMd(false);
      } catch {
        alertDispatcher.postAlert({
          type: 'danger',
          message: 'An error occurred getting package changelog markodwn, please try again later.',
        });
        setIsGettingMd(false);
      }
    }
    getChangelogMd();
  };

  return (
    <>
      <ElementWithTooltip
        element={
          <button
            className={classnames('btn btn-outline-secondary btn-block btn-sm text-nowrap', {
              disabled: !props.hasChangelog,
            })}
            onClick={onOpenModal}
            aria-label="Open Changelog modal"
            aria-disabled={!props.hasChangelog}
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
          closeButton={
            <div className="w-100 d-flex flex-row align-items-center justify-content-between">
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={getChangelogMarkdown}
                disabled={isGettingMd}
                aria-label="Get changelog markdown"
              >
                <div className="d-flex flex-row align-items-center">
                  {isGettingMd ? (
                    <>
                      <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                      <span className="ml-2">Getting markdown</span>
                    </>
                  ) : (
                    <>
                      <FaMarkdown className="mr-2" />
                      <div className="text-uppercase">Get markdown</div>
                    </>
                  )}
                </div>
              </button>

              <button
                className="btn btn-sm btn-outline-secondary text-uppercase"
                onClick={onCloseModal}
                aria-label="Close modal"
              >
                <div className="d-flex flex-row align-items-center">
                  <MdClose className="mr-2" />
                  <div>Close</div>
                </div>
              </button>
            </div>
          }
        >
          <div className="mw-100 h-100">
            <div className="d-flex flex-row h-100">
              <div className="h-100 d-none d-lg-flex">
                <div
                  className={`d-flex flex-column mr-4 border-right overflow-auto ${styles.versionsIndexWrapper}`}
                  ref={btnsWrapper}
                >
                  {changelog.map((item: ChangeLog, index: number) => {
                    if (isNull(item.changes) || isUndefined(item.changes)) return null;
                    return (
                      <div
                        className={classnames(
                          'pr-4 pl-2 position-relative border-bottom',
                          styles.versionBtnWrapper,
                          {
                            [styles.activeVersionBtnWrapper]: index === activeVersionIndex,
                          },
                          {
                            'border-top': index === 0,
                          }
                        )}
                        key={`opt_${item.version}`}
                      >
                        <button
                          className={classnames(
                            'btn btn-link text-dark text-left p-0 text-truncate position-relative w-100',
                            styles.versionBtn
                          )}
                          onClick={() => updateActiveVersion(index)}
                        >
                          {item.version}
                          <br />
                          <small className={`text-muted ${styles.legend}`}>
                            {moment.unix(item.ts).format('D MMM, YYYY')}
                          </small>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <Content
                changelog={changelog}
                setOpenStatus={setOpenStatus}
                normalizedName={props.normalizedName}
                activeVersionIndex={activeVersionIndex || 0}
                setActiveVersionIndex={setActiveVersionIndex}
                repository={props.repository}
                searchUrlReferer={props.searchUrlReferer}
                fromStarredPage={props.fromStarredPage}
              />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default ChangelogModal;
