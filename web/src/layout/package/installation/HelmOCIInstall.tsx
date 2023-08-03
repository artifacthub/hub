import { Repository } from '../../../types';
import ExternalLink from '../../common/ExternalLink';
import CommandBlock from './CommandBlock';
import styles from './ContentInstall.module.css';
import PrivateRepoWarning from './PrivateRepoWarning';

interface Props {
  name: string;
  version?: string;
  repository: Repository;
}

const HelmOCIInstall = (props: Props) => (
  <>
    <CommandBlock
      command={`helm install my-${props.name} ${props.repository.url} --version ${props.version}`}
      title="Install chart"
    />

    <div className={`fst-italic text-muted ${styles.legend}`}>
      <span className="fw-bold">my-{props.name}</span> corresponds to the release name, feel free to change it to suit
      your needs. You can also add additional flags to the <span className="fw-bold">helm install</span> command if you
      need to.
    </div>

    {props.repository.private && <PrivateRepoWarning />}

    <div className="mt-2">
      <ExternalLink href="https://helm.sh/docs/intro/quickstart/" className="btn btn-link ps-0" label="Download Helm">
        Need Helm?
      </ExternalLink>
    </div>
  </>
);

export default HelmOCIInstall;
