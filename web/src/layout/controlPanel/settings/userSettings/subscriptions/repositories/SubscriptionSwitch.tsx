import isUndefined from 'lodash/isUndefined';
import { useState } from 'react';

import useIsMounted from '../../../../../../hooks/useIsMounted';
import { EventKind, OptOutItem, Repository } from '../../../../../../types';
import Loading from '../../../../../common/Loading';
import styles from '../SubscriptionsSection.module.css';

interface ChangeSubsProps {
  data: {
    repoId: string;
    kind: EventKind;
    repoName: string;
    optOutId?: string;
  };
  callback: () => void;
}

interface Props {
  repoInfo: Repository;
  kind: EventKind;
  optOutItem?: OptOutItem;
  enabled: boolean;
  changeSubscription: (changeProps: ChangeSubsProps) => void;
}

const SubscriptionSwitch = (props: Props) => {
  const isMounted = useIsMounted();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const id = `subs_${props.repoInfo.repositoryId}_${props.kind}`;

  return (
    <>
      <div className="form-switch">
        <input
          data-testid={`${id}_input`}
          id={id}
          type="checkbox"
          role="switch"
          className={`form-check-input ${styles.checkbox}`}
          disabled={!props.enabled || isLoading}
          onChange={() => {
            setIsLoading(true);
            props.changeSubscription({
              data: {
                repoId: props.repoInfo.repositoryId!,
                kind: props.kind,
                repoName: props.repoInfo.name,
                optOutId: props.optOutItem ? props.optOutItem.optOutId : undefined,
              },
              callback: () => {
                // Loading is hidden when component is mounted
                if (isMounted()) {
                  setIsLoading(false);
                }
              },
            });
          }}
          checked={isUndefined(props.optOutItem) ? false : true}
        />
      </div>
      {isLoading && (
        <div className={`position-absolute ${styles.switchLoading}`}>
          <Loading noWrapper smallSize />
        </div>
      )}
    </>
  );
};

export default SubscriptionSwitch;
