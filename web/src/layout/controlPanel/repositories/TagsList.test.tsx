import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import TagsList from './TagsList';

const setContainerTagsMock = jest.fn();
const setRepeatedTagNamesMock = jest.fn();

const defaultProps = {
  tags: [
    { name: 'tag1', mutable: false },
    { name: 'tag2', mutable: false },
    { name: 'tag3', mutable: true },
  ],
  setContainerTags: setContainerTagsMock,
  repeatedTagNames: false,
  setRepeatedTagNames: setRepeatedTagNamesMock,
};

describe('TagsList', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<TagsList {...defaultProps} />);

    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<TagsList {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Add tag' })).toBeInTheDocument();
      expect(screen.getAllByRole('textbox')).toHaveLength(3);
      const checks = screen.getAllByRole('switch');
      expect(checks).toHaveLength(3);
      expect(checks[0]).not.toBeChecked();
      expect(checks[1]).not.toBeChecked();
      expect(checks[2]).toBeChecked();
      expect(
        screen.getByText(/The tags you'd like to list on Artifact Hub must be explicitly added. You can add up to/)
      ).toBeInTheDocument();
    });

    it('updates tag name', async () => {
      render(<TagsList {...defaultProps} />);
      const inputs = screen.getAllByRole('textbox');
      await userEvent.type(inputs[0], 'a');

      act(() => {
        inputs[0].blur();
      });

      await waitFor(() => {
        expect(setContainerTagsMock).toHaveBeenCalledTimes(1);
        expect(setContainerTagsMock).toHaveBeenCalledWith([
          { mutable: false, name: 'tag1a' },
          { mutable: false, name: 'tag2' },
          { mutable: true, name: 'tag3' },
        ]);
      });
    });

    it('updates tag name when repeatedtagnames is true', async () => {
      render(
        <TagsList
          {...defaultProps}
          tags={[
            { name: 'tag1', mutable: false },
            { name: 'tag1', mutable: false },
          ]}
          repeatedTagNames
        />
      );
      const inputs = screen.getAllByRole('textbox');
      await userEvent.type(inputs[0], 'a');

      act(() => {
        inputs[0].blur();
      });

      await waitFor(() => {
        expect(setRepeatedTagNamesMock).toHaveBeenCalledTimes(1);
        expect(setRepeatedTagNamesMock).toHaveBeenCalledWith(false);
      });

      await waitFor(() => {
        expect(setContainerTagsMock).toHaveBeenCalledTimes(1);
        expect(setContainerTagsMock).toHaveBeenCalledWith([
          { mutable: false, name: 'tag1a' },
          { mutable: false, name: 'tag1' },
        ]);
      });
    });

    it('adds tag', async () => {
      render(<TagsList {...defaultProps} />);

      expect(screen.getAllByRole('textbox')).toHaveLength(3);

      const btn = screen.getByRole('button', { name: 'Add tag' });
      userEvent.click(btn);

      await waitFor(() => {
        expect(setContainerTagsMock).toHaveBeenCalledTimes(1);
      });
    });
  });
});
