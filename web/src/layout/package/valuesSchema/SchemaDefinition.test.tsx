import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SchemaDefinition from './SchemaDefinition';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getProps = (fixtureId: string): any => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  return require(`./__fixtures__/SchemaDefinition/${fixtureId}.json`) as any;
};

const onActivePathChangeMock = jest.fn();
const setValueMock = jest.fn();
const scrollIntoViewMock = jest.fn();

window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const defaultProps = {
  isRequired: false,
  isExpanded: true,
  path: 'currentPath',
  onActivePathChange: onActivePathChangeMock,
  setValue: setValueMock,
};

describe('SchemaDefinition', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<SchemaDefinition {...getProps('1')} {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component - type: string', () => {
      const props = getProps('2');

      render(<SchemaDefinition {...props} {...defaultProps} />);

      expect(screen.getByText('Copy path to clipboard')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('Default')).toBeInTheDocument();
      expect(screen.getByText('value')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('string')).toBeInTheDocument();
      expect(screen.getByText('Annotations')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('this is a description')).toBeInTheDocument();
      expect(screen.getByText('Constraints')).toBeInTheDocument();
      expect(screen.getByText('Format')).toBeInTheDocument();
      expect(screen.getByText('Pattern')).toBeInTheDocument();
      expect(screen.getByText('^(\\([0-9]{3}\\))?[0-9]{3}-[0-9]{4}$')).toBeInTheDocument();
      expect(screen.getByText('Min length')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
      expect(screen.getByText('Max length')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('Enum')).toBeInTheDocument();
    });

    it('renders component - type: integer', () => {
      const props = getProps('3');
      render(<SchemaDefinition {...props} {...defaultProps} />);

      expect(screen.getByText('Sample')).toBeInTheDocument();
      expect(screen.getByText('Default')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('integer')).toBeInTheDocument();
      expect(screen.getByText('Annotations')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('this is a description')).toBeInTheDocument();
      expect(screen.getByText('Constraints')).toBeInTheDocument();
      expect(screen.getByText('Min')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('Max')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('Exclusive min')).toBeInTheDocument();
      expect(screen.getByText('Exclusive max')).toBeInTheDocument();
      expect(screen.getByText('true')).toBeInTheDocument();
      expect(screen.getByText('Enum')).toBeInTheDocument();
    });

    it('renders component - type: object', () => {
      const props = getProps('4');
      render(<SchemaDefinition {...props} {...defaultProps} />);

      expect(screen.getByText('Scanner configuration')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('object')).toBeInTheDocument();
      expect(screen.getByText('Annotations')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('this is a description')).toBeInTheDocument();
      expect(screen.getByText('Constraints')).toBeInTheDocument();
      expect(screen.getByText('Properties')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
      expect(screen.getByText('Enum')).toBeInTheDocument();
    });

    it('renders component - type: array', () => {
      const props = getProps('5');
      render(<SchemaDefinition {...props} {...defaultProps} />);

      expect(screen.getByText('title')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('array')).toBeInTheDocument();
      expect(screen.getAllByText('Default')).toHaveLength(2);
      expect(screen.getByText('(please expand for more details)')).toBeInTheDocument();
      expect(screen.getByText('Annotations')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('this is a description')).toBeInTheDocument();
      expect(screen.getByText('Constraints')).toBeInTheDocument();
      expect(screen.getByText('Items')).toBeInTheDocument();
      expect(screen.getAllByText('[string]')).toHaveLength(2);
      expect(screen.getAllByText('(unique)')).toHaveLength(2);
      expect(screen.getByText('Min items')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Max items')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
      expect(screen.getByText('Enum')).toBeInTheDocument();
    });

    it('calls setActivePathMock', async () => {
      const props = getProps('6');
      render(<SchemaDefinition {...props} {...defaultProps} isExpanded={false} />);

      expect(screen.queryByText('Annotations')).toBeNull();
      expect(screen.queryByText('Constraints')).toBeNull();

      const btn = screen.getByRole('button', { name: /Show detail/ });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(onActivePathChangeMock).toHaveBeenCalledTimes(1);
        expect(onActivePathChangeMock).toHaveBeenCalledWith('currentPath');
      });
    });

    it('renders ENUM', () => {
      const props = getProps('7');
      render(<SchemaDefinition {...props} {...defaultProps} />);

      expect(screen.getByText('Enum')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(7);
      expect(screen.getByText('trace')).toBeInTheDocument();
      expect(screen.getByText('debug')).toBeInTheDocument();
      expect(screen.getByText('info')).toBeInTheDocument();
      expect(screen.getByText('warn')).toBeInTheDocument();
      expect(screen.getByText('error')).toBeInTheDocument();
      expect(screen.getByText('fatal')).toBeInTheDocument();
      expect(screen.getByText('panic')).toBeInTheDocument();
    });

    it('renders REQUIRED label', () => {
      const props = getProps('8');
      render(<SchemaDefinition {...props} {...defaultProps} isRequired />);

      expect(screen.getByText('Required')).toBeInTheDocument();
      expect(screen.getByText('Required')).toHaveClass('bg-success');
    });

    it('renders value with different options', async () => {
      const props = getProps('9');
      const { rerender } = render(<SchemaDefinition {...props} {...defaultProps} />);

      const select = screen.getByDisplayValue('Option 1');
      expect(select).toBeInTheDocument();
      expect(screen.getByText('object')).toBeInTheDocument();

      await userEvent.selectOptions(select, '2');

      expect(setValueMock).toHaveBeenCalledTimes(1);
      expect(setValueMock).toHaveBeenCalledWith({
        active: 2,
        combinationType: 'anyOf',
        error: false,
        options: [
          { additionalProperties: false, type: 'object' },
          {
            additionalProperties: false,
            properties: {
              agentGroupId: {
                description: 'Agent group ID from Management Console (hover over an agent group to see its ID)',
                type: 'number',
              },
              agentNamePrefix: { description: "Prefix for each auto-registered agent's name", type: 'string' },
              cloudUrl: { description: 'Base URL of the Jitterbit Harmony Cloud', type: 'string' },
              deregisterAgentOnDrainstop: {
                description: 'Performs agent deregistration on drainstop/JVM shutdown (defaults to false)',
                type: 'boolean',
              },
              password: {
                description: 'Encrypted password of the Agent Installer user (encrypted using JitterbitUtils)',
                type: 'string',
              },
              retryCount: {
                description:
                  'Number of retries if agent is having issues making the call to Harmony cloud for registration (defaults to 10, valid range is 0-300)',
                maximum: 300,
                minimum: 0,
                type: 'integer',
              },
              retryIntervalSeconds: {
                description:
                  'Number of seconds the agent will wait before retrying. This number doubles every retry to a maximum of 600 seconds (10 minutes). Defaults to 5, valid range 5-600.',
                maximum: 600,
                minimum: 5,
                type: 'integer',
              },
              username: {
                description: 'Encrypted username of the Agent Installer user (encrypted using JitterbitUtils)',
                type: 'string',
              },
            },
            required: ['cloudUrl', 'username', 'password', 'agentGroupId'],
            type: 'object',
          },
          { type: 'null' },
        ],
      });

      rerender(<SchemaDefinition {...props} {...defaultProps} def={{ ...props.def, active: 2 }} isRequired />);
      expect(screen.getByText('null')).toBeInTheDocument();
    });

    it('renders 2 different types', async () => {
      const props = getProps('10');
      render(<SchemaDefinition {...props} {...defaultProps} />);

      const select = screen.getByRole('combobox', { name: 'Type selection' });

      expect(select).toBeInTheDocument();
      expect(screen.getByText('Constraints')).toBeInTheDocument();

      await userEvent.selectOptions(select, 'null');

      expect(screen.queryByText('Constraints')).toBeNull();
    });

    it('renders link in description', () => {
      const props = getProps('11');
      render(<SchemaDefinition {...props} {...defaultProps} />);

      const link = screen.getByText(
        'https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.19/#resourcerequirements-v1-core'
      );
      expect(link).toBeInTheDocument();
      expect(link).toHaveClass('d-inline text-secondary');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute(
        'href',
        'https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.19/#resourcerequirements-v1-core'
      );
    });

    it('updates combinationType', async () => {
      const props = getProps('12a');
      const { rerender } = render(<SchemaDefinition {...props} {...defaultProps} />);

      expect(screen.getByText('Raw')).toBeInTheDocument();

      const updatedProps = getProps('12b');
      rerender(<SchemaDefinition {...updatedProps} {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText('Raw')).toBeNull();
      });
    });

    it('renders value as null', () => {
      const props = getProps('13');
      render(<SchemaDefinition {...props} {...defaultProps} />);

      expect(screen.getByText('array')).toBeInTheDocument();
      expect(screen.getByText('Annotations')).toBeInTheDocument();
      expect(
        screen.getByText('List of additional environment variables that may be specified in the container')
      ).toBeInTheDocument();
      expect(screen.getByText('Constraints')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getAllByText('-')).toHaveLength(3);
    });
  });
});
