import { render, screen } from '@testing-library/react';

import Flavors from './Flavors';

const defaultProps = {
  flavors: 'in-cluster,web,docker-desktop',
  title: 'Headlamp Flavors',
};

describe('Flavors', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<Flavors {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<Flavors {...defaultProps} />);

      expect(screen.getByText('Headlamp Flavors')).toBeInTheDocument();
      const flavors = screen.getAllByTestId('flavor');
      expect(flavors).toHaveLength(3);
    });

    it('renders only uniq flavors', () => {
      render(<Flavors flavors={`${defaultProps.flavors} web`} title="Headlamp Flavors" />);

      const flavors = screen.getAllByTestId('flavor');
      expect(flavors).toHaveLength(3);
    });

    it('does not render component if platforms is undefined', () => {
      const { container } = render(<Flavors title="Headlamp Flavors" />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});
