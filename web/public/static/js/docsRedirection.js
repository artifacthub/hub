(() => {
  const REDIRECTS = {
    '#container-images-repositories': '/docs/topics/repositories/container_images',
    '#coredns-plugins-repositories': '/docs/topics/repositories/coredns_plugins',
    '#falco-rules-repositories': '/docs/topics/repositories/falco_rules',
    '#helm-charts-repositories': '/docs/topics/repositories/helm_charts',
    '#helm-plugins-repositories': '/docs/topics/repositories/helm_plugins',
    '#keda-scalers-repositories': '/docs/topics/repositories/keda_scalers',
    '#keptn-integrations-repositories': '/docs/topics/repositories/keptn_integrations',
    '#krew-kubectl-plugins-repositories': '/docs/topics/repositories/krew_kubectl_plugins',
    '#kubewarden-policies-repositories': '/docs/topics/repositories/kubewarden_policies',
    '#olm-operators-repositories': '/docs/topics/repositories/olm_operators',
    '#opa-policies-repositories': '/docs/topics/repositories/opa_policies',
    '#tekton-pipelines-repositories': '/docs/topics/repositories/tekton_pipelines',
    '#tekton-tasks-repositories': '/docs/topics/repositories/tekton_tasks',
    '#tinkerbell-actions-repositories': '/docs/topics/repositories/tinkerbell_actions',
  };

  // Redirect old hash links to new dedicated pages
  if (Object.keys(REDIRECTS).includes(window.location.hash)) {
    window.location.replace(REDIRECTS[window.location.hash]);
  }
})();
