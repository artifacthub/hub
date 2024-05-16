import { OCI_PREFIX } from '../../utils/data';
import isValidURL from '../../utils/isValidURL';
import ButtonCopyToClipboard from '../common/ButtonCopyToClipboard';
import styles from './ContainerRegistry.module.css';

interface Props {
  url: string;
}

enum RegistryType {
  Amazon = 'amazon',
  Azure = 'azure',
  Docker = 'docker',
  GitHub = 'github',
  Google = 'google',
  Quay = 'quay',
  BundleBar = 'bundlebar',
  GitLab = 'gitlab',
  Unknown = 'unknown',
}

interface RegistryInfo {
  name: string;
  icon: string;
  url?: string;
}

interface RegistryList {
  [key: string]: RegistryInfo;
}

const REGISTRIES: RegistryList = {
  [RegistryType.Amazon]: {
    name: 'Amazon ECR',
    icon: '/static/media/registries/amazon.svg',
  },
  [RegistryType.Azure]: {
    name: 'Azure CR',
    icon: '/static/media/registries/azure.svg',
  },
  [RegistryType.Docker]: {
    name: 'Docker Hub',
    icon: '/static/media/registries/docker.svg',
  },
  [RegistryType.GitHub]: {
    name: 'GitHub Packages CR',
    icon: '/static/media/registries/github.svg',
  },
  [RegistryType.Google]: {
    name: 'Google CR',
    icon: '/static/media/registries/google.svg',
  },
  [RegistryType.Quay]: {
    name: 'Quay',
    icon: '/static/media/registries/quay.svg',
  },
  [RegistryType.BundleBar]: {
    name: 'Bundle Bar',
    icon: '/static/media/registries/bundlebar.svg',
  },
  [RegistryType.GitLab]: {
    name: 'GitLab Registry',
    icon: '/static/media/registries/gitlab.svg',
  },
  [RegistryType.Unknown]: {
    name: '',
    icon: '/static/media/registries/unknown.svg',
  },
};

const getRegistryData = (url: string): RegistryInfo => {
  let registryType: RegistryType = RegistryType.Unknown;

  // We use http as protocol to be sure that we get correct hostname
  const urlToCheck = url.startsWith(OCI_PREFIX) ? url.replace(OCI_PREFIX, 'https://') : `https://${url}`;

  if (isValidURL(urlToCheck)) {
    const registryUrl = new URL(urlToCheck);
    const hostname = registryUrl.hostname;
    if (hostname === '') {
      return {
        ...REGISTRIES[registryType],
        name: url,
      };
    } else {
      switch (true) {
        case /docker\.io/.test(hostname):
          registryType = RegistryType.Docker;
          break;
        case /ecr\.aws/.test(hostname):
          registryType = RegistryType.Amazon;
          break;
        case /azurecr\.io/.test(hostname):
        case /microsoft\.com/.test(hostname):
          registryType = RegistryType.Azure;
          break;
        case /ghcr\.io/.test(hostname):
          registryType = RegistryType.GitHub;
          break;
        case /gcr\.io/.test(hostname):
          registryType = RegistryType.Google;
          break;
        case /quay\.io/.test(hostname):
          registryType = RegistryType.Quay;
          break;
        case /bundle\.bar/.test(hostname):
          registryType = RegistryType.BundleBar;
          break;
        case /gitlab\.com/.test(hostname):
          registryType = RegistryType.GitLab;
          break;
      }

      const registry: RegistryInfo = {
        ...REGISTRIES[registryType],
        url: url.replace(OCI_PREFIX, ''),
      };

      if (registryType === RegistryType.Unknown) {
        registry.name = `${hostname}${registryUrl.port ? `:${registryUrl.port}` : ''}`;
      }

      return registry;
    }
  } else {
    return {
      ...REGISTRIES[registryType],
      name: url,
    };
  }
};

const ContainerRegistry = (props: Props) => {
  const { name, icon, url } = getRegistryData(props.url);

  return (
    <div className="d-flex flex-row align-items-center mw-100">
      <img src={icon} alt="Registry icon" className={`me-2 ${styles.icon} registryIcon`} />
      <div className={`text-truncate text-break ${styles.url}`}>{name}</div>
      {url && (
        <ButtonCopyToClipboard
          text={url}
          className={`btn-link text-dark border-0 position-relative ${styles.copyBtn}`}
          label="Copy registry url to clipboard"
        />
      )}
    </div>
  );
};

export default ContainerRegistry;
