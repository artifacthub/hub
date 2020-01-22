import React from 'react';
import { ChartRepository } from '../../types';
import Title from './Title';
import Checkbox from '../common/Checkbox';

interface Props {
  activeRepositories: string[];
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const repositories: ChartRepository[] = [
  {name: "stable", display_name: "Stable", url: ""},
  {name: "incubator", display_name: "Incubator", url: ""},
];

const Repositories = (props: Props) => {
  return (
    <div className="mt-4 pt-2">
      <Title text="Repository" />

      <div>
        {repositories.map((repository: ChartRepository) => (
          <Checkbox
            key={`kind_${repository.name}`}
            name={repository.name}
            label={repository.display_name}
            checked={props.activeRepositories.includes(repository.name)}
            onChange={props.onChange}
          />
        ))}
      </div>
    </div>
  );
};

export default Repositories;
