import { render } from '@testing-library/react';
import React from 'react';

import OLMInstall from './OLMInstall';

const defaultProps = {
  name: 'packageName',
  activeChannel: 'stable',
};

describe('OLMInstall', () => {
  it('creates snapshot', () => {
    const result = render(<OLMInstall {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText } = render(<OLMInstall {...defaultProps} />);

      expect(
        getByText(
          'Install Operator Lifecycle Manager (OLM), a tool to help manage the Operators running on your cluster.'
        )
      ).toBeInTheDocument();
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
    });

    it('renders global operator', () => {
      const { getByText } = render(<OLMInstall {...defaultProps} isGlobalOperator />);
      expect(getByText('kubectl get csv -n operators')).toBeInTheDocument();
    });
  });
});
