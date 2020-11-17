import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useRef, useState } from 'react';
import { MdAddCircle, MdClose } from 'react-icons/md';

import { API } from '../../../../../../api';
import { ErrorKind, EventKind, Package } from '../../../../../../types';
import alertDispatcher from '../../../../../../utils/alertDispatcher';
import { PACKAGE_SUBSCRIPTIONS_LIST, SubscriptionItem } from '../../../../../../utils/data';
import Image from '../../../../../common/Image';
import Modal from '../../../../../common/Modal';
import RepositoryIcon from '../../../../../common/RepositoryIcon';
import SearchPackages from '../../../../../common/SearchPackages';
import styles from './Modal.module.css';

interface Props {
  open: boolean;
  subscriptions?: Package[];
  onSuccess: () => void;
  onClose: () => void;
  getNotificationTitle: (kind: EventKind) => string;
}

const SubscriptionModal = (props: Props) => {
  const searchWrapperRef = useRef<HTMLDivElement | null>(null);
  const [apiError, setApiError] = useState(null);
  const [eventKind, setEventKind] = useState<EventKind>(EventKind.NewPackageRelease);
  const [packageItem, setPackageItem] = useState<Package | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);

  const onCloseModal = () => {
    setPackageItem(null);
    props.onClose();
  };

  const submitForm = () => {
    if (!isNull(packageItem)) {
      addSubscription();
    }
  };

  const onPackageSelection = (packageItem: Package): void => {
    setPackageItem(packageItem);
  };

  const getSubscribedPackagesIds = (): string[] => {
    if (isUndefined(props.subscriptions)) return [];

    const selectedPackages = props.subscriptions.filter(
      (item: Package) => !isUndefined(item.eventKinds) && item.eventKinds.includes(eventKind)
    );

    return selectedPackages.map((item: Package) => item.packageId);
  };

  async function addSubscription() {
    try {
      setIsSending(true);
      await API.addSubscription(packageItem!.packageId, eventKind);
      setPackageItem(null);
      setIsSending(false);
      props.onSuccess();
      props.onClose();
    } catch (err) {
      setIsSending(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        alertDispatcher.postAlert({
          type: 'danger',
          message: `An error occurred subscribing to ${props.getNotificationTitle(eventKind)} notification for ${
            packageItem!.displayName || packageItem!.name
          } package, please try again later.`,
        });
      }
    }
  }

  return (
    <Modal
      header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Add subscription</div>}
      open={props.open}
      modalDialogClassName={styles.modal}
      closeButton={
        <button
          data-testid="addSubsModalBtn"
          className="btn btn-sm btn-secondary"
          type="button"
          disabled={isNull(packageItem) || isSending}
          onClick={submitForm}
        >
          {isSending ? (
            <>
              <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
              <span className="ml-2">Adding subscription</span>
            </>
          ) : (
            <div className="d-flex flex-row align-items-center text-uppercase">
              <MdAddCircle className="mr-2" />
              <div>Add</div>
            </div>
          )}
        </button>
      }
      onClose={onCloseModal}
      error={apiError}
      cleanError={() => setApiError(null)}
      excludedRefs={[searchWrapperRef]}
      noScrollable
    >
      <div className="w-100 position-relative">
        <label className={`font-weight-bold ${styles.label}`} htmlFor="kind">
          Events
        </label>
        {PACKAGE_SUBSCRIPTIONS_LIST.map((subs: SubscriptionItem) => {
          return (
            <div className="custom-control custom-radio mb-3" key={`radio_${subs.name}`}>
              <input
                data-testid={`radio_${subs.kind}`}
                className="custom-control-input"
                type="radio"
                name="kind"
                id={subs.name}
                value={subs.kind}
                disabled={!subs.enabled}
                checked={subs.kind === eventKind}
                onChange={() => setEventKind(subs.kind)}
                required
              />
              <label className="custom-control-label" htmlFor={subs.name}>
                <div className="d-flex flex-row align-items-center ml-2">
                  {subs.icon}
                  <div className="ml-1">{subs.title}</div>
                </div>
              </label>
            </div>
          );
        })}

        <div className="d-flex flex-column mb-3">
          <label className={`font-weight-bold ${styles.label}`} htmlFor="description">
            Package
          </label>

          <small className="mb-2">Select the package you'd like to subscribe to:</small>

          {!isNull(packageItem) ? (
            <div
              data-testid="activePackageItem"
              className={`border border-secondary w-100 rounded mt-1 ${styles.packageWrapper}`}
            >
              <div className="d-flex flex-row flex-nowrap align-items-stretch justify-content-between">
                <div className="flex-grow-1 text-truncate py-2">
                  <div className="d-flex flex-row align-items-center h-100 text-truncate">
                    <div className="d-none d-md-inline">
                      <RepositoryIcon kind={packageItem.repository.kind} className={`mx-3 ${styles.icon}`} />
                    </div>

                    <div
                      className={`d-flex align-items-center justify-content-center overflow-hidden p-1 ml-2 ml-md-0 ${styles.imageWrapper} imageWrapper`}
                    >
                      <Image
                        alt={packageItem.displayName || packageItem.name}
                        imageId={packageItem.logoImageId}
                        className={styles.image}
                        kind={packageItem.repository.kind}
                      />
                    </div>

                    <div className="ml-2 font-weight-bold mb-0 text-truncate">
                      {packageItem.displayName || packageItem.name}
                    </div>

                    <div className="px-2 ml-auto w-50 text-dark text-truncate">
                      {packageItem.repository.userAlias ||
                        packageItem.repository.organizationDisplayName ||
                        packageItem.repository.organizationName}
                      <small className="ml-2">
                        (
                        <small className={`d-none d-md-inline text-uppercase text-muted ${styles.legend}`}>
                          Repo:{' '}
                        </small>
                        {packageItem.repository.displayName || packageItem.repository.name})
                      </small>
                    </div>
                  </div>
                </div>

                <div>
                  <button className={`btn h-100 rounded-0 ${styles.closeButton}`} onClick={() => setPackageItem(null)}>
                    <MdClose />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={`mt-2 ${styles.searchWrapper}`} ref={searchWrapperRef}>
              <SearchPackages disabledPackages={getSubscribedPackagesIds()} onSelection={onPackageSelection} />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default SubscriptionModal;
