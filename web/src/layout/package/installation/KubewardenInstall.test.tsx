import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import KubewardenInstall from './KubewardenInstall';

const defaultProps = {
  name: 'kubewarden-repo',
  images: [{ name: 'policy', image: 'ghcr.io/kubewarden/policies/...:vx.x.x' }],
};

describe('KubewardenInstall', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const { asFragment } = render(<KubewardenInstall {...defaultProps} />);
    expect(await screen.findByText('kwctl pull ghcr.io/kubewarden/policies/...:vx.x.x')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      render(<KubewardenInstall {...defaultProps} />);

      expect(await screen.findByText('kwctl pull ghcr.io/kubewarden/policies/...:vx.x.x')).toBeInTheDocument();
      expect(screen.getByText(/The policy can be obtained using/)).toBeInTheDocument();

      const link = screen.getByText('kwctl');
      expect(link).toBeInTheDocument();
      expect(link).toHaveProperty('href', 'https://github.com/kubewarden/kwctl/');
    });

    it('renders component with 2 images', async () => {
      render(
        <KubewardenInstall
          {...defaultProps}
          images={[
            { name: 'policy', image: 'ghcr.io/kubewarden/policies/...:vx.x.x' },
            { name: 'policy-alternative-location', image: 'ghcr.io/kubewarden/policies/...2:vx.x.x' },
          ]}
        />
      );

      expect(screen.getByText('Source')).toBeInTheDocument();
      expect(await screen.findByText('kwctl pull ghcr.io/kubewarden/policies/...:vx.x.x')).toBeInTheDocument();

      const select = screen.getByRole('combobox', { name: 'source-select' });
      expect(select).toBeInTheDocument();
      await userEvent.selectOptions(select, 'policy-alternative-location');

      expect(await screen.findByText('kwctl pull ghcr.io/kubewarden/policies/...2:vx.x.x')).toBeInTheDocument();

      const link = screen.getByText('kwctl');
      expect(link).toBeInTheDocument();
      expect(link).toHaveProperty('href', 'https://github.com/kubewarden/kwctl/');
    });

    it('renders private repo', () => {
      render(<KubewardenInstall {...defaultProps} isPrivate />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Important: This repository is private and requires some credentials.');
    });
  });
});
