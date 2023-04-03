import { Repository } from '../../../types';
import removeProtocol from '../../../utils/removeUrlProtocol';
import trimPrefix from '../../../utils/trimPrefix';
import ExternalLink from '../../common/ExternalLink';
import CommandBlock from './CommandBlock';
import styles from './ContentInstall.module.css';
import PrivateRepoWarning from './PrivateRepoWarning';

interface Props {
  repository: Repository;
  relativePath: string;
}

const KustomizeGatekeeperInstall = (props: Props) => {
  const url = removeProtocol(props.repository.url);

  return (
    <div className={`mt-3 ${styles.gatekeeperInstallContent}`}>
      <p className="text-muted">
        First, create a <code className={`border border-1 ${styles.inlineCode}`}>kustomization.yaml</code> file:
      </p>

      <CommandBlock
        command={`apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ${url}${url.endsWith('/') ? trimPrefix('/', props.relativePath) : props.relativePath}
  - constraints.yaml`}
        language="yaml"
      />

      <p className="text-muted">
        Then define your constraints in a file called{' '}
        <code className={`border border-1 ${styles.inlineCode}`}>constraints.yaml</code> in the same directory. Example
        constraints can be found in the "samples" folders.
      </p>

      <p className="text-muted">
        You can install everything with{' '}
        <code className={`border border-1 ${styles.inlineCode}`}>kustomize build . | kubectl apply -f -</code>
      </p>

      <p className="text-muted">
        More information can be found in the{' '}
        <ExternalLink
          href="https://kubectl.docs.kubernetes.io/installation/kustomize/"
          className={`btn btn-link p-0 fw-bold position-relative ${styles.btnInText}`}
          label="Kustomization documentation"
        >
          kustomization documentation
        </ExternalLink>
        .
      </p>

      {props.repository.private && <PrivateRepoWarning />}
    </div>
  );
};

export default KustomizeGatekeeperInstall;
