import React from 'react';
import type { DataTileProps } from '../proof/DataTile';
import DataTile from '../proof/DataTile';

export const ExtraSmallTile: React.FC<DataTileProps> = ({ title, value, children }) => {
  return <DataTile className="border-t border-l border-black w-full" title={title} value={value} size="xs">
    {children}
  </DataTile>;
};

export const LargeTile: React.FC<DataTileProps> = ({ title, value }) => {
  return <DataTile title={title} value={value} size="large" className="flex-1" />;
};
