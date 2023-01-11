import getOLMInstallInstructions from './getOLMInstallInstructions';

interface Test {
  input: {
    packageName: string;
    channelName: string;
    isGlobalOperator?: boolean;
  };
  output: string;
}

const tests: Test[] = [
  {
    input: {
      packageName: 'pkg',
      channelName: 'channel',
      isGlobalOperator: true,
    },
    output: `apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: my-pkg
  namespace: operators
spec:
  channel: channel
  name: pkg
  source: operatorhubio-catalog
  sourceNamespace: olm`,
  },
  {
    input: {
      packageName: 'pkg',
      channelName: 'channel',
      isGlobalOperator: false,
    },
    output: `apiVersion: v1
kind: Namespace
metadata:
  name: my-pkg
---
apiVersion: operators.coreos.com/v1
kind: OperatorGroup
metadata:
  name: operatorgroup
  namespace: my-pkg
spec:
  targetNamespaces:
  - my-pkg
---
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: my-pkg
  namespace: my-pkg
spec:
  channel: channel
  name: pkg
  source: operatorhubio-catalog
  sourceNamespace: olm`,
  },
  {
    input: {
      packageName: 'pkg',
      channelName: 'channel',
    },
    output: `apiVersion: v1
kind: Namespace
metadata:
  name: my-pkg
---
apiVersion: operators.coreos.com/v1
kind: OperatorGroup
metadata:
  name: operatorgroup
  namespace: my-pkg
spec:
  targetNamespaces:
  - my-pkg
---
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: my-pkg
  namespace: my-pkg
spec:
  channel: channel
  name: pkg
  source: operatorhubio-catalog
  sourceNamespace: olm`,
  },
];

describe('getOLMInstallInstructions', () => {
  for (let i = 0; i < tests.length; i++) {
    it('get correct array', () => {
      const actual = getOLMInstallInstructions(
        tests[i].input.packageName,
        tests[i].input.channelName,
        tests[i].input.isGlobalOperator
      );
      expect(actual).toEqual(tests[i].output);
    });
  }
});
