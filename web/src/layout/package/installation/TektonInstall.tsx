import isUndefined from 'lodash/isUndefined';

import { Repository, RepositoryKind } from '../../../types';
import CommandBlock from './CommandBlock';
import styles from './ContentInstall.module.css';

interface Props {
  contentUrl?: string;
  isPrivate?: boolean;
  repository: Repository;
}

const TektonInstall = (props: Props) => {
  let type: string = 'task';
  switch (props.repository.kind) {
    case RepositoryKind.TektonPipeline:
      type = 'pipeline';
      break;
    case RepositoryKind.TektonStepAction:
      type = 'stepaction';
      break;
  }
  let url = props.contentUrl;
  if (isUndefined(url) || url === '') {
    switch (props.repository.kind) {
      case RepositoryKind.TektonPipeline:
        url = 'PIPELINE_RAW_YAML_URL';
        break;
      case RepositoryKind.TektonStepAction:
        url = 'STEPACTION_RAW_YAML_URL';
        break;
      case RepositoryKind.TektonTask:
        url = 'TASK_RAW_YAML_URL';
        break;
    }
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
