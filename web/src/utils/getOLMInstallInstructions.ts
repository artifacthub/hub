// https://github.com/k8s-operatorhub/operatorhub.io/blob/345a6e4e9b3cb888ead5e90015b2b5b9d3ae55c9/server/src/services/installService.ts#L10-L48
const getOLMInstallInstructions = (packageName: string, channelName: string, isGlobalOperator?: boolean): string => {
  if (isGlobalOperator) {
    return `apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: my-${packageName}
  namespace: operators
spec:
  channel: ${channelName}
  name: ${packageName}
  source: operatorhubio-catalog
  sourceNamespace: olm`;
  }

  return `apiVersion: v1
kind: Namespace
metadata:
  name: my-${packageName}
---
apiVersion: operators.coreos.com/v1
kind: OperatorGroup
metadata:
  name: operatorgroup
  namespace: my-${packageName}
spec:
  targetNamespaces:
  - my-${packageName}
---
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: my-${packageName}
  namespace: my-${packageName}
spec:
  channel: ${channelName}
  name: ${packageName}
  source: operatorhubio-catalog
  sourceNamespace: olm`;
};

export default getOLMInstallInstructions;
