import { Repository } from '../../../types';
import { OCI_PREFIX } from '../../../utils/data';
import ExternalLink from '../../common/ExternalLink';
import CommandBlock from './CommandBlock';
import styles from './ContentInstall.module.css';
import PrivateRepoWarning from './PrivateRepoWarning';

interface Props {
  name: string;
  version?: string;
  repository: Repository;
  contentUrl?: string;
  label?: string;
}

const HelmInstall = (props: Props) => {
  const getInstallationVersionInfo = (installCmd: string) => {
    const compoundOCICommand = (contentUrl: string): string => {
      const index = contentUrl.lastIndexOf(':');
      return `helm pull ${contentUrl.substring(0, index)} --version ${contentUrl.substring(index + 1)}`;
    };

    return (
      <>
        <CommandBlock
          command={`helm repo add ${props.repository.name} ${props.repository.url}`}
          title="Add repository"
        />

        {props.repository.private && <PrivateRepoWarning />}

        <CommandBlock command={installCmd} title="Install chart" />

        <div className={`fst-italic text-muted ${styles.legend}`}>
          <span className="fw-bold">my-{props.name}</span> corresponds to the release name, feel free to change it to
          suit your needs. You can also add additional flags to the <span className="fw-bold">helm install</span>{' '}
          command if you need to.
        </div>

        {props.contentUrl && (
          <div className="d-none d-lg-block mt-2">
            {props.contentUrl.startsWith(OCI_PREFIX) ? (
              <div className="mt-4">
                <CommandBlock
                  command={compoundOCICommand(props.contentUrl)}
                  title="You can also download this package's content using this command"
                />
              </div>
            ) : (
              <small className="text-muted">
                You can also download this package's content using{' '}
                <ExternalLink
                  href={props.contentUrl}
                  className="text-secondary fw-bold"
                  target="_self"
                  label="Download package link"
                >
                  this link
                </ExternalLink>
                .
              </small>
            )}
          </div>
        )}

        <div className="mt-2">
          <ExternalLink
            href="https://helm.sh/docs/intro/quickstart/"
            className="btn btn-link ps-0"
            label="Download Helm"
          >
            Need Helm?
          </ExternalLink>
        </div>
      </>
    );
  };

  return (
    <>
      {(() => {
        switch (props.label) {
          case 'v3':
            return (
              <>
                {getInstallationVersionInfo(
                  `helm install my-${props.name} ${props.repository.name}/${props.name} --version ${props.version}`
                )}
              </>
            );
          case 'v2':
            return (
              <>
                {getInstallationVersionInfo(
                  `helm install --name my-${props.name} ${props.repository.name}/${props.name} --version ${props.version}`
                )}
              </>
            );
        }
      })()}
    </>
  );
};

export default HelmInstall;
