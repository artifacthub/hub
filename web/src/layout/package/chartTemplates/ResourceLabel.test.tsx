import { render, screen } from '@testing-library/react';

import { hasClassContaining } from '../../../utils/testUtils';
import ResourceLabel from './ResourceLabel';

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
