import compact from 'lodash/compact';
import uniq from 'lodash/uniq';

import { ChartTemplate, ChartTmplTypeFile } from '../types';

interface FileProps {
  name: string;
  extension: string;
}

interface Tmpl {
  name: string;
  data: string;
}

const KIND = /(\nkind: [A-Za-z0-9"]*|^kind: [A-Za-z0-9"]*)/g;

const getFileNameAndExt = (str: string): FileProps => {
  const file = str.split('/').pop() || str;
  return {
    name: file.slice(0, file.lastIndexOf('.')),
    extension: file.slice(file.lastIndexOf('.') + 1, file.length),
  };
};

const getResourceKinds = (data: string): string[] => {
  const kinds = data.match(KIND);
  if (kinds) {
    const cleanKinds = kinds.map((kind: string) => {
      const parts = kind.split(':');
      return parts[1].replace(/"/g, '').trim();
    });
    return uniq(compact(cleanKinds));
  }
  return [];
};

const decodeData = (data: string): string => {
  try {
    return atob(data);
  } catch {
    return Buffer.from(data, 'base64').toString('binary');
  }
};

const formatChartTemplates = (templates: Tmpl[]): ChartTemplate[] => {
  const finalTemplates: ChartTemplate[] = [];
  const finalHelpers: ChartTemplate[] = [];
  templates.forEach((template: Tmpl) => {
    const templateName = template.name.replace('templates/', '');
    const { name, extension } = getFileNameAndExt(templateName);
    if (['yaml', 'tpl'].includes(extension)) {
      const decodedData = decodeData(template.data);
      const tmpl = {
        name: templateName,
        fileName: name,
        resourceKinds: getResourceKinds(decodedData),
        data: decodedData,
      };

      if (extension === 'yaml') {
        finalTemplates.push({ ...tmpl, type: ChartTmplTypeFile.Template });
      } else {
        finalHelpers.push({ ...tmpl, type: ChartTmplTypeFile.Helper });
      }
    }
  });

  return [...finalTemplates, ...finalHelpers];
};

export default formatChartTemplates;
