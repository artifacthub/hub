import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { mocked } from 'jest-mock';

import API from '../../../api';
import CompareView from './CompareView';

jest.mock('../../../api');

const defaultProps = {
  packageId: 'id',
  values:
    "## @section Global parameters\n## Global Docker image parameters\n## Please, note that this will override the image parameters, including dependencies, configured to use the global value\n## Current available global Docker image parameters: imageRegistry, imagePullSecrets and storageClass\n##\n\n## @param global.imageRegistry Global Docker image registry\n## @param global.imagePullSecrets Global Docker registry secret names as an array\n## @param global.storageClass Global StorageClass for Persistent Volume(s)\n##\nglobal:\n  imageRegistry: \"\"\n  ## E.g.\n  ## imagePullSecrets:\n  ##   - myRegistryKeySecretName\n  ##\n  imagePullSecrets: []\n  storageClass: \"\"\n\n## @section HAProxy chart parameters\n## Parameters for the bitnami/haproxy chart deployed by this chart\n## For a full list, see: https://github.com/bitnami/charts/tree/master/bitnami/haproxy\n## Note that parameters from the bitnami/haproxy chart should be prefixed with 'haproxy.'\n##\n\n## @param haproxy.image.registry HAProxy image registry\n## @param haproxy.image.repository HAProxy image repository\n## @param haproxy.image.tag HAProxy image tag (immutable tags are recommended)\n## @param haproxy.image.digest HAProxy image digest in the way sha256:aa.... Please note this parameter, if set, will override the tag\n## @param haproxy.image.pullPolicy HAProxy image pull policy\n## @param haproxy.image.pullSecrets HAProxy image pull secrets\n##\nhaproxy:\n  image:\n    registry: docker.io\n    repository: bitnami/haproxy-intel\n    tag: 2.6.6-debian-11-r0\n    digest: \"\"\n    ## Specify a imagePullPolicy\n    ## Defaults to 'Always' if image tag is 'latest', else set to 'IfNotPresent'\n    ## ref: https://kubernetes.io/docs/user-guide/images/#pre-pulling-images\n    ##\n    pullPolicy: IfNotPresent\n    ## Optionally specify an array of imagePullSecrets.\n    ## Secrets must be manually created in the namespace.\n    ## ref: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/\n    ## e.g:\n    ## pullSecrets:\n    ##   - myRegistryKeySecretName\n    ##\n    pullSecrets: []\n",
  currentVersion: '0.0.1',
  comparedVersion: '0.0.2',
};

const diff =
  "## @section Global parameters\n## Global Docker image parameters\n## Please, note that this will override the image parameters, including dependencies, configured to use the global value\n## Current available global Docker image parameters: imageRegistry, imagePullSecrets and storageClass\n##\n\n## @param global.imageRegistry Global Docker image registry\n## @param global.imagePullSecrets Global Docker registry secret names as an array\n## @param global.storageClass Global StorageClass for Persistent Volume(s)\n##\nglobal:\n  imageRegistry: \"\"\n  ## E.g.\n  ## imagePullSecrets:\n  ##   - myRegistryKeySecretName\n  ##\n  imagePullSecrets: []\n  storageClass: \"\"\n\n## @section HAProxy chart parameters\n## Parameters for the bitnami/haproxy chart deployed by this chart\n## For a full list, see: https://github.com/bitnami/charts/tree/master/bitnami/haproxy\n## Note that parameters from the bitnami/haproxy chart should be prefixed with 'haproxy.'\n##\n\n## @param haproxy.image.registry HAProxy image registry\n## @param haproxy.image.repository HAProxy image repository\n## @param haproxy.image.tag HAProxy image tag (immutable tags are recommended)\n## @param haproxy.image.pullPolicy HAProxy image pull policy\n## @param haproxy.image.pullSecrets HAProxy image pull secrets\n##\nhaproxy:\n  image:\n    registry: docker.io\n    repository: bitnami/haproxy-intel\n    tag: 2.5.7-debian-10-r4\n    ## Specify a imagePullPolicy\n    ## Defaults to 'Always' if image tag is 'latest', else set to 'IfNotPresent'\n    ## ref: https://kubernetes.io/docs/user-guide/images/#pre-pulling-images\n    ##\n    pullPolicy: IfNotPresent\n    ## Optionally specify an array of imagePullSecrets.\n    ## Secrets must be manually created in the namespace.\n    ## ref: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/\n    ## e.g:\n    ## pullSecrets:\n    ##   - myRegistryKeySecretName\n    ##\n    pullSecrets: []\n";

describe('CompareView', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    mocked(API).getChartValues.mockResolvedValue(diff);
    const { asFragment } = render(<CompareView {...defaultProps} />);

    await waitFor(() => {
      expect(API.getChartValues).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByTestId('diffTemplate')).toBeInTheDocument();

    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      mocked(API).getChartValues.mockResolvedValue(diff);
      render(<CompareView {...defaultProps} />);

      await waitFor(() => {
        expect(API.getChartValues).toHaveBeenCalledTimes(1);
        expect(API.getChartValues).toHaveBeenCalledWith('id', '0.0.2');
      });

      expect(await screen.findByTestId('diffTemplate')).toBeInTheDocument();

      expect(screen.getByRole('button', { name: 'Expand code' })).toBeInTheDocument();
    });

    it('renders alert when any difference between versions', async () => {
      mocked(API).getChartValues.mockResolvedValue(defaultProps.values);
      render(<CompareView {...defaultProps} />);

      await waitFor(() => {
        expect(API.getChartValues).toHaveBeenCalledTimes(1);
        expect(API.getChartValues).toHaveBeenCalledWith('id', '0.0.2');
      });

      await waitForElementToBeRemoved(() => screen.queryByRole('status'));
      expect(await screen.findByText(/No changes found when comparing version/)).toBeInTheDocument();
    });
  });
});
