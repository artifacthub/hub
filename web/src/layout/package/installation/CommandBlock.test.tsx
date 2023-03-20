import { render, screen } from '@testing-library/react';

import CommandBlock from './CommandBlock';

describe('CommandBlock', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const { asFragment } = render(<CommandBlock command="command" />);
    expect(await screen.findByText('command')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      render(<CommandBlock command="command" />);
      expect(await screen.findByText('command')).toBeInTheDocument();
    });

    it('renders component with title', async () => {
      render(<CommandBlock title="this is a title" command="command" />);
      expect(await screen.findByText('this is a title')).toBeInTheDocument();
    });

    it('renders component with filename', () => {
      render(<CommandBlock filename="filename" command="command" />);
      expect(screen.getByText('File:')).toBeInTheDocument();
      expect(screen.getByText('filename')).toBeInTheDocument();
    });
  });
});
