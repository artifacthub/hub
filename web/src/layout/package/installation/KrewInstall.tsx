import { Repository } from '../../../types';
import ExternalLink from '../../common/ExternalLink';
import CommandBlock from './CommandBlock';
import PrivateRepoWarning from './PrivateRepoWarning';

interface Props {
  name: string;
  repository: Repository;
}

const DEFAULT_REPO = 'https://github.com/kubernetes-sigs/krew-index';

const KrewInstall = (props: Props) => {
  const isDefaultRepo = props.repository.url.startsWith(DEFAULT_REPO);
  let installCommand = `kubectl krew install ${props.repository.name}/${props.name}`;
  if (isDefaultRepo) {
    installCommand = `kubectl krew install ${props.name}`;
  }

  return (
    <>
      {!isDefaultRepo && (
        <CommandBlock
          command={`kubectl krew index add ${props.repository.name} ${props.repository.url}`}
          title="Add repository"
        />
      )}

      <CommandBlock command={installCommand} title="Install plugin" />

      {props.repository.private && <PrivateRepoWarning />}

      <div className="mt-2 d-flex flex-row justify-content-between align-items-baseline">
        <ExternalLink
          href="https://krew.sigs.k8s.io/docs/user-guide/setup/install/"
          className="btn btn-link ps-0"
          label="Download Krew"
        >
          Need Krew?
        </ExternalLink>
      </div>
    </>
  );
};

export default KrewInstall;
