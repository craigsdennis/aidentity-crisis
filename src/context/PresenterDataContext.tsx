import { createContext, useContext } from 'react';

export type PresenterData = {
  totalTomatoes: number;
};

const defaultData: PresenterData = {
  totalTomatoes: 0,
};

export const PresenterDataContext = createContext<PresenterData>(defaultData);

type PresenterDataProviderProps = {
  value: PresenterData;
  children: React.ReactNode;
};

export function PresenterDataProvider({ value, children }: PresenterDataProviderProps) {
  return <PresenterDataContext.Provider value={value}>{children}</PresenterDataContext.Provider>;
}

export function usePresenterData() {
  return useContext(PresenterDataContext);
}
