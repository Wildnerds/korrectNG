'use client';

import { getProductUnitLabel } from '@korrectng/shared';

export interface MaterialItem {
  name: string;
  quantity: number;
  unit: string;
  specs?: string;
}

interface MaterialsListProps {
  materials: MaterialItem[];
  title?: string;
  showHeader?: boolean;
  onRemove?: (index: number) => void;
  editable?: boolean;
}

export function MaterialsList({
  materials,
  title = 'Materials Required',
  showHeader = true,
  onRemove,
  editable = false,
}: MaterialsListProps) {
  if (!materials || materials.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      {showHeader && (
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <span>📦</span> {title}
        </h3>
      )}
      <div className="space-y-2">
        {materials.map((material, index) => (
          <div
            key={index}
            className="flex items-center justify-between py-2 border-b last:border-0"
          >
            <div className="flex-1">
              <p className="font-medium">{material.name}</p>
              {material.specs && (
                <p className="text-sm text-brand-gray">{material.specs}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-brand-gray">
                {material.quantity} {getProductUnitLabel(material.unit)}
              </span>
              {editable && onRemove && (
                <button
                  onClick={() => onRemove(index)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MaterialsList;
