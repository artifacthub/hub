import { OCI_PREFIX } from '../../utils/data';
import ButtonCopyToClipboard from '../common/ButtonCopyToClipboard';
import styles from './ContainerRegistry.module.css';

interface Props {
  url: string;
}

enum RegistryType {
  Amazon = 'amazon',
  Azure = 'azure',
  Docker = 'docker',
  Github = 'github',
  Google = 'google',
  Quay = 'quay',
  BundleBar = 'bundlebar',
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
  [RegistryType.Github]: {
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
  [RegistryType.Unknown]: {
    name: '',
    icon: '/static/media/registries/unknown.svg',
  },
};

const getRegistryData = (url: string): RegistryInfo => {
  let registryType: RegistryType = RegistryType.Unknown;

  if (url.includes('docker.io')) {
    registryType = RegistryType.Docker;
  } else if (url.includes('ecr.aws')) {
    registryType = RegistryType.Amazon;
  } else if (url.includes('azurecr.io') || url.includes('microsoft.com')) {
    registryType = RegistryType.Azure;
  } else if (url.includes('ghcr.io')) {
    registryType = RegistryType.Github;
  } else if (url.includes('gcr.io')) {
    registryType = RegistryType.Google;
  } else if (url.includes('quay.io')) {
    registryType = RegistryType.Quay;
  } else if (url.includes('bundle.bar')) {
    registryType = RegistryType.BundleBar;
  }

  let registry: RegistryInfo = {
    ...REGISTRIES[registryType],
    url: url.replace(OCI_PREFIX, ''),
  };

  if (registryType === RegistryType.Unknown) {
    const urlObj = new URL(url);
    registry.name = `${urlObj.hostname}${urlObj.port ? `:${urlObj.port}` : ''}`;
  }

  return registry;
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
