import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { useRef, useState } from 'react';
import { MdAddCircle, MdClose } from 'react-icons/md';

import API from '../../../../../../api';
import { ErrorKind, EventKind, Package } from '../../../../../../types';
import alertDispatcher from '../../../../../../utils/alertDispatcher';
import { PACKAGE_SUBSCRIPTIONS_LIST, SubscriptionItem } from '../../../../../../utils/data';
import CheckBox from '../../../../../common/Checkbox';
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
  const [eventKinds, setEventKinds] = useState<EventKind[]>([EventKind.NewPackageRelease]);
  const [packageItem, setPackageItem] = useState<Package | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);

  const onCloseModal = () => {
    setPackageItem(null);
    setEventKinds([EventKind.NewPackageRelease]);
    props.onClose();
  };

  const submitForm = () => {
    if (!isNull(packageItem)) {
      eventKinds.forEach((event: EventKind, index: number) => {
        addSubscription(event, index === eventKinds.length - 1);
      });
    }
  };

  const onPackageSelection = (packageItem: Package): void => {
    setPackageItem(packageItem);
  };

  const getSubscribedPackagesIds = (): string[] => {
    if (isUndefined(props.subscriptions)) return [];

    const selectedPackages = props.subscriptions.filter(
      (item: Package) =>
        !isUndefined(item.eventKinds) && eventKinds.every((el: EventKind) => item.eventKinds!.includes(el))
    );

    return selectedPackages.map((item: Package) => item.packageId);
  };

  const updateEventKindList = (eventKind: EventKind) => {
    let updatedEventKinds: EventKind[] = [...eventKinds];
    if (eventKinds.includes(eventKind)) {
      // At least event kind must be selected
      if (updatedEventKinds.length > 1) {
        updatedEventKinds = eventKinds.filter((kind: EventKind) => kind !== eventKind);
      }
    } else {
      updatedEventKinds.push(eventKind);
    }
    setEventKinds(updatedEventKinds);
  };

  async function addSubscription(event: EventKind, onLastEvent?: boolean) {
    try {
      setIsSending(true);
      await API.addSubscription(packageItem!.packageId, event);
      setPackageItem(null);
      setIsSending(false);
      if (onLastEvent) {
        props.onSuccess();
        props.onClose();
      }
    } catch (err: any) {
      setIsSending(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        alertDispatcher.postAlert({
          type: 'danger',
          message: `An error occurred subscribing to ${props.getNotificationTitle(event)} notification for ${
            packageItem!.displayName || packageItem!.name
          } package, please try again later.`,
        });
      }
    }
  }

  const getPublisher = (pkg: Package): JSX.Element => {
    return (
      <>
        {pkg.repository.userAlias || pkg.repository.organizationDisplayName || pkg.repository.organizationName}

        <small className="ml-2">
          (<small className={`d-none d-md-inline text-uppercase text-muted ${styles.legend}`}>Repo: </small>
          {pkg.repository.displayName || pkg.repository.name})
        </small>
      </>
    );
  };

  return (
    <Modal
      header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Add subscription</div>}
      open={props.open}
      modalDialogClassName={styles.modal}
      closeButton={
        <button
          className="btn btn-sm btn-outline-secondary"
          type="button"
          disabled={isNull(packageItem) || isSending}
          onClick={submitForm}
          aria-label="Add subscription"
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
        <label className={`font-weight-bold ${styles.label}`} htmlFor="kind" id="events-group">
          Events
        </label>
        <div role="group" aria-labelledby="events-group" className="pb-2">
          {PACKAGE_SUBSCRIPTIONS_LIST.map((subs: SubscriptionItem) => {
            return (
              <div className="mb-2" key={`radio_${subs.name}`}>
                <CheckBox
                  key={`check_${subs.kind}`}
                  name="eventKind"
                  value={subs.kind.toString()}
                  icon={subs.icon}
                  label={subs.title}
                  checked={eventKinds.includes(subs.kind)}
                  onChange={() => {
                    updateEventKindList(subs.kind);
                  }}
                  device="desktop"
                />
              </div>
            );
          })}
        </div>

        <div className="d-flex flex-column mb-3">
          <label className={`font-weight-bold ${styles.label}`} htmlFor="description" id="subscriptions-pkg-list">
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

                    <div className="ml-2 mr-2 mr-sm-0 font-weight-bold mb-0 text-truncate">
                      {packageItem.displayName || packageItem.name}
                      <span className={`d-inline d-sm-none ${styles.legend}`}>
                        <span className="mx-2">/</span>
                        {getPublisher(packageItem)}
                      </span>
                    </div>

                    <div className="px-2 ml-auto w-50 text-dark text-truncate d-none d-sm-inline">
                      {getPublisher(packageItem)}
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    className={`btn h-100 rounded-0 ${styles.closeButton}`}
                    onClick={() => setPackageItem(null)}
                    aria-label="Close"
                  >
                    <MdClose />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={`mt-2 ${styles.searchWrapper}`} ref={searchWrapperRef}>
              <SearchPackages
                disabledPackages={getSubscribedPackagesIds()}
                onSelection={onPackageSelection}
                label="subscriptions-pkg-list"
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default SubscriptionModal;
