import ExternalLink from '../../common/ExternalLink';
import CommandBlock from './CommandBlock';
import PrivateRepoWarning from './PrivateRepoWarning';

interface Props {
  normalizedName: string;
  isPrivate?: boolean;
}

const FalcoInstall = (props: Props) => (
  <div className="mt-3">
    <CommandBlock
      command={`helm upgrade falco -f https://api.securityhub.dev/resources/falco-rules/${props.normalizedName}/custom-rules.yaml stable/falco`}
    />

    {props.isPrivate && <PrivateRepoWarning />}

    <div className="mt-2">
      <ExternalLink href="https://helm.sh/docs/intro/quickstart/" className="btn btn-link ps-0" label="Download Helm">
        Need Helm?
      </ExternalLink>
    </div>
  </div>
);

export default FalcoInstall;
