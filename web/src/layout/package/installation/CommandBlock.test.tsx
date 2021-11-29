import { render, screen } from '@testing-library/react';

import CommandBlock from './CommandBlock';

describe('CommandBlock', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<CommandBlock command="command" />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<CommandBlock command="command" />);
      expect(screen.getByText('command')).toBeInTheDocument();
    });

    it('renders component with title', () => {
      render(<CommandBlock title="this is a title" command="command" />);
      expect(screen.getByText('this is a title')).toBeInTheDocument();
    });

    it('renders component with filename', () => {
      render(<CommandBlock filename="filename" command="command" />);
      expect(screen.getByText('File:')).toBeInTheDocument();
      expect(screen.getByText('filename')).toBeInTheDocument();
    });
  });
});
