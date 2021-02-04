import { render } from '@testing-library/react';
import React from 'react';

import CommandBlock from './CommandBlock';

describe('CommandBlock', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<CommandBlock command="command" />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText } = render(<CommandBlock command="command" />);

      expect(getByText('command')).toBeInTheDocument();
    });

    it('renders component with title', () => {
      const { getByText } = render(<CommandBlock title="this is a title" command="command" />);

      expect(getByText('this is a title')).toBeInTheDocument();
    });

    it('renders component with filename', () => {
      const { getByText } = render(<CommandBlock filename="filename" command="command" />);

      expect(getByText('File:')).toBeInTheDocument();
      expect(getByText('filename')).toBeInTheDocument();
    });
  });
});
