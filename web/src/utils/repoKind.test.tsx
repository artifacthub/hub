import { RepositoryKind } from '../types';
import * as methods from './repoKind';

describe('repoKind', () => {
  describe('getRepoKind', () => {
    it('helm', () => {
      expect(methods.getRepoKind('helm')).toBe(RepositoryKind.Helm);
    });

    it('helm-plugin', () => {
      expect(methods.getRepoKind('helm-plugin')).toBe(RepositoryKind.HelmPlugin);
    });

    it('falco', () => {
      expect(methods.getRepoKind('falco')).toBe(RepositoryKind.Falco);
    });

    it('opa', () => {
      expect(methods.getRepoKind('opa')).toBe(RepositoryKind.OPA);
    });

    it('olm', () => {
      expect(methods.getRepoKind('olm')).toBe(RepositoryKind.OLM);
    });

    it('tbaction', () => {
      expect(methods.getRepoKind('tbaction')).toBe(RepositoryKind.TBAction);
    });

    it('krew', () => {
      expect(methods.getRepoKind('krew')).toBe(RepositoryKind.Krew);
    });

    it('tekton-task', () => {
      expect(methods.getRepoKind('tekton-task')).toBe(RepositoryKind.TektonTask);
    });

    it('keda-scaler', () => {
      expect(methods.getRepoKind('keda-scaler')).toBe(RepositoryKind.KedaScaler);
    });

    it('coredns', () => {
      expect(methods.getRepoKind('coredns')).toBe(RepositoryKind.CoreDNS);
    });

    it('keptn', () => {
      expect(methods.getRepoKind('keptn')).toBe(RepositoryKind.Keptn);
    });

    it('tekton-pipeline', () => {
      expect(methods.getRepoKind('tekton-pipeline')).toBe(RepositoryKind.TektonPipeline);
    });

    it('container', () => {
      expect(methods.getRepoKind('container')).toBe(RepositoryKind.Container);
    });

    it('kubewarden', () => {
      expect(methods.getRepoKind('kubewarden')).toBe(RepositoryKind.Kubewarden);
    });

    it('gatekeeper', () => {
      expect(methods.getRepoKind('gatekeeper')).toBe(RepositoryKind.Gatekeeper);
    });

    it('kyverno', () => {
      expect(methods.getRepoKind('kyverno')).toBe(RepositoryKind.Kyverno);
    });

    it('knative-client-plugin', () => {
      expect(methods.getRepoKind('knative-client-plugin')).toBe(RepositoryKind.KnativeClientPlugin);
    });

    it('backstage', () => {
      expect(methods.getRepoKind('backstage')).toBe(RepositoryKind.Backstage);
    });

    it('inspektor-gadget', () => {
      expect(methods.getRepoKind('inspektor-gadget')).toBe(RepositoryKind.InspektorGadget);
    });

    it('tekton-stepaction', () => {
      expect(methods.getRepoKind('tekton-stepaction')).toBe(RepositoryKind.TektonStepAction);
    });

    it('meshery', () => {
      expect(methods.getRepoKind('meshery')).toBe(RepositoryKind.MesheryDesign);
    });

    it('opencost', () => {
      expect(methods.getRepoKind('opencost')).toBe(RepositoryKind.OpenCost);
    });

    it('radius', () => {
      expect(methods.getRepoKind('radius')).toBe(RepositoryKind.RadiusRecipe);
    });

    it('unknown', () => {
      expect(methods.getRepoKind('unknown')).toBeNull();
    });
  });

  describe('getRepoKindName', () => {
    it('helm kind', () => {
      expect(methods.getRepoKindName(RepositoryKind.Helm)).toBe('helm');
    });

    it('helm-plugin kind', () => {
      expect(methods.getRepoKindName(RepositoryKind.HelmPlugin)).toBe('helm-plugin');
    });

    it('falco kind', () => {
      expect(methods.getRepoKindName(RepositoryKind.Falco)).toBe('falco');
    });

    it('opa kind', () => {
      expect(methods.getRepoKindName(RepositoryKind.OPA)).toBe('opa');
    });

    it('olm kind', () => {
      expect(methods.getRepoKindName(RepositoryKind.OLM)).toBe('olm');
    });

    it('tbaction kind', () => {
      expect(methods.getRepoKindName(RepositoryKind.TBAction)).toBe('tbaction');
    });

    it('krew kind', () => {
      expect(methods.getRepoKindName(RepositoryKind.Krew)).toBe('krew');
    });

    it('tekton-task kind', () => {
      expect(methods.getRepoKindName(RepositoryKind.TektonTask)).toBe('tekton-task');
    });

    it('keda-scaler kind', () => {
      expect(methods.getRepoKindName(RepositoryKind.KedaScaler)).toBe('keda-scaler');
    });

    it('coredns kind', () => {
      expect(methods.getRepoKindName(RepositoryKind.CoreDNS)).toBe('coredns');
    });

    it('keptn kind', () => {
      expect(methods.getRepoKindName(RepositoryKind.Keptn)).toBe('keptn');
    });

    it('tekton-pipeline kind', () => {
      expect(methods.getRepoKindName(RepositoryKind.TektonPipeline)).toBe('tekton-pipeline');
    });

    it('container kind', () => {
      expect(methods.getRepoKindName(RepositoryKind.Container)).toBe('container');
    });

    it('kubewarden kind', () => {
      expect(methods.getRepoKindName(RepositoryKind.Kubewarden)).toBe('kubewarden');
    });

    it('gatekeeper kind', () => {
      expect(methods.getRepoKindName(RepositoryKind.Gatekeeper)).toBe('gatekeeper');
    });

    it('kyverno kind', () => {
      expect(methods.getRepoKindName(RepositoryKind.Kyverno)).toBe('kyverno');
    });

    it('knative-client-plugin kind', () => {
      expect(methods.getRepoKindName(RepositoryKind.KnativeClientPlugin)).toBe('knative-client-plugin');
    });

    it('backstage kind', () => {
      expect(methods.getRepoKindName(RepositoryKind.Backstage)).toBe('backstage');
    });

    it('inspektor gadget kind', () => {
      expect(methods.getRepoKindName(RepositoryKind.InspektorGadget)).toBe('inspektor-gadget');
    });

    it('tekton-stepaction kind', () => {
      expect(methods.getRepoKindName(RepositoryKind.TektonStepAction)).toBe('tekton-stepaction');
    });

    it('meshery design kind', () => {
      expect(methods.getRepoKindName(RepositoryKind.MesheryDesign)).toBe('meshery');
    });

    it('opencost plugin kind', () => {
      expect(methods.getRepoKindName(RepositoryKind.OpenCost)).toBe('opencost');
    });

    it('radius recipe kind', () => {
      expect(methods.getRepoKindName(RepositoryKind.RadiusRecipe)).toBe('radius');
    });

    it('unknown kind', () => {
      expect(methods.getRepoKindName(50 as RepositoryKind)).toBeNull();
    });
  });
});
