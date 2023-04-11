import { render, screen } from '@testing-library/react';

import OLMInstall from './OLMInstall';

const defaultProps = {
  name: 'packageName',
  defaultChannel: 'stable',
  channels: [
    { name: 'stable', version: '1.0.0' },
    { name: 'alpha', version: '1.1.0' },
  ],
  isPrivate: false,
};

describe('OLMInstall', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const { asFragment } = render(<OLMInstall {...defaultProps} />);
    expect(await screen.findByText(`cat <<EOF | kubectl apply -f -`)).toBeInTheDocument();
    expect(await screen.findByText(`kubectl get csv -n my-packageName`)).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      render(<OLMInstall {...defaultProps} />);

      expect(screen.getByText('Install the operator by running the following command:')).toBeInTheDocument();
      expect(await screen.findByText(`cat <<EOF | kubectl apply -f -`)).toBeInTheDocument();
      expect(screen.getByText('After install, watch your operator come up using next command:')).toBeInTheDocument();
      expect(await screen.findByText(`kubectl get csv -n my-packageName`)).toBeInTheDocument();
      expect(screen.getByText(`kubectl get csv -n my-${defaultProps.name}`)).toBeInTheDocument();
      expect(
        screen.getByText(
          'To use it, checkout the custom resource definitions (CRDs) introduced by this operator to start using it.'
        )
      ).toBeInTheDocument();

      const olmLink = screen.getByText('Need OLM?');
      expect(olmLink).toBeInTheDocument();
      expect(olmLink).toHaveProperty(
        'href',
        'https://github.com/operator-framework/operator-lifecycle-manager/blob/master/doc/install/install.md'
      );
    });

    it('renders global operator', async () => {
      render(<OLMInstall {...defaultProps} isGlobalOperator />);
      expect(await screen.findByText('kubectl get csv -n operators')).toBeInTheDocument();
    });

    it('renders private repo', () => {
      render(<OLMInstall {...defaultProps} isPrivate />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Important: This repository is private and requires some credentials.');
    });
  });
});
