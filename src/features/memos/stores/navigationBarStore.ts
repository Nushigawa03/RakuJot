import { useReducer } from 'react';

interface NavigationBarState {
  isOrSearch: boolean;
  isDetailSearch: boolean;
}

type NavigationBarAction =
  | { type: 'TOGGLE_OR_SEARCH' }
  | { type: 'TOGGLE_DETAIL_SEARCH' };

const initialState: NavigationBarState = {
  isOrSearch: false,
  isDetailSearch: false,
};

const navigationBarReducer = (
  state: NavigationBarState,
  action: NavigationBarAction
): NavigationBarState => {
  switch (action.type) {
    case 'TOGGLE_OR_SEARCH':
      return { ...state, isOrSearch: !state.isOrSearch };
    case 'TOGGLE_DETAIL_SEARCH':
      return { ...state, isDetailSearch: !state.isDetailSearch };
    default:
      return state;
  }
};

export const useNavigationBarStore = () => {
  const [state, dispatch] = useReducer(navigationBarReducer, initialState);

  const toggleOrSearch = () => dispatch({ type: 'TOGGLE_OR_SEARCH' });
  const toggleDetailSearch = () => dispatch({ type: 'TOGGLE_DETAIL_SEARCH' });

  return {
    ...state,
    toggleOrSearch,
    toggleDetailSearch,
  };
};