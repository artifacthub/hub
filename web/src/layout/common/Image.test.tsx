import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import Image from './Image';

const defaultProps = {
  imageId: '123',
  alt: 'image',
  placeholderIcon: undefined,
};

describe('Image', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<Image {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders proper content', () => {
    const { getByAltText } = render(<Image {...defaultProps} />);
    const image = getByAltText(defaultProps.alt);
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', `http://localhost/image/${defaultProps.imageId}`);
    expect(image).toHaveProperty(
      'srcset',
      `/image/${defaultProps.imageId}@1x 1x, /image/${defaultProps.imageId}@2x 2x, /image/${defaultProps.imageId}@3x 3x, /image/${defaultProps.imageId}@4x 4x`
    );
  });

  it('renders placeholder image when imageId is null', () => {
    const { getByAltText } = render(<Image alt={defaultProps.alt} imageId={null} />);
    const image = getByAltText(defaultProps.alt);
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'http://localhost/static/media/placeholder_helm.png');
  });

  it('renders placeholder on error', () => {
    const { getByAltText } = render(<Image {...defaultProps} />);
    const image = getByAltText(defaultProps.alt);
    expect(image).toHaveProperty('src', `http://localhost/image/${defaultProps.imageId}`);

    fireEvent.error(image);

    waitFor(() => {
      expect(image).toHaveProperty('src', 'http://localhost/static/media/placeholder_helm.png');
    });
  });
});
