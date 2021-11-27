import { render, screen } from '@testing-library/react';

import { RepositoryKind } from '../../types';
import TasksInPipeline from './TasksInPipeline';

const defaultProps = {
  kind: RepositoryKind.TektonPipeline,
  tasks: [
    { name: 'task1' },
    { name: 'task1a', runAfter: ['task1'] },
    { name: 'task2' },
    { name: 'task1-2a', runAfter: ['task1', 'task2'] },
  ],
};

describe('TasksInPipeline', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<TasksInPipeline {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders properly', () => {
      render(<TasksInPipeline {...defaultProps} />);

      expect(screen.getByText('Tasks')).toBeInTheDocument();
      expect(screen.getAllByText('task1')).toHaveLength(3);
      expect(screen.getByText('task1a')).toBeInTheDocument();
      expect(screen.getAllByText('task2')).toHaveLength(2);
      expect(screen.getByText('task1-2a')).toBeInTheDocument();
      expect(screen.getAllByText('Run After:')).toHaveLength(2);
    });

    it('does not render Run after when any task has a parent', () => {
      render(<TasksInPipeline {...defaultProps} tasks={[{ name: 'task1' }, { name: 'task2' }]} />);

      expect(screen.getByText('Tasks')).toBeInTheDocument();
      expect(screen.getByText('task1')).toBeInTheDocument();
      expect(screen.getByText('task2')).toBeInTheDocument();
      expect(screen.queryByText('Run After:')).toBeNull();
    });

    describe('does not render component', () => {
      it('when repo kind is not TektonPipeline', () => {
        const { container } = render(<TasksInPipeline {...defaultProps} kind={RepositoryKind.TektonTask} />);
        expect(container).toBeEmptyDOMElement();
      });

      it('when tasks is undefined', () => {
        const { container } = render(<TasksInPipeline {...defaultProps} tasks={undefined} />);
        expect(container).toBeEmptyDOMElement();
      });

      it('when tasks is empty', () => {
        const { container } = render(<TasksInPipeline {...defaultProps} tasks={[]} />);
        expect(container).toBeEmptyDOMElement();
      });
    });
  });
});
