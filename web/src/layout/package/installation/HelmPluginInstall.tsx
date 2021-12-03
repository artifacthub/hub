import { Repository } from '../../../types';
import ExternalLink from '../../common/ExternalLink';
import CommandBlock from './CommandBlock';
import PrivateRepoWarning from './PrivateRepoWarning';

interface Props {
  repository: Repository;
}

const HelmPluginInstall = (props: Props) => {
  return (
    <>
      <CommandBlock command={`helm plugin install ${props.repository.url}`} title="Install plugin" />

      {props.repository.private && <PrivateRepoWarning />}

      <div className="mt-2 d-flex flex-row justify-content-between align-items-baseline">
        <ExternalLink href="https://helm.sh/docs/intro/quickstart/" className="btn btn-link ps-0" label="Download Helm">
          Need Helm?
        </ExternalLink>
      </div>
    </>
  );
};

export default HelmPluginInstall;
