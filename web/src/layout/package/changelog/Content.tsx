import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import moment from 'moment';
import { Dispatch, SetStateAction, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BsDot } from 'react-icons/bs';
import { FaLink, FaTrash, FaWrench } from 'react-icons/fa';
import { MdSecurity } from 'react-icons/md';
import { RiTimerFill } from 'react-icons/ri';
import { TiArrowSync, TiPlus } from 'react-icons/ti';
import { useNavigate } from 'react-router-dom';

import { Change, ChangeKind, ChangeLog, PackageLink, Repository } from '../../../types';
import buildPackageURL from '../../../utils/buildPackageURL';
import findClosestNumberIndex from '../../../utils/findClosestNumberIndex';
import isFuture from '../../../utils/isFuture';
import ExternalLink from '../../common/ExternalLink';
import styles from './Content.module.css';

interface Props {
  onCloseModal: (replaceUrl: boolean) => void;
  updateVersionInQueryString: (version: string, index: number) => void;
  changelog: ChangeLog[];
  normalizedName: string;
  activeVersionIndex: number;
  setActiveVersionIndex: Dispatch<SetStateAction<number | undefined>>;
  repository: Repository;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state: any;
}

const Content = (props: Props) => {
  const navigate = useNavigate();
  const wrapper = useRef<HTMLDivElement>(null);
  const versionsRef = useRef<Array<HTMLDivElement | null>>([]);
  const [currentOffsets, setCurrentOffsets] = useState<number[]>([]);

  const openPackagePage = (newVersion: string) => {
    props.onCloseModal(false);
    navigate(
      {
        pathname: buildPackageURL(props.normalizedName, props.repository, newVersion, true),
      },
      {
        state: props.state,
      }
    );
  };

  useLayoutEffect(() => {
    const offsets: number[] = versionsRef.current.map((el) => (el ? el.offsetTop : 0));
    setCurrentOffsets(offsets);
  }, []);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const scrollYPosition = e.target ? (e.target as HTMLDivElement).scrollTop : 0;
      const index = findClosestNumberIndex(currentOffsets, scrollYPosition);
      if (index >= 0 && props.activeVersionIndex !== index) {
        props.setActiveVersionIndex(index);
      }
    };

    if (wrapper && wrapper.current && currentOffsets.length > 0) {
      const element = wrapper.current;
      element.addEventListener('scroll', handleScroll, { passive: true });
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, [currentOffsets, props]);

  return (
    <>
      <div className="flex-grow-1 overflow-auto h-100" ref={wrapper}>
        {props.changelog.map((item: ChangeLog, index: number) => {
          if (isNull(item.changes) || isUndefined(item.changes)) return null;

          const hasBadge = item.changes.some(
            (change: Change) => !isUndefined(change.kind) && change.kind.toString() !== ''
          );

          return (
            <div
              key={`v_${item.version}`}
              data-testid="changelogBlock"
              className={classnames({
                [styles.lastVersion]: index === props.changelog.length - 1,
              })}
            >
              <div
                className="d-inline-block d-md-flex flex-row align-items-baseline border-bottom border-1 w-100 mb-3 pb-2"
                id={`changelog-${index}`}
                ref={(el) => (versionsRef.current[index] = el)}
              >
                <div className={`d-flex flex-row align-items-baseline ${styles.versionWrapper}`}>
                  <button
                    className={`btn btn-link btn-sm text-dark text-truncate mb-0 p-0 fs-5 ${styles.btnTitle}`}
                    onClick={() => openPackagePage(item.version)}
                    aria-label={`Open version ${item.version}`}
                  >
                    {item.version}
                  </button>
                  <button
                    className={`btn btn-link btn-sm text-dark py-0 position-relative ${styles.btnLink}`}
                    onClick={() => props.updateVersionInQueryString(item.version, index)}
                    aria-label={`Update active version in querystring to ${item.version}`}
                  >
                    <FaLink />
                  </button>
                </div>

                {(item.containsSecurityUpdates || item.prerelease) && (
                  <div className={styles.badgesWrapper}>
                    {item.prerelease && (
                      <span className={`badge badge-sm me-2 position-relative border ${styles.badge}`}>
                        Pre-release
                      </span>
                    )}
                    {item.containsSecurityUpdates && (
                      <span className={`badge badge-sm me-2 position-relative border ${styles.badge}`}>
                        Contains security updates
                      </span>
                    )}
                  </div>
                )}

                {!isFuture(item.ts) && (
                  <div className="ms-auto ps-0 ps-md-2 text-nowrap">
                    <small className="text-muted">Released {moment.unix(item.ts).fromNow()}</small>
                  </div>
                )}
              </div>

              <div className={`d-flex flex-column mb-4 ${styles.list}`}>
                {item.changes.map((change: Change, idx: number) => (
                  <div key={`change_${item.version}_${idx}`} className="mb-1 w-100 d-flex flex-row">
                    <div className="d-flex align-items-start flex-row w-100">
                      {change.kind ? (
                        <div className={`position-relative ${styles.changeBadgeWrapper}`}>
                          <div
                            className={classnames(
                              'd-flex flex-row align-items-center justify-content-center text-uppercase badge me-2 fw-normal px-1 py-0',
                              styles.changeBadge,
                              styles[`${change.kind.toString()}ChangeBadge`]
                            )}
                          >
                            <span>
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
                            <span className={`d-none d-md-block ms-1 ${styles.badgeContent}`}>
                              {change.kind.toString()}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <>
                          {hasBadge ? (
                            <div className={`position-relative ${styles.changeBadgeWrapper}`}>
                              <div
                                className={classnames(
                                  'd-flex flex-row align-items-center justify-content-center text-uppercase badge me-2',
                                  styles.changeBadge
                                )}
                              >
                                -
                              </div>
                            </div>
                          ) : (
                            <div className="me-1 me-md-2">
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
                                  <ExternalLink
                                    className={`text-muted text-decoration-underline ${styles.link}`}
                                    href={link.url}
                                    label={`Open link ${link.name}`}
                                  >
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
    </>
  );
};

export default Content;
