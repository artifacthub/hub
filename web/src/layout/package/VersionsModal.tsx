import classNames from 'classnames';
import compact from 'lodash/compact';
import uniq from 'lodash/uniq';
import { useCallback, useEffect, useState } from 'react';
import { FaCaretDown } from 'react-icons/fa';
import { HiPlusCircle } from 'react-icons/hi';

import { Channel, Package, Version as VersionData } from '../../types';
import sortVersions from '../../utils/sortVersions';
import Modal from '../common/Modal';
import Version from './Version';
import VersionInRow from './VersionInRow';
import styles from './VersionsModal.module.css';

interface Props {
  package: Package;
  sortedVersions: VersionData[];
  title: string;
  channels?: Channel[] | null;
}

interface VersionsProps {
  items: JSX.Element[];
  itemsForModal: JSX.Element[] | JSX.Element;
  itemsSortedAppVersionForModal: JSX.Element[] | JSX.Element;
}

const VersionsModal = (props: Props) => {
  const [openStatus, setOpenStatus] = useState(false);
  const [sortedBy, setSortedBy] = useState<string>('version');
  const getAllVersions = useCallback((): VersionsProps => {
    const items: JSX.Element[] = [];
    const itemsForModal: JSX.Element[] = [];
    const itemsSortedAppVersionForModal: JSX.Element[] = [];

    const sortedAppVersions: string[] = props.package.availableVersions
      ? sortVersions(
          uniq(
            compact(
              props.package.availableVersions!.map((version: VersionData) => {
                if (version.appVersion) {
                  return version.appVersion;
                }
              })
            )
          )
        )
      : [];

    const getLinkedChannelsToVersion = (version: string): string[] | undefined => {
      let linked: string[] | undefined;
      if (props.channels) {
        const channels: string[] = [];
        props.channels.forEach((ch: Channel) => {
          if (ch.version === version) {
            channels.push(ch.name);
          }
        });
        // Sort channels: using defaultChannel as first one
        if (channels.length > 0) {
          const sortedChannels = uniq(channels).sort((a, b) => {
            if (a === props.package.defaultChannel) return -1;
            if (b === props.package.defaultChannel) return 1;
            return 0;
          });

          linked = sortedChannels;
        }
      }

      return linked;
    };

    props.sortedVersions.forEach((av_version: VersionData, index: number) => {
      const linkedChannels = getLinkedChannelsToVersion(av_version.version);

      if (index <= 5) {
        items.push(
          <Version
            key={`${av_version.version}_${index}`}
            isActive={av_version.version === props.package.version}
            {...av_version}
            linkedChannels={linkedChannels}
            normalizedName={props.package.normalizedName}
            repository={props.package.repository}
          />
        );
      }

      itemsForModal.push(
        <VersionInRow
          key={`${av_version.version}_inline_${index}`}
          isActive={av_version.version === props.package.version}
          {...av_version}
          linkedChannels={linkedChannels}
          normalizedName={props.package.normalizedName}
          repository={props.package.repository}
          onClick={() => setOpenStatus(false)}
        />
      );
    });

    if (sortedAppVersions.length === 0) {
      itemsSortedAppVersionForModal.push(...itemsForModal);
    } else {
      sortedAppVersions.forEach((appVersion: string, index: number) => {
        const versions = props.sortedVersions.filter((version: VersionData) => version.appVersion === appVersion);
        versions.forEach((av_version: VersionData) => {
          const linkedChannels = getLinkedChannelsToVersion(av_version.version);

          itemsSortedAppVersionForModal.push(
            <VersionInRow
              key={`${av_version.version}_inline_${index}`}
              isActive={av_version.version === props.package.version}
              {...av_version}
              linkedChannels={linkedChannels}
              normalizedName={props.package.normalizedName}
              repository={props.package.repository}
              onClick={() => setOpenStatus(false)}
            />
          );
        });
      });
    }

    return {
      items,
      itemsForModal: itemsForModal,
      itemsSortedAppVersionForModal: itemsSortedAppVersionForModal,
    };
  }, [
    props.channels,
    props.package.normalizedName,
    props.package.repository,
    props.package.version,
    props.sortedVersions,
    props.package.defaultChannel,
  ]);

  const [versions, setVersions] = useState<VersionsProps>(getAllVersions());

  useEffect(() => {
    setVersions(getAllVersions());
  }, [props.package.packageId, props.package.version]);

  if (versions.items.length === 0) {
    return null;
  }

  return (
    <>
      <div role="list">
        {versions.items.length > 3 ? (
          <>
            <div className="d-none d-md-block">{versions.items.slice(0, 3)}</div>
            <div className="d-block d-md-none">{versions.items.slice(0, 5)}</div>
          </>
        ) : (
          <div>{versions.items}</div>
        )}
      </div>

      {props.sortedVersions.length > 5 && (
        <div className={`d-block d-md-none ${styles.legend}`}>
          <small className="text-muted fst-italic">Displaying only the first 5 entries</small>
        </div>
      )}

      <div className="d-none d-md-flex flex-row align-items-baseline">
        <button
          className={`btn btn-link ps-0 pe-1 position-relative text-primary ${styles.btn}`}
          onClick={() => setOpenStatus(true)}
          aria-label="See all entries"
        >
          <div className="d-flex flex-row align-items-center">
            <HiPlusCircle className="me-1" />
            <span>See all</span>
          </div>
        </button>

        <div className={`text-muted position-relative ${styles.summary}`}>({props.sortedVersions.length})</div>
      </div>

      <Modal
        modalDialogClassName={styles.modalDialog}
        modalClassName={styles.modal}
        header={<div className={`h3 m-2 flex-grow-1 text-truncate ${styles.title}`}>{props.title}</div>}
        open={openStatus}
        onClose={() => setOpenStatus(false)}
        footerClassName={styles.modalFooter}
        size="lg"
      >
        <div className="my-3 mw-100">
          <table className={`table table-striped table-bordered table-sm mb-0 ${styles.table}`}>
            <thead>
              <tr className={styles.tableTitle}>
                <th scope="col" className={styles.versionCell}>
                  <button
                    onClick={() => setSortedBy('version')}
                    className="d-flex flex-row justify-content-between btn btn-link text-reset w-100 p-0 m-0 fw-bold"
                    type="button"
                    aria-label="Sort by version"
                  >
                    <div className="px-3">Version</div>
                    <div
                      data-testid="sort-version-icon"
                      className={classNames({
                        visible: sortedBy === 'version',
                        invisible: sortedBy !== 'version',
                      })}
                    >
                      <FaCaretDown />
                    </div>
                  </button>
                </th>
                <th scope="col" className={styles.appVersionCell}>
                  <button
                    onClick={() => setSortedBy('appVersion')}
                    className="d-flex flex-row justify-content-between btn btn-link text-reset w-100 p-0 m-0 fw-bold"
                    type="button"
                    aria-label="Sort by app version"
                  >
                    <div className="px-3">App version</div>
                    <div
                      data-testid="sort-app-version-icon"
                      className={classNames({
                        visible: sortedBy === 'appVersion',
                        invisible: sortedBy !== 'appVersion',
                      })}
                    >
                      <FaCaretDown />
                    </div>
                  </button>
                </th>
                <th scope="col" className={styles.releasedCell}>
                  <span className="px-3">Released</span>
                </th>
              </tr>
            </thead>
            <tbody className={styles.body}>
              {sortedBy === 'appVersion' ? (
                <>{versions.itemsSortedAppVersionForModal}</>
              ) : (
                <>{versions.itemsForModal}</>
              )}
            </tbody>
          </table>
        </div>
      </Modal>
    </>
  );
};

export default VersionsModal;
