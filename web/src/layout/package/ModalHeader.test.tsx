import { render } from '@testing-library/react';
import React from 'react';

import ModalHeader from './ModalHeader';

const defaultProps = {
  name: 'test',
  displayName: 'Pretty name',
  logoImageId: 'imageId',
  repoKind: 0,
};

describe('Links', () => {
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

      expect(getByText(defaultProps.displayName!)).toBeInTheDocument();
      expect(getByAltText(defaultProps.displayName!)).toBeInTheDocument();
    });

    it('renders component without displayName', () => {
      const { getByText, getByAltText } = render(<ModalHeader {...defaultProps} displayName={undefined} />);

      expect(getByText(defaultProps.name)).toBeInTheDocument();
      expect(getByAltText(defaultProps.name)).toBeInTheDocument();
    });
  });
});
