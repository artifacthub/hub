import { render, screen } from '@testing-library/react';

import ModalHeader from './ModalHeader';

const defaultProps = {
  name: 'test',
  displayName: 'Pretty name',
  logoImageId: 'imageId',
  repoKind: 0,
};

describe('ModalHeader', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<ModalHeader {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<ModalHeader {...defaultProps} />);
      expect(screen.getByText('Pretty name')).toBeInTheDocument();
      expect(screen.getByAltText('Pretty name')).toBeInTheDocument();
    });

    it('renders component without displayName', () => {
      render(<ModalHeader {...defaultProps} displayName={null} />);
      expect(screen.getByText('test')).toBeInTheDocument();
      expect(screen.getByAltText('test')).toBeInTheDocument();
    });
  });
});
