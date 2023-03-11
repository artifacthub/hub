import { Location, NavigateFunction } from 'react-router-dom';

interface AppHistory {
  navigate: NavigateFunction | null;
  location: Location | null;
}

// custom history object to allow navigation outside react components
export const history: AppHistory = {
  navigate: null,
  location: null,
};
