import { render } from '@testing-library/react';
import React from 'react';

import OLMInstall from './OLMInstall';

const defaultProps = {
  name: 'packageName',
  activeChannel: 'stable',
  isPrivate: false,
};

describe('OLMInstall', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<OLMInstall {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText } = render(<OLMInstall {...defaultProps} />);

      expect(getByText('Install the operator by running the following command:')).toBeInTheDocument();
      expect(
        getByText(
          `kubectl create -f https://operatorhub.io/install/${defaultProps.activeChannel}/${defaultProps.name}.yaml`
        )
      ).toBeInTheDocument();
      expect(getByText('After install, watch your operator come up using next command:')).toBeInTheDocument();
      expect(getByText(`kubectl get csv -n my-${defaultProps.name}`)).toBeInTheDocument();
      expect(
        getByText(
          'To use it, checkout the custom resource definitions (CRDs) introduced by this operator to start using it.'
        )
      ).toBeInTheDocument();

      const olmLink = getByText('Need OLM?');
      expect(olmLink).toBeInTheDocument();
      expect(olmLink).toHaveProperty(
        'href',
        'https://github.com/operator-framework/operator-lifecycle-manager/blob/master/doc/install/install.md'
      );
    });

    it('renders global operator', () => {
      const { getByText } = render(<OLMInstall {...defaultProps} isGlobalOperator />);
      expect(getByText('kubectl get csv -n operators')).toBeInTheDocument();
    });

    it('renders private repo', () => {
      const { getByRole } = render(<OLMInstall {...defaultProps} isPrivate />);

      const alert = getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Important: This repository is private and requires some credentials.');
    });
  });
});
