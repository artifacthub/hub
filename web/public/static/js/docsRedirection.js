(() => {
  const REDIRECTS = {
    '#container-images-repositories': '/docs/topics/repositories/container-images',
    '#coredns-plugins-repositories': '/docs/topics/repositories/coredns-plugins',
    '#falco-rules-repositories': '/docs/topics/repositories/falco-rules',
    '#helm-charts-repositories': '/docs/topics/repositories/helm-charts',
    '#helm-plugins-repositories': '/docs/topics/repositories/helm-plugins',
    '#keda-scalers-repositories': '/docs/topics/repositories/keda-scalers',
    '#keptn-integrations-repositories': '/docs/topics/repositories/keptn-integrations',
    '#krew-kubectl-plugins-repositories': '/docs/topics/repositories/krew-kubectl-plugins',
    '#kubewarden-policies-repositories': '/docs/topics/repositories/kubewarden-policies',
    '#olm-operators-repositories': '/docs/topics/repositories/olm-operators',
    '#opa-policies-repositories': '/docs/topics/repositories/opa-policies',
    '#tekton-pipelines-repositories': '/docs/topics/repositories/tekton-pipelines',
    '#tekton-tasks-repositories': '/docs/topics/repositories/tekton-tasks',
    '#tinkerbell-actions-repositories': '/docs/topics/repositories/tinkerbell-actions',
  };

  // Redirect old hash links to new dedicated pages
  if (Object.keys(REDIRECTS).includes(window.location.hash)) {
    window.location.replace(REDIRECTS[window.location.hash]);
  }
})();
