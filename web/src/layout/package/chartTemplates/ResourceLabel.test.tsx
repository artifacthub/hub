import { render, screen } from '@testing-library/react';

import ResourceLabel from './ResourceLabel';

const hasClassContaining = (element: Element, token: string): boolean =>
  Array.from(element.classList).some((cls) => cls.includes(token));

describe('ResourceLabel', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<ResourceLabel text="Scanner" />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<ResourceLabel text="Scanner" />);

      expect(screen.getByText('Scanner')).toBeInTheDocument();
      expect(hasClassContaining(screen.getByText('Scanner'), 'label')).toBe(true);
    });
  });
});
