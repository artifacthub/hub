import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import SearchTypeaheadRepository from './SearchTypeaheadRepository';

const onSelectMock = jest.fn();

const mockRepositories = [
  {
    repositoryId: 'f0cebfe4-c4b2-4310-a6f8-e34525177ff6',
    name: 'security-hub',
    url: 'https://github.com/falcosecurity/cloud-native-security-hub/resources/falco',
    kind: 1,
    lastTrackingTs: 1598614633,
    userAlias: 'demo',
  },
  {
    repositoryId: '6a7563d6-2145-4039-9bdc-2730928db115',
    name: 'community-operators',
    url: 'https://github.com/operator-framework/community-operators/upstream-community-operators',
    kind: 3,
    lastTrackingTs: 1598614633,
    lastTrackingErrors:
      'error decoding package chaosblade-operator logo image: illegal base64 data at input byte 9330\nerror decoding package planetscale logo image: illegal base64 data at input byte 76\nerror registering package hive-operator version 1.0.1: invalid input: maintainer email not provided\nerror validating csv (banzaicloud-kafka-operator.0.3.1.clusterserviceversion.yaml): Error: Value banzaicloud.banzaicloud.io/v1alpha1, Kind=KafkaCluster: example must have a provided API\nerror validating csv (cockroachdb.v3.0.7.clusterserviceversion.yaml): Error: Value error converting YAML to JSON: yaml: found unknown escape character: error decoding example CustomResource\nerror validating csv (elastic-cloud-eck.v0.9.0.clusterserviceversion.yaml): Error: Value error converting YAML to JSON: yaml: line 3: found unknown escape character: error decoding example CustomResource\nerror validating csv (elastic-cloud-eck.v1.0.0-beta1.clusterserviceversion.yaml): Error: Value error converting YAML to JSON: yaml: line 3: found unknown escape character: error decoding example CustomResource\nerror validating csv (elastic-cloud-eck.v1.0.0.clusterserviceversion.yaml): Error: Value error converting YAML to JSON: yaml: line 3: found unknown escape character: error decoding example CustomResource\nerror validating csv (elastic-cloud-eck.v1.0.1.clusterserviceversion.yaml): Error: Value error converting YAML to JSON: yaml: line 3: found unknown escape character: error decoding example CustomResource\nerror validating csv (halkyon.v0.1.2.clusterserviceversion.yaml): Error: Value /v1, Kind=List: example must have a provided API\nerror validating csv (minio-operator.v1.0.3.clusterserviceversion.yaml): Error: Value /v1, Kind=Secret: example must have a provided API\nerror validating csv (open-liberty-0.0.1.clusterserviceversion.yaml): Error: Value : (open-liberty-0.0.1) metadata.name "open-liberty-0.0.1" contains an invalid semver "0.1"\nerror validating csv (percona-xtradb-cluster-operator.v1.4.0.clusterserviceversion.yaml): Error: Value /, Kind=PerconaXtraDBClusterRestore: example must have a provided API\nerror validating csv (rook-edgefs.v1.0.1.clusterserviceversion.yaml): Error: Value edgefs.rook.io/v1, Kind=ISCSI: example must have a provided API\nerror validating csv (rook-edgefs.v1.0.1.clusterserviceversion.yaml): Error: Value edgefs.rook.io/v1, Kind=ISGW: example must have a provided API\nerror validating csv (rook-edgefs.v1.0.1.clusterserviceversion.yaml): Error: Value edgefs.rook.io/v1, Kind=NFS: example must have a provided API\nerror validating csv (rook-edgefs.v1.0.1.clusterserviceversion.yaml): Error: Value edgefs.rook.io/v1, Kind=S3: example must have a provided API\nerror validating csv (rook-edgefs.v1.0.1.clusterserviceversion.yaml): Error: Value edgefs.rook.io/v1, Kind=S3X: example must have a provided API\nerror validating csv (rook-edgefs.v1.0.1.clusterserviceversion.yaml): Error: Value edgefs.rook.io/v1, Kind=SWIFT: example must have a provided API\nerror validating csv (strimzi-cluster-operator.v0.11.0.clusterserviceversion.yaml): Error: Value kafka.strimzi.io/v1alpha1, Kind=Kafka: example must have a provided API\nerror validating csv (strimzi-cluster-operator.v0.11.0.clusterserviceversion.yaml): Error: Value kafka.strimzi.io/v1alpha1, Kind=KafkaConnect: example must have a provided API\nerror validating csv (strimzi-cluster-operator.v0.11.0.clusterserviceversion.yaml): Error: Value kafka.strimzi.io/v1alpha1, Kind=KafkaConnectS2I: example must have a provided API\nerror validating csv (strimzi-cluster-operator.v0.11.0.clusterserviceversion.yaml): Error: Value kafka.strimzi.io/v1alpha1, Kind=KafkaMirrorMaker: example must have a provided API\nerror validating csv (strimzi-cluster-operator.v0.11.0.clusterserviceversion.yaml): Error: Value kafka.strimzi.io/v1alpha1, Kind=KafkaTopic: example must have a provided API\nerror validating csv (strimzi-cluster-operator.v0.11.0.clusterserviceversion.yaml): Error: Value kafka.strimzi.io/v1alpha1, Kind=KafkaUser: example must have a provided API\nerror validating csv (strimzi-cluster-operator.v0.11.1.clusterserviceversion.yaml): Error: Value kafka.strimzi.io/v1alpha1, Kind=Kafka: example must have a provided API\nerror validating csv (strimzi-cluster-operator.v0.11.1.clusterserviceversion.yaml): Error: Value kafka.strimzi.io/v1alpha1, Kind=KafkaConnect: example must have a provided API\nerror validating csv (strimzi-cluster-operator.v0.11.1.clusterserviceversion.yaml): Error: Value kafka.strimzi.io/v1alpha1, Kind=KafkaConnectS2I: example must have a provided API\nerror validating csv (strimzi-cluster-operator.v0.11.1.clusterserviceversion.yaml): Error: Value kafka.strimzi.io/v1alpha1, Kind=KafkaMirrorMaker: example must have a provided API\nerror validating csv (strimzi-cluster-operator.v0.11.1.clusterserviceversion.yaml): Error: Value kafka.strimzi.io/v1alpha1, Kind=KafkaTopic: example must have a provided API\nerror validating csv (strimzi-cluster-operator.v0.11.1.clusterserviceversion.yaml): Error: Value kafka.strimzi.io/v1alpha1, Kind=KafkaUser: example must have a provided API\nerror validating csv (traefikee-operator.v0.2.0.clusterserviceversion.yaml): Error: Value /v1, Kind=Secret: example must have a provided API\nerror validating csv (traefikee-operator.v0.3.0.clusterserviceversion.yaml): Error: Value /v1, Kind=Secret: example must have a provided API',
    userAlias: 'demo',
  },
  {
    repositoryId: 'a032a436-3568-4970-804a-2780f5e9d231',
    name: 'artifact-hub',
    displayName: 'Artifact Hub',
    url: 'https://artifacthub.github.io/hub/chart/',
    lastTrackingTs: 1598967025,
    kind: 0,
  },
];

const defaultProps = {
  repositories: mockRepositories,
  disabledList: ['6a7563d6-2145-4039-9bdc-2730928db115'],
  onSelect: onSelectMock,
  isLoading: false,
};

describe('SearchTypeaheadRepository', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<SearchTypeaheadRepository {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders proper content with selectedValues', () => {
    const { getByTestId } = render(<SearchTypeaheadRepository {...defaultProps} />);

    expect(getByTestId('searchTypeaheadRepositoryInput')).toBeInTheDocument();
  });

  it('opens dropdown', () => {
    const { getByTestId, getAllByTestId } = render(<SearchTypeaheadRepository {...defaultProps} />);

    const input = getByTestId('searchTypeaheadRepositoryInput');
    fireEvent.focus(input);

    expect(getByTestId('searchTypeaheadRepositoryDropdown')).toBeInTheDocument();

    const repos = getAllByTestId('repoItem');
    expect(repos).toHaveLength(3);
    expect(repos[0]).toHaveClass('clickableCell');
    expect(repos[1]).toHaveClass('disabledCell');
    expect(repos[2]).toHaveClass('clickableCell');
  });

  it('selects option', () => {
    const { getByTestId, getAllByTestId } = render(<SearchTypeaheadRepository {...defaultProps} />);

    const input = getByTestId('searchTypeaheadRepositoryInput');
    fireEvent.focus(input);

    const btns = getAllByTestId('repoItem');
    fireEvent.click(btns[0]);

    expect(onSelectMock).toHaveBeenCalledTimes(1);
    expect(onSelectMock).toHaveBeenCalledWith(mockRepositories[0]);
  });

  it('filters options on input change', () => {
    const { getByTestId, getAllByTestId, getAllByText } = render(<SearchTypeaheadRepository {...defaultProps} />);

    const input = getByTestId('searchTypeaheadRepositoryInput');
    fireEvent.change(input, { target: { value: 'hu' } });

    expect(getAllByTestId('repoItem')).toHaveLength(2);
    expect(getAllByTestId('repoItem')[0]).toHaveTextContent('artifact-hub');
    expect(getAllByTestId('repoItem')[1]).toHaveTextContent('security-hubdemo');
    expect(getAllByText('hu')).toHaveLength(2);
    expect(getAllByText('hu')[0]).toHaveClass('hightlighted');
  });

  it('filters options on input change by name and url', () => {
    const { getByTestId, getAllByTestId } = render(<SearchTypeaheadRepository {...defaultProps} searchInUrl />);

    const input = getByTestId('searchTypeaheadRepositoryInput');
    fireEvent.change(input, { target: { value: 'hu' } });

    expect(getAllByTestId('repoItem')).toHaveLength(3);
    expect(getAllByTestId('repoItem')[0]).toHaveTextContent('artifact-hub');
    expect(getAllByTestId('repoItem')[1]).toHaveTextContent(
      'community-operatorshttps://github.com/operator-framework/community-operators/upstream-community-operatorsdemo'
    );
    expect(getAllByTestId('repoItem')[2]).toHaveTextContent(
      'security-hubhttps://github.com/falcosecurity/cloud-native-security-hub/resources/falcodemo'
    );
  });

  it('renders placeholder when any results', () => {
    const { getByTestId, queryAllByTestId, getByText } = render(<SearchTypeaheadRepository {...defaultProps} />);

    const input = getByTestId('searchTypeaheadRepositoryInput');
    fireEvent.change(input, { target: { value: 'test' } });

    expect(queryAllByTestId('repoItem')).toHaveLength(0);
    expect(getByText('Sorry, no matches found')).toBeInTheDocument();
  });

  it('renders correct placeholder when any repositories', () => {
    const props = {
      repositories: [],
      disabledList: [],
      onSelect: onSelectMock,
      isLoading: false,
      placeholder: "There aren't any repositories you can manage at the moment.",
    };
    const { getByPlaceholderText } = render(<SearchTypeaheadRepository {...props} />);

    const input = getByPlaceholderText(`There aren't any repositories you can manage at the moment.`);
    expect(input).toBeInTheDocument();
    expect(input).toBeDisabled();
  });

  describe('when minCharacters is defined', () => {
    it('opens dropdown', () => {
      const { getByTestId, getAllByTestId } = render(<SearchTypeaheadRepository minCharacters={3} {...defaultProps} />);

      const input = getByTestId('searchTypeaheadRepositoryInput');
      fireEvent.change(input, { target: { value: 'git' } });

      waitFor(() => {
        expect(getByTestId('searchTypeaheadRepositoryDropdown')).toHaveClass('show');

        const repos = getAllByTestId('repoItem');
        expect(repos).toHaveLength(3);
        expect(repos[0]).toHaveClass('clickableCell');
        expect(repos[1]).toHaveClass('disabledCell');
        expect(repos[2]).toHaveClass('clickableCell');
      });
    });
    it('selects option', () => {
      const { getByTestId, getAllByTestId } = render(<SearchTypeaheadRepository minCharacters={3} {...defaultProps} />);

      const input = getByTestId('searchTypeaheadRepositoryInput');
      fireEvent.change(input, { target: { value: 'git' } });

      waitFor(() => {
        expect(getByTestId('searchTypeaheadRepositoryDropdown')).toHaveClass('show');

        const btns = getAllByTestId('repoItem');
        fireEvent.click(btns[0]);

        expect(onSelectMock).toHaveBeenCalledTimes(1);
        expect(onSelectMock).toHaveBeenCalledWith(mockRepositories[0]);
      });
    });

    it('filters options on input change with more than 3 characters', () => {
      const { getByTestId, getAllByTestId, getAllByText } = render(
        <SearchTypeaheadRepository minCharacters={3} {...defaultProps} />
      );

      const input = getByTestId('searchTypeaheadRepositoryInput');
      fireEvent.change(input, { target: { value: 'hub' } });

      waitFor(() => {
        expect(getAllByTestId('repoItem')).toHaveLength(2);
        expect(getAllByTestId('repoItem')[0]).toHaveTextContent('artifact-hub');
        expect(getAllByTestId('repoItem')[1]).toHaveTextContent('security-hubdemo');
        expect(getAllByText('hub')).toHaveLength(2);
        expect(getAllByText('hub')[0]).toHaveClass('hightlighted');
      });
    });

    it('filters options on input change by name and url', () => {
      const { getByTestId, getAllByTestId } = render(
        <SearchTypeaheadRepository minCharacters={3} {...defaultProps} searchInUrl />
      );

      const input = getByTestId('searchTypeaheadRepositoryInput');
      fireEvent.change(input, { target: { value: 'hub' } });

      waitFor(() => {
        expect(getAllByTestId('repoItem')).toHaveLength(3);
        expect(getAllByTestId('repoItem')[0]).toHaveTextContent('artifact-hub');
        expect(getAllByTestId('repoItem')[1]).toHaveTextContent(
          'community-operatorshttps://github.com/operator-framework/community-operators/upstream-community-operatorsdemo'
        );
        expect(getAllByTestId('repoItem')[2]).toHaveTextContent(
          'security-hubhttps://github.com/falcosecurity/cloud-native-security-hub/resources/falcodemo'
        );
      });
    });

    it('renders placeholder when any results', () => {
      const { getByTestId, queryAllByTestId, getByText } = render(
        <SearchTypeaheadRepository minCharacters={3} {...defaultProps} />
      );

      const input = getByTestId('searchTypeaheadRepositoryInput');
      fireEvent.change(input, { target: { value: 'test' } });

      waitFor(() => {
        expect(queryAllByTestId('repoItem')).toHaveLength(0);
        expect(getByText('Sorry, no matches found')).toBeInTheDocument();
      });
    });
  });
});
