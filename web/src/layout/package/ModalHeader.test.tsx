import { render } from '@testing-library/react';
import React from 'react';

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
    const result = render(<ModalHeader {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText, getByAltText } = render(<ModalHeader {...defaultProps} />);
      expect(getByText('Pretty name')).toBeInTheDocument();
      expect(getByAltText('Pretty name')).toBeInTheDocument();
    });

    it('renders component without displayName', () => {
      const { getByText, getByAltText } = render(<ModalHeader {...defaultProps} displayName={null} />);

      expect(getByText('test')).toBeInTheDocument();
      expect(getByAltText('test')).toBeInTheDocument();
    });
  });
});
