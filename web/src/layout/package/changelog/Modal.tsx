import classnames from 'classnames';
import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import moment from 'moment';
import { useEffect, useRef, useState } from 'react';
import { CgFileDocument } from 'react-icons/cg';
import { FaMarkdown } from 'react-icons/fa';
import { MdClose } from 'react-icons/md';
import { useLocation, useNavigate } from 'react-router-dom';

import API from '../../../api';
import { ChangeLog, Repository, RepositoryKind } from '../../../types';
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
  visibleVersion?: string | null;
}

const ChangelogModal = (props: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const btnsWrapper = useRef<HTMLDivElement>(null);
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  const [changelog, setChangelog] = useState<ChangeLog[] | null | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPkgId, setCurrentPkgId] = useState<string | undefined>(undefined);
  const [activeVersionIndex, setActiveVersionIndex] = useState<number | undefined>(undefined);
  const [isGettingMd, setIsGettingMd] = useState<boolean>(false);
  const [initialState] = useState(location.state);

  const updateVersionInQueryString = (version?: string, index?: number) => {
    if (!isUndefined(index)) {
      updateActiveVersion(index);
    }
    navigate(`?modal=changelog${version ? `&version=${version}` : ''}`, {
      state: initialState,
      replace: true,
    });
  };

  useEffect(() => {
    setActiveVersionIndex(undefined);
    if (props.visibleChangelog && !isUndefined(currentPkgId)) {
      getChangelog();
    } else if (openStatus && !props.visibleChangelog) {
      onCloseModal(false);
    }
  }, [props.packageId, props.currentVersion]);

  useEffect(() => {
    if (props.visibleChangelog && !openStatus && isUndefined(currentPkgId)) {
      onOpenModal();
    }
  }, []);

  useEffect(() => {
    if (btnsWrapper && btnsWrapper.current && !isUndefined(activeVersionIndex)) {
      const activeChild = btnsWrapper.current.children[activeVersionIndex];
      if (!isUndefined(activeChild)) {
        // Scroll to active button
        activeChild.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeVersionIndex]);

  const removeEmptyVersions = (data: ChangeLog[]): ChangeLog[] => {
    return data.filter(
      (item: ChangeLog) => !isNull(item.changes) && !isUndefined(item.changes) && !isEmpty(item.changes)
    );
  };

  useEffect(() => {
    // We load correct active version after rendering modal
    if (openStatus && changelog && isUndefined(activeVersionIndex)) {
      const version = props.visibleVersion || props.currentVersion;
      if (version) {
        const currentIndex = changelog.findIndex((ch: ChangeLog) => ch.version === version);
        if (currentIndex >= 0) {
          if (version === props.currentVersion) {
            updateVersionInQueryString(version, currentIndex);
          } else {
            updateActiveVersion(currentIndex);
          }
        } else {
          updateVersionInQueryString();
          setActiveVersionIndex(0);
        }
        // If version doesn't exist
      } else {
        updateVersionInQueryString();
        setActiveVersionIndex(0);
      }
    }
  }, [openStatus, changelog]);

  if (
    [RepositoryKind.Falco, RepositoryKind.Krew, RepositoryKind.HelmPlugin, RepositoryKind.Container].includes(
      props.repository.kind
    )
  )
    return null;

  async function getChangelog() {
    try {
      setIsLoading(true);
      setCurrentPkgId(props.packageId);
      setChangelog(removeEmptyVersions(await API.getChangelog(props.packageId)));
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
      getChangelog();
    } else {
      navigate('', {
        state: initialState,
        replace: true,
      });
    }
  };

  const onCloseModal = (replaceUrl: boolean) => {
    setOpenStatus(false);
    setActiveVersionIndex(undefined);
    setIsGettingMd(false);
    setIsLoading(false);
    setChangelog(undefined);
    if (replaceUrl) {
      navigate('', {
        state: initialState,
        replace: true,
      });
    }
  };

  const updateActiveVersion = (versionIndex: number) => {
    if (versionIndex !== activeVersionIndex) {
      const element = document.getElementById(`changelog-${versionIndex}`);
      if (element) {
        element.scrollIntoView({ block: 'start' });
      }
      setActiveVersionIndex(versionIndex);
    }
  };

  const getChangelogMarkdown = () => {
    async function getChangelogMd() {
      try {
        setIsGettingMd(true);
        const markdown = await API.getChangelogMD({
          packageName: props.normalizedName,
          repositoryKind: getRepoKindName(props.repository.kind)!,
          repositoryName: props.repository.name,
        });

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
          message: 'An error occurred getting package changelog markdown, please try again later.',
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
            className={classnames('btn btn-outline-secondary btn-sm text-nowrap w-100', {
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
                  <span className="d-none d-md-inline ms-2 fw-bold">Getting changelog...</span>
                </>
              ) : (
                <>
                  <CgFileDocument />
                  <span className="ms-2 fw-bold">Changelog</span>
                </>
              )}
            </div>
          </button>
        }
        visibleTooltip={!props.hasChangelog}
        tooltipWidth={230}
        tooltipClassName={styles.tooltip}
        tooltipMessage="No versions of this package include an annotation with information about the changes it introduces."
        active
      />

      {openStatus && changelog && (
        <Modal
          modalDialogClassName={styles.modalDialog}
          modalClassName="h-100"
          header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Changelog</div>}
          onClose={() => onCloseModal(true)}
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
                      <span className="ms-2">Getting markdown</span>
                    </>
                  ) : (
                    <>
                      <FaMarkdown className="me-2" />
                      <div className="text-uppercase">Get markdown</div>
                    </>
                  )}
                </div>
              </button>

              <button
                className="btn btn-sm btn-outline-secondary text-uppercase"
                onClick={() => onCloseModal(true)}
                aria-label="Close modal"
              >
                <div className="d-flex flex-row align-items-center">
                  <MdClose className="me-2" />
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
                  className={`d-flex flex-column me-4 border-end border-1 overflow-auto ${styles.versionsIndexWrapper}`}
                  ref={btnsWrapper}
                >
                  {changelog.map((item: ChangeLog, index: number) => {
                    if (isNull(item.changes) || isUndefined(item.changes)) return null;
                    return (
                      <div
                        data-testid="versionBtnWrapper"
                        className={classnames(
                          'pe-4 ps-2 position-relative border-bottom border-1',
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
                            'btn btn-link text-dark text-start p-0 text-truncate position-relative w-100 rounded-0',
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
                onCloseModal={onCloseModal}
                updateVersionInQueryString={updateVersionInQueryString}
                normalizedName={props.normalizedName}
                activeVersionIndex={activeVersionIndex || 0}
                setActiveVersionIndex={setActiveVersionIndex}
                repository={props.repository}
                state={initialState}
              />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default ChangelogModal;
