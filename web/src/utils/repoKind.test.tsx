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

    it('unknown kind', () => {
      expect(methods.getRepoKindName(20)).toBeNull();
    });
  });
});
