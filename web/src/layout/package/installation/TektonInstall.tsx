import { isUndefined } from 'lodash';

import { Repository, RepositoryKind } from '../../../types';
import CommandBlock from './CommandBlock';
import styles from './ContentInstall.module.css';

interface Props {
  contentUrl?: string;
  isPrivate?: boolean;
  repository: Repository;
}

const TektonInstall = (props: Props) => {
  const type = props.repository.kind === RepositoryKind.TektonPipeline ? 'pipeline' : 'task';
  let url = props.contentUrl;
  if (isUndefined(url) || url === '') {
    url = type === 'pipeline' ? 'PIPELINE_RAW_YAML_URL' : 'TASK_RAW_YAML_URL';
  }

  return (
    <div className="mt-3">
      <CommandBlock command={`kubectl apply -f ${url}`} title={`Install the ${type}:`} />

      {props.isPrivate && (
        <div className={`alert alert-warning my-4 ${styles.alert}`} role="alert">
          <span className="fw-bold text-uppercase">Important:</span> This repository is{' '}
          <span className="fw-bold">private</span> and requires some credentials.
        </div>
      )}
    </div>
  );
};

export default TektonInstall;
