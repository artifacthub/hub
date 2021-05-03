import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../../api';
import { AppCtx } from '../../../../context/AppCtx';
import { ErrorKind, SearchResults, Webhook } from '../../../../types';
import WebhookForm from './Form';
jest.mock('../../../../api');
jest.mock('../../../common/Alert', () => (props: any) => <div>{props.message}</div>);

const getMockWebhook = (fixtureId: string): Webhook => {
  return require(`./__fixtures__/Form/${fixtureId}.json`) as Webhook;
};

const getMockSearch = (fixtureId: string): SearchResults => {
  return require(`./__fixtures__/Form/${fixtureId}s.json`) as SearchResults;
};

const mockOnSuccess = jest.fn();
const mockOnClose = jest.fn();
const mockOnAuthError = jest.fn();

const defaultProps = {
  onSuccess: mockOnSuccess,
  onClose: mockOnClose,
  onAuthError: mockOnAuthError,
};

const mockUserCtx = {
  user: { alias: 'userAlias', email: 'jsmith@email.com' },
  prefs: {
    controlPanel: {},
    search: { limit: 60 },
    theme: {
      configured: 'light',
      effective: 'light',
    },
    notifications: {
      lastDisplayedTime: null,
      enabled: true,
      displayed: [],
    },
  },
};

const mockOrgCtx = {
  user: { alias: 'userAlias', email: 'jsmith@email.com' },
  prefs: {
    controlPanel: { selectedOrg: 'test' },
    search: { limit: 60 },
    theme: {
      configured: 'light',
      effective: 'light',
    },
    notifications: {
      lastDisplayedTime: null,
      enabled: true,
      displayed: [],
    },
  },
};

describe('WebhookForm', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const mockWebhook = getMockWebhook('1');
    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
        <Router>
          <WebhookForm {...defaultProps} webhook={mockWebhook} />
        </Router>
      </AppCtx.Provider>
    );
    expect(asFragment).toMatchSnapshot();
  });

  describe('Render', () => {
    it('when webhook edition', () => {
      const mockWebhook = getMockWebhook('2');

      const { getByText, getAllByTestId, getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhookForm {...defaultProps} webhook={mockWebhook} />
          </Router>
        </AppCtx.Provider>
      );

      expect(getByTestId('goBack')).toBeInTheDocument();
      expect(getByText('Back to webhooks list')).toBeInTheDocument();
      expect(getByTestId('webhookForm')).toBeInTheDocument();

      expect(getByTestId('nameInput')).toBeInTheDocument();
      expect(getByText('Name')).toBeInTheDocument();
      expect(getByTestId('nameInput')).toHaveValue(mockWebhook.name);

      expect(getByTestId('descriptionInput')).toBeInTheDocument();
      expect(getByText('Description')).toBeInTheDocument();
      expect(getByTestId('descriptionInput')).toHaveValue(mockWebhook.description!);

      expect(
        getByText(
          'A POST request will be sent to the provided URL when any of the events selected in the triggers section happens.'
        )
      ).toBeInTheDocument();
      expect(getByTestId('urlInput')).toBeInTheDocument();
      expect(getByText('Url')).toBeInTheDocument();
      expect(getByTestId('urlInput')).toHaveValue(mockWebhook.url);

      expect(getByText(/X-ArtifactHub-Secret/i)).toBeInTheDocument();
      expect(getByTestId('secretInput')).toBeInTheDocument();
      expect(getByText('Secret')).toBeInTheDocument();
      expect(getByTestId('secretInput')).toHaveValue(mockWebhook.secret!);

      expect(getByText('Active')).toBeInTheDocument();
      expect(getByTestId('activeCheckbox')).toBeInTheDocument();
      expect(getByTestId('activeCheckbox')).not.toBeChecked();
      expect(
        getByText(
          'This flag indicates if the webhook is active or not. Inactive webhooks will not receive notifications.'
        )
      ).toBeInTheDocument();

      expect(getByText('Triggers')).toBeInTheDocument();

      expect(getByText('Events')).toBeInTheDocument();
      expect(getByTestId('checkbox')).toBeInTheDocument();
      expect(getByTestId('checkbox')).toBeChecked();

      expect(getByText('Packages')).toBeInTheDocument();
      expect(
        getByText(
          "When the events selected happen for any of the packages you've chosen, a notification will be triggered and the configured url will be called. At least one package must be selected."
        )
      ).toBeInTheDocument();
      expect(getByText('Package')).toBeInTheDocument();
      expect(getByText('Publisher')).toBeInTheDocument();
      expect(getAllByTestId('packageTableCell')).toHaveLength(1);

      expect(getByText('Payload')).toBeInTheDocument();
      expect(getByTestId('defaultPayloadRadio')).toBeInTheDocument();
      expect(getByTestId('defaultPayloadRadio')).not.toBeChecked();
      expect(getByTestId('customPayloadRadio')).toBeInTheDocument();
      expect(getByTestId('customPayloadRadio')).toBeChecked();
      expect(getByText('Default payload')).toBeInTheDocument();
      expect(getByText('Custom payload')).toBeInTheDocument();
      expect(
        getByText(
          "It's possible to customize the payload used to notify your service. This may help integrating ArtifactHub webhooks with other services without requiring you to write any code. To integrate ArtifactHub webhooks with Slack, for example, you could use a custom payload using the following template:"
        )
      ).toBeInTheDocument();

      expect(getByTestId('contentTypeInput')).toBeInTheDocument();
      expect(getByText('Request Content-Type')).toBeInTheDocument();
      expect(getByTestId('contentTypeInput')).toHaveValue(mockWebhook.contentType!);

      expect(getByText('Template')).toBeInTheDocument();
      expect(getByTestId('templateTextarea')).toBeInTheDocument();
      expect(getByTestId('templateTextarea')).toHaveValue(mockWebhook.template!);

      expect(getByText('Variables reference')).toBeInTheDocument();
      expect(getByText(`{{ .Event.Kind }}`)).toBeInTheDocument();
      expect(getByText('Version of the new release.')).toBeInTheDocument();

      expect(getByTestId('testWebhookBtn')).toBeInTheDocument();
      expect(getByTestId('testWebhookBtn')).toBeEnabled();
      expect(getByText('Cancel')).toBeInTheDocument();
      expect(getByText('Save')).toBeInTheDocument();
      expect(getByTestId('sendWebhookBtn')).toBeInTheDocument();
    });

    it('when webhook addition', () => {
      const { getByText, queryByText, getByTestId, getByPlaceholderText } = render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhookForm {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      expect(getByTestId('goBack')).toBeInTheDocument();
      expect(getByText('Back to webhooks list')).toBeInTheDocument();
      expect(getByTestId('webhookForm')).toBeInTheDocument();

      expect(getByTestId('nameInput')).toBeInTheDocument();
      expect(getByText('Name')).toBeInTheDocument();
      expect(getByTestId('nameInput')).toHaveValue('');

      expect(getByTestId('descriptionInput')).toBeInTheDocument();
      expect(getByText('Description')).toBeInTheDocument();
      expect(getByTestId('descriptionInput')).toHaveValue('');

      expect(
        getByText(
          'A POST request will be sent to the provided URL when any of the events selected in the triggers section happens.'
        )
      ).toBeInTheDocument();
      expect(getByTestId('urlInput')).toBeInTheDocument();
      expect(getByText('Url')).toBeInTheDocument();
      expect(getByTestId('urlInput')).toHaveValue('');

      expect(getByText(/X-ArtifactHub-Secret/i)).toBeInTheDocument();
      expect(getByTestId('secretInput')).toBeInTheDocument();
      expect(getByText('Secret')).toBeInTheDocument();
      expect(getByTestId('secretInput')).toHaveValue('');

      expect(getByText('Active')).toBeInTheDocument();
      expect(getByTestId('activeCheckbox')).toBeInTheDocument();
      expect(getByTestId('activeCheckbox')).toBeChecked();
      expect(
        getByText(
          'This flag indicates if the webhook is active or not. Inactive webhooks will not receive notifications.'
        )
      ).toBeInTheDocument();

      expect(getByText('Triggers')).toBeInTheDocument();

      expect(getByText('Events')).toBeInTheDocument();
      expect(getByTestId('checkbox')).toBeInTheDocument();
      expect(getByTestId('checkbox')).toBeChecked();

      expect(getByText('Packages')).toBeInTheDocument();
      expect(
        getByText(
          "When the events selected happen for any of the packages you've chosen, a notification will be triggered and the configured url will be called. At least one package must be selected."
        )
      ).toBeInTheDocument();
      expect(queryByText('Package')).toBeNull();
      expect(queryByText('Publisher')).toBeNull();

      expect(getByText('Payload')).toBeInTheDocument();
      expect(getByTestId('defaultPayloadRadio')).toBeInTheDocument();
      expect(getByTestId('defaultPayloadRadio')).toBeChecked();
      expect(getByTestId('customPayloadRadio')).toBeInTheDocument();
      expect(getByTestId('customPayloadRadio')).not.toBeChecked();
      expect(getByText('Default payload')).toBeInTheDocument();
      expect(getByText('Custom payload')).toBeInTheDocument();
      expect(
        queryByText(
          "It's possible to customize the payload used to notify your service. This may help integrating ArtifactHub webhooks with other services without requiring you to write any code. To integrate ArtifactHub webhooks with Slack, for example, you could use a custom payload using the following template:"
        )
      ).toBeNull();

      expect(getByTestId('contentTypeInput')).toBeInTheDocument();
      expect(getByText('Request Content-Type')).toBeInTheDocument();
      expect(getByTestId('contentTypeInput')).toHaveValue('');
      expect(getByPlaceholderText('application/cloudevents+json')).toBeInTheDocument();

      expect(getByText('Template')).toBeInTheDocument();
      expect(getByTestId('templateTextarea')).toBeInTheDocument();
      expect(getByTestId('templateTextarea')).toBeDisabled();
      expect(getByTestId('templateTextarea')).toHaveValue(`{
    "specversion" : "1.0",
    "id" : "{{ .Event.ID }}",
    "source" : "https://artifacthub.io/cloudevents",
    "type" : "io.artifacthub.{{ .Event.Kind }}",
    "datacontenttype" : "application/json",
    "data" : {
        "package": {
            "name": "{{ .Package.Name }}",
            "version": "{{ .Package.Version }}",
            "url": "{{ .Package.URL }}",
            "changes": [{{range $i, $e := .Package.Changes}}{{if $i}}, {{end}}"{{.Description}}"{{end}}],
            "containsSecurityUpdates": {{ .Package.ContainsSecurityUpdates }},
            "prerelease": {{ .Package.Prerelease }},
            "repository": {
                "kind": "{{ .Package.Repository.Kind }}",
                "name": "{{ .Package.Repository.Name }}",
                "publisher": "{{ .Package.Repository.Publisher }}"
            }
        }
    }
}`);

      expect(getByText('Variables reference')).toBeInTheDocument();
      expect(getByText(`{{ .Event.Kind }}`)).toBeInTheDocument();
      expect(getByText('Version of the new release.')).toBeInTheDocument();

      expect(getByTestId('testWebhookBtn')).toBeInTheDocument();
      expect(getByTestId('testWebhookBtn')).toBeDisabled();
      expect(getByText('Cancel')).toBeInTheDocument();
      expect(getByText('Add')).toBeInTheDocument();
      expect(getByTestId('sendWebhookBtn')).toBeInTheDocument();
    });

    it('closes form on back button click', () => {
      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhookForm {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const btn = getByTestId('goBack');
      fireEvent.click(btn);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('closes form on Cancel button click', () => {
      const { getByText } = render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhookForm {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const btn = getByText('Cancel');
      fireEvent.click(btn);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Form submission', () => {
    it('when incomplete form', () => {
      const { getByTestId, getAllByText, getByText } = render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhookForm {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const btn = getByTestId('sendWebhookBtn');
      fireEvent.click(btn);

      expect(getAllByText('This field is required')).toHaveLength(4);
      expect(getByText('At least one package has to be selected')).toBeInTheDocument();
    });

    it('calls updateWebhook', async () => {
      mocked(API).updateWebhook.mockResolvedValue(null);
      const mockWebhook = getMockWebhook('3');

      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhookForm {...defaultProps} webhook={{ ...mockWebhook, contentType: null, template: null }} />
          </Router>
        </AppCtx.Provider>
      );

      const input = getByTestId('nameInput');
      fireEvent.change(input, { target: { value: 'test' } });

      const btn = getByTestId('sendWebhookBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.updateWebhook).toHaveBeenCalledTimes(1);
        expect(API.updateWebhook).toHaveBeenCalledWith(
          {
            ...mockWebhook,
            name: 'test',
          },
          undefined
        );
      });

      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls updateWebhook with selected org context', async () => {
      mocked(API).updateWebhook.mockResolvedValue(null);
      const mockWebhook = getMockWebhook('4');

      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockOrgCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhookForm {...defaultProps} webhook={{ ...mockWebhook, contentType: null, template: null }} />
          </Router>
        </AppCtx.Provider>
      );

      const input = getByTestId('nameInput');
      fireEvent.change(input, { target: { value: 'test' } });

      const btn = getByTestId('sendWebhookBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.updateWebhook).toHaveBeenCalledTimes(1);
        expect(API.updateWebhook).toHaveBeenCalledWith(
          {
            ...mockWebhook,
            name: 'test',
          },
          'test'
        );
      });

      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls addWebhook', async () => {
      mocked(API).addWebhook.mockResolvedValue(null);
      const mockSearch = getMockSearch('1');
      mocked(API).searchPackages.mockResolvedValue(mockSearch);

      const { getByTestId, getAllByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhookForm {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const nameInput = getByTestId('nameInput');
      fireEvent.change(nameInput, { target: { value: 'test' } });

      const urlInput = getByTestId('urlInput');
      fireEvent.change(urlInput, { target: { value: 'http://url.com' } });

      const input = getByTestId('searchPackagesInput');
      fireEvent.change(input, { target: { value: 'testing' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 13, charCode: 13 });

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      const packages = getAllByTestId('packageItem');
      fireEvent.click(packages[0]);

      const btn = getByTestId('sendWebhookBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.addWebhook).toHaveBeenCalledTimes(1);
        expect(API.addWebhook).toHaveBeenCalledWith(
          {
            name: 'test',
            url: 'http://url.com',
            active: true,
            description: '',
            secret: '',
            eventKinds: [0],
            packages: [mockSearch.data.packages![0]],
          },
          undefined
        );
      });

      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    describe('when fails', () => {
      it('UnauthorizedError', async () => {
        mocked(API).updateWebhook.mockRejectedValue({
          kind: ErrorKind.Unauthorized,
        });
        const mockWebhook = getMockWebhook('5');

        const { getByTestId } = render(
          <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
            <Router>
              <WebhookForm {...defaultProps} webhook={{ ...mockWebhook, contentType: null, template: null }} />
            </Router>
          </AppCtx.Provider>
        );

        const input = getByTestId('nameInput');
        fireEvent.change(input, { target: { value: 'test' } });

        const btn = getByTestId('sendWebhookBtn');
        fireEvent.click(btn);

        await waitFor(() => {
          expect(API.updateWebhook).toHaveBeenCalledTimes(1);
          expect(API.updateWebhook).toHaveBeenCalledWith(
            {
              ...mockWebhook,
              name: 'test',
            },
            undefined
          );
        });

        expect(mockOnAuthError).toHaveBeenCalledTimes(1);
      });

      it('with error message', async () => {
        mocked(API).updateWebhook.mockRejectedValue({
          kind: ErrorKind.Other,
          message: 'message error',
        });
        const mockWebhook = getMockWebhook('6');

        const component = (
          <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
            <Router>
              <WebhookForm {...defaultProps} webhook={{ ...mockWebhook, contentType: null, template: null }} />
            </Router>
          </AppCtx.Provider>
        );
        const { getByTestId, getByText } = render(component);

        const input = getByTestId('nameInput');
        fireEvent.change(input, { target: { value: 'test' } });

        const btn = getByTestId('sendWebhookBtn');
        fireEvent.click(btn);

        await waitFor(() => {
          expect(API.updateWebhook).toHaveBeenCalledTimes(1);
          expect(API.updateWebhook).toHaveBeenCalledWith(
            {
              ...mockWebhook,
              name: 'test',
            },
            undefined
          );
        });

        await waitFor(() => {
          expect(getByText('An error occurred updating the webhook: message error')).toBeInTheDocument();
        });
      });

      it('without error message', async () => {
        mocked(API).updateWebhook.mockRejectedValue({ kind: ErrorKind.Other });
        const mockWebhook = getMockWebhook('7');

        const component = (
          <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
            <Router>
              <WebhookForm {...defaultProps} webhook={{ ...mockWebhook, contentType: null, template: null }} />
            </Router>
          </AppCtx.Provider>
        );
        const { getByTestId, getByText, rerender } = render(component);

        const input = getByTestId('nameInput');
        fireEvent.change(input, { target: { value: 'test' } });

        const btn = getByTestId('sendWebhookBtn');
        fireEvent.click(btn);

        await waitFor(() => {
          expect(API.updateWebhook).toHaveBeenCalledTimes(1);
          expect(API.updateWebhook).toHaveBeenCalledWith(
            {
              ...mockWebhook,
              name: 'test',
            },
            undefined
          );
        });

        rerender(component);

        await waitFor(() => {
          expect(getByText('An error occurred updating the webhook, please try again later.')).toBeInTheDocument();
        });
      });
    });

    it('removes package from list to update webhook', async () => {
      mocked(API).updateWebhook.mockResolvedValue(null);
      const mockWebhook = getMockWebhook('8');
      const newPackagesList = [...mockWebhook.packages];
      newPackagesList.shift();

      const { getByTestId, getAllByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhookForm {...defaultProps} webhook={{ ...mockWebhook, contentType: null, template: null }} />
          </Router>
        </AppCtx.Provider>
      );

      const btns = getAllByTestId('deletePackageButton');
      expect(btns).toHaveLength(mockWebhook.packages.length);
      fireEvent.click(btns[0]);

      const btn = getByTestId('sendWebhookBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.updateWebhook).toHaveBeenCalledTimes(1);
        expect(API.updateWebhook).toHaveBeenCalledWith(
          {
            ...mockWebhook,
            packages: newPackagesList,
          },
          undefined
        );
      });
    });
  });

  describe('testing webhook', () => {
    it('triggers test on webhook edition', async () => {
      mocked(API).triggerWebhookTest.mockResolvedValue(null);
      const mockWebhook = getMockWebhook('9');

      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhookForm {...defaultProps} webhook={{ ...mockWebhook, contentType: null, template: null }} />
          </Router>
        </AppCtx.Provider>
      );

      const btn = getByTestId('testWebhookBtn');
      expect(btn).toBeInTheDocument();
      expect(btn).toBeEnabled();
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.triggerWebhookTest).toHaveBeenCalledTimes(1);
        expect(API.triggerWebhookTest).toHaveBeenCalledWith({
          url: mockWebhook.url,
          eventKinds: mockWebhook.eventKinds,
        });
      });

      expect(getByTestId('testWebhookTick')).toBeInTheDocument();
    });

    it('triggers test on webhook addition', async () => {
      mocked(API).triggerWebhookTest.mockResolvedValue(null);

      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhookForm {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const btn = getByTestId('testWebhookBtn');
      expect(btn).toBeInTheDocument();
      expect(btn).toBeDisabled();

      const urlInput = getByTestId('urlInput');
      fireEvent.change(urlInput, { target: { value: 'http://url.com' } });

      expect(btn).toBeEnabled();
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.triggerWebhookTest).toHaveBeenCalledTimes(1);
        expect(API.triggerWebhookTest).toHaveBeenCalledWith({
          url: 'http://url.com',
          eventKinds: [0],
        });
      });

      expect(getByTestId('testWebhookTick')).toBeInTheDocument();
    });

    it('disables test btn when webhook for testing is not valid', () => {
      const mockWebhook = getMockWebhook('10');

      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhookForm {...defaultProps} webhook={{ ...mockWebhook, contentType: null, template: null }} />
          </Router>
        </AppCtx.Provider>
      );

      const btn = getByTestId('testWebhookBtn');
      expect(btn).toBeInTheDocument();
      expect(btn).toBeEnabled();

      const urlInput = getByTestId('urlInput');
      fireEvent.change(urlInput, { target: { value: 'wrongUrl' } });

      expect(btn).toBeDisabled();
    });

    describe('when fails', () => {
      it('UnauthorizedError', async () => {
        mocked(API).triggerWebhookTest.mockRejectedValue({
          kind: ErrorKind.Unauthorized,
        });
        const mockWebhook = getMockWebhook('11');

        const { getByTestId } = render(
          <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
            <Router>
              <WebhookForm {...defaultProps} webhook={{ ...mockWebhook, contentType: null, template: null }} />
            </Router>
          </AppCtx.Provider>
        );

        const btn = getByTestId('testWebhookBtn');
        fireEvent.click(btn);

        await waitFor(() => {
          expect(API.triggerWebhookTest).toHaveBeenCalledTimes(1);
          expect(API.triggerWebhookTest).toHaveBeenCalledWith({
            url: mockWebhook.url,
            eventKinds: mockWebhook.eventKinds,
          });
        });

        expect(mockOnAuthError).toHaveBeenCalledTimes(1);
      });

      it('with custom error', async () => {
        mocked(API).triggerWebhookTest.mockRejectedValue({
          kind: ErrorKind.Other,
          message: 'custom error',
        });
        const mockWebhook = getMockWebhook('12');

        const component = (
          <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
            <Router>
              <WebhookForm {...defaultProps} webhook={{ ...mockWebhook, contentType: null, template: null }} />
            </Router>
          </AppCtx.Provider>
        );
        const { getByTestId, getByText, rerender } = render(component);

        const btn = getByTestId('testWebhookBtn');
        fireEvent.click(btn);

        await waitFor(() => {
          expect(API.triggerWebhookTest).toHaveBeenCalledTimes(1);
          expect(API.triggerWebhookTest).toHaveBeenCalledWith({
            url: mockWebhook.url,
            eventKinds: mockWebhook.eventKinds,
          });
        });

        rerender(component);

        await waitFor(() => {
          expect(getByText('An error occurred testing the webhook: custom error')).toBeInTheDocument();
        });
      });

      it('default error', async () => {
        mocked(API).triggerWebhookTest.mockRejectedValue({
          kind: ErrorKind.Other,
        });
        const mockWebhook = getMockWebhook('13');

        const component = (
          <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
            <Router>
              <WebhookForm {...defaultProps} webhook={{ ...mockWebhook, contentType: null, template: null }} />
            </Router>
          </AppCtx.Provider>
        );
        const { getByTestId, getByText, rerender } = render(component);

        const btn = getByTestId('testWebhookBtn');
        fireEvent.click(btn);

        await waitFor(() => {
          expect(API.triggerWebhookTest).toHaveBeenCalledTimes(1);
          expect(API.triggerWebhookTest).toHaveBeenCalledWith({
            url: mockWebhook.url,
            eventKinds: mockWebhook.eventKinds,
          });
        });

        rerender(component);

        await waitFor(() => {
          expect(getByText('An error occurred testing the webhook, please try again later.')).toBeInTheDocument();
        });
      });
    });
  });
});
