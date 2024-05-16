import isEqual from 'lodash/isEqual';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';

import { OrganizationPolicy } from '../types';
import isValidJSON from './isValidJSON';

interface Result {
  lostData: boolean;
  message?: JSX.Element;
}

export enum PolicyChangeAction {
  OnDisableAuthorization = 'onDisableAuthorization',
  OnSwitchFromCustomToPredefinedPolicy = 'onSwitchFromCustomToPredefinedPolicy',
  OnSwitchFromPredefinedToCustomPolicy = 'onSwitchFromPredefinedToCustomPolicy',
  OnChangePredefinedPolicy = 'onChangePredefinedPolicy',
  OnSavePolicy = 'onSavePolicy',
  Default = 'default',
}

export const DEFAULT_MESSAGE = (
  <span>
    You have some unsaved changes in your policy data.
    <br />
    <br />
    If you continue without saving, those changes will be lost.
  </span>
);

export const checkUnsavedPolicyChanges = (
  server?: OrganizationPolicy | null,
  browser?: OrganizationPolicy | null,
  action: PolicyChangeAction = PolicyChangeAction.Default,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  predefinedPolicyData?: { [key: string]: any }
): Result => {
  let lostData: boolean = false;
  let message: JSX.Element | undefined;

  if (server && browser) {
    switch (action) {
      case PolicyChangeAction.OnDisableAuthorization:
        lostData =
          (!isNull(server.customPolicy) || !isNull(server.predefinedPolicy)) &&
          (server.predefinedPolicy !== browser.predefinedPolicy ||
            server.customPolicy !== browser.customPolicy ||
            server.policyData !== browser.policyData);
        break;
      case PolicyChangeAction.OnChangePredefinedPolicy:
        lostData = server.policyData !== browser.policyData;
        break;
      case PolicyChangeAction.OnSwitchFromPredefinedToCustomPolicy:
        lostData =
          (isNull(server.predefinedPolicy) &&
            !isNull(browser.predefinedPolicy) &&
            !isUndefined(predefinedPolicyData) &&
            browser.policyData &&
            isValidJSON(browser.policyData) &&
            !isEqual(predefinedPolicyData, JSON.parse(browser.policyData))) ||
          (!isNull(server.predefinedPolicy) &&
            (server.predefinedPolicy !== browser.predefinedPolicy || server.policyData !== browser.policyData));
        break;
      case PolicyChangeAction.OnSwitchFromCustomToPredefinedPolicy:
        lostData =
          (!isNull(server.customPolicy) &&
            (server.customPolicy !== browser.customPolicy || server.policyData !== browser.policyData)) ||
          (isNull(server.customPolicy) &&
            !isNull(server.predefinedPolicy) &&
            (!isNull(browser.customPolicy) || !isNull(browser.policyData)) &&
            !isEqual(server, browser));
        break;
      case PolicyChangeAction.OnSavePolicy:
        lostData =
          (!isNull(server.customPolicy) && isNull(browser.customPolicy)) ||
          (!isNull(server.predefinedPolicy) && isNull(browser.predefinedPolicy));
        message = isNull(server.customPolicy) ? (
          <span>
            Your selected predefined policy and previous policy data will be lost.
            <br />
            <br />
            Are you sure you want to continue?
          </span>
        ) : (
          <span>
            Your custom policy and previous policy data will be lost.
            <br />
            <br />
            Are you sure you want to continue?
          </span>
        );
        break;
      default:
        lostData = !isEqual(server, browser);
    }
  } else {
    if (browser) {
      lostData = !isEqual(server, browser);
      if (lostData) {
        message = DEFAULT_MESSAGE;
      }
    }
  }

  return {
    lostData,
    message: lostData ? message || DEFAULT_MESSAGE : undefined,
  };
};
