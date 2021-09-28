import classnames from 'classnames';
import { isNull, isUndefined } from 'lodash';
import moment from 'moment';
import React, { useEffect, useRef, useState } from 'react';
import { CgFileDocument } from 'react-icons/cg';
import { useHistory } from 'react-router-dom';
import semver from 'semver';

import API from '../../../api';
import { ChangeLog, Repository, RepositoryKind, SearchFiltersURL } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
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
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
}

const BTN_HEIGHT = 51;

const ChangelogModal = (props: Props) => {
  const history = useHistory();
  const btnsWrapper = useRef<HTMLDivElement>(null);
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  const [changelog, setChangelog] = useState<ChangeLog[] | null | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPkgId, setCurrentPkgId] = useState<string>(props.packageId);
  const [activeVersionIndex, setActiveVersionIndex] = useState<number>(0);

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
    if (btnsWrapper && btnsWrapper.current) {
      const itemsOnScreen = Math.floor(btnsWrapper.current.clientHeight / BTN_HEIGHT) - 1;
      if (activeVersionIndex + 1 > itemsOnScreen) {
        btnsWrapper.current.scroll(0, (activeVersionIndex - itemsOnScreen) * BTN_HEIGHT);
      } else {
        btnsWrapper.current.scroll(0, 0);
      }
    }
  }, [activeVersionIndex]);

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
      history.replace({
        search: '?modal=changelog',
        state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
      });
    }
  };

  const onCloseModal = () => {
    setActiveVersionIndex(0);
    setOpenStatus(false);
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
                activeVersionIndex={activeVersionIndex}
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
