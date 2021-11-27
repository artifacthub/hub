import { fireEvent, render, screen } from '@testing-library/react';

import { RepositoryKind } from '../../types';
import Image from './Image';

const defaultProps = {
  imageId: '123',
  alt: 'image',
  placeholderIcon: undefined,
  kind: RepositoryKind.Helm,
};

describe('Image', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<Image {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders proper content', () => {
    render(<Image {...defaultProps} />);
    const image = screen.getByAltText(defaultProps.alt);
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', `http://localhost/image/${defaultProps.imageId}`);
    expect(image).toHaveProperty(
      'srcset',
      `/image/${defaultProps.imageId}@1x 1x, /image/${defaultProps.imageId}@2x 2x, /image/${defaultProps.imageId}@3x 3x, /image/${defaultProps.imageId}@4x 4x`
    );
  });

  it('renders placeholder image when imageId is not defined', () => {
    const props = {
      ...defaultProps,
      imageId: undefined,
    };
    render(<Image {...props} />);
    const image = screen.getByAltText(defaultProps.alt);
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'http://localhost/static/media/placeholder_pkg_helm.png');
  });

  it('renders placeholder on error', async () => {
    render(<Image {...defaultProps} />);
    const image = screen.getByAltText(defaultProps.alt);
    expect(image).toHaveProperty('src', `http://localhost/image/${defaultProps.imageId}`);

    fireEvent.error(image);

    const placeholder = await screen.findByTestId('placeholderImg');
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toHaveProperty('src', 'http://localhost/static/media/placeholder_pkg_helm.png');
  });

  it('renders default placeholder when kind is undefined', () => {
    const props = {
      ...defaultProps,
      imageId: undefined,
      kind: undefined,
    };
    render(<Image {...props} />);
    const image = screen.getByAltText(defaultProps.alt);
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'http://localhost/static/media/package_placeholder.svg');
  });
});
