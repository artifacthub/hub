import { render, screen } from '@testing-library/react';

import ContainerRegistry from './ContainerRegistry';

describe('ContainerRegistry', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<ContainerRegistry url="oci://gcr.io/myproject/myimagen" />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<ContainerRegistry url="oci://gcr.io/myproject/myimagen" />);
      expect(screen.getByText('Google CR')).toBeInTheDocument();
    });

    it('renders component', () => {
      render(<ContainerRegistry url="oci://localhost:5000/artifacthub/ah" />);
      expect(screen.getByText('localhost:5000')).toBeInTheDocument();
    });
  });
});
