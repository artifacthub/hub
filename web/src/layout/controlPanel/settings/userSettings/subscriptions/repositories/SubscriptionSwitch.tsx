import { isUndefined } from 'lodash';
import React, { useState } from 'react';

import { EventKind, OptOutItem, Repository } from '../../../../../../types';
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const id = `subs_${props.repoInfo.repositoryId}_${props.kind}`;

  return (
    <div className="custom-control custom-switch ml-2 position-relative">
      <input
        data-testid={`${id}_input`}
        id={id}
        type="checkbox"
        className={`custom-control-input ${styles.checkbox}`}
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
            callback: () => setIsLoading(false),
          });
        }}
        checked={isUndefined(props.optOutItem) ? false : true}
      />
      <label data-testid={`${id}_label`} className="custom-control-label" htmlFor={id} />

      {isLoading && (
        <div className={`position-absolute text-secondary ${styles.switchLoading}`}>
          <span className="spinner-border spinner-border-sm" role="status" />
        </div>
      )}
    </div>
  );
};

export default SubscriptionSwitch;
