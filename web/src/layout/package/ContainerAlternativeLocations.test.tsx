import { render, screen } from '@testing-library/react';

import ContainerAlternativeLocations from './ContainerAlternativeLocations';

const defaultProps = {
  locations: [
    'oci://ghcr.io/myproject/myimagen',
    'oci://gcr.io/myproject/myimagen',
    'oci://docker.io/myproject/myimagen',
    'oci://public.ecr.aws/myproject/myimagen',
    'oci://quay.io/myproject/myimagen',
    'oci://mcr.microsoft.com/myproject/myimagen',
    'oci://bundle.bar/myproject/myimagen',
    'oci://registry.gitlab.com/myproject/myimagen',
    'oci://localhost:5000/myproject/myimagen',
  ],
};

describe('ContainerAlternativeLocations', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<ContainerAlternativeLocations {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<ContainerAlternativeLocations {...defaultProps} />);
      expect(screen.getByText('GitHub Packages CR')).toBeInTheDocument();
      expect(screen.getByText('Amazon ECR')).toBeInTheDocument();
      expect(screen.getByText('Azure CR')).toBeInTheDocument();
      expect(screen.getByText('Docker Hub')).toBeInTheDocument();
      expect(screen.getByText('Google CR')).toBeInTheDocument();
      expect(screen.getByText('Quay')).toBeInTheDocument();
      expect(screen.getByText('Bundle Bar')).toBeInTheDocument();
      expect(screen.getByText('GitLab Registry')).toBeInTheDocument();
      expect(screen.getByText('localhost:5000')).toBeInTheDocument();

      expect(screen.getAllByRole('button')).toHaveLength(9);
    });
  });

  describe('Does not render', () => {
    it('when locations is undefined', () => {
      const { container } = render(<ContainerAlternativeLocations />);
      expect(container).toBeEmptyDOMElement();
    });

    it('when locations is empty', () => {
      const { container } = render(<ContainerAlternativeLocations locations={[]} />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});
