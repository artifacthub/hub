import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { ChangeEvent, useState } from 'react';

import { Policies, Repository } from '../../../types';
import getGitHostingProvider from '../../../utils/getGitHostingProvider';
import CommandBlock from './CommandBlock';
import styles from './ContentInstall.module.css';

interface Props {
  repository: Repository;
  policies?: Policies;
  relativePath?: string;
}

const KubeArmorInstall = (props: Props) => {
  const [selectedPolicy, setSelectedPolicy] = useState<string | undefined>(
    !isUndefined(props.policies) && !isEmpty(props.policies) ? Object.keys(props.policies)[0] : undefined
  );
  const url: string | null = getGitHostingProvider(props.repository.url, props.repository.branch);

  if (isUndefined(props.policies) || isUndefined(selectedPolicy)) return null;

  return (
    <div className="mt-3">
      <div className="my-2">
        <small className="text-muted mt-2 mb-1">Select the policy you would like to install:</small>
      </div>

      {isNull(url) ? (
        <>
          <CommandBlock command={`git clone ${url}`} title={'Clone repository:'} />
          <CommandBlock command={`kubectl apply -f POLICY_FILE.yaml`} title={'Install policy using kubectl:'} />
        </>
      ) : (
        <>
          <div className="mb-3 w-50">
            <select
              className="form-select form-select-sm"
              aria-label="channel-select"
              value={selectedPolicy}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedPolicy(e.target.value)}
            >
              {Object.keys(props.policies!).map((policy: string) => (
                <option key={`policy_${policy}`} value={policy}>
                  {policy}
                </option>
              ))}
            </select>
          </div>
          <CommandBlock
            command={`kubectl apply -f ${url}${props.relativePath}/${selectedPolicy}`}
            title={'Install policy using kubectl:'}
          />
        </>
      )}

      {props.repository.private && (
        <div className={`alert alert-warning my-4 ${styles.alert}`} role="alert">
          <span className="fw-bold text-uppercase">Important:</span> This repository is{' '}
          <span className="fw-bold">private</span> and requires some credentials.
        </div>
      )}
    </div>
  );
};

export default KubeArmorInstall;
