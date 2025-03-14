/**
 * Copyright (c) 2020-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type {
  DefaultMenuItem,
  GetContextMenuItemsParams,
  GetMainMenuItemsParams,
  MenuItemDef,
} from 'ag-grid-community';
import {
  DataCubeQuerySortDirection,
  DataCubeColumnPinPlacement,
  DEFAULT_COLUMN_MIN_WIDTH,
  DataCubeColumnKind,
  type DataCubeOperationValue,
  DataCubeQueryFilterOperator,
  isPivotResultColumnName,
  getPivotResultColumnBaseColumnName,
  DataCubeOperationAdvancedValueType,
} from '../../core/DataCubeQueryEngine.js';
import {
  guaranteeIsNumber,
  isNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import type { DataCubeGridControllerState } from './DataCubeGridControllerState.js';
import {
  DataCubeGridClientExportFormat,
  INTERNAL__GRID_CLIENT_MISSING_VALUE,
  INTERNAL__GRID_CLIENT_TREE_COLUMN_ID,
} from './DataCubeGridClientEngine.js';
import { PRIMITIVE_TYPE } from '@finos/legend-graph';
import type { DataCubeColumnConfiguration } from '../../core/model/DataCubeConfiguration.js';
import { DataCubeFilterEditorConditionTreeNode } from '../../core/filter/DataCubeQueryFilterEditorState.js';
import { DataCubeEditorTab } from '../editor/DataCubeEditorState.js';
import { _findCol } from '../../core/model/DataCubeColumn.js';
import { useGridMenuItem, type CustomMenuItemProps } from 'ag-grid-react';
import { FormBadge_WIP } from '../../../components/core/DataCubeFormUtils.js';

export function WIP_GridMenuItem({
  name,
  subMenu,
  checked,
}: CustomMenuItemProps) {
  useGridMenuItem({
    configureDefaults: () => true,
  });

  return (
    <div>
      <span className="ag-menu-option-part ag-menu-option-icon"></span>
      <span className="ag-menu-option-part ag-menu-option-text !inline-flex items-center">
        <span className="opacity-50">{name}</span>
        <FormBadge_WIP />
      </span>
      <span className="ag-menu-option-part ag-menu-option-shortcut"></span>
      <span className="ag-menu-option-part ag-menu-option-popup-pointer select-none">
        {subMenu && <span className="ag-icon ag-icon-small-right"></span>}
      </span>
    </div>
  );
}

function toFilterValue(
  value: unknown,
  columnConfiguration: DataCubeColumnConfiguration,
): { label: string; value: DataCubeOperationValue } {
  const label = `${columnConfiguration.type === PRIMITIVE_TYPE.STRING ? `'${value}'` : value}`;
  let val: unknown;
  switch (columnConfiguration.type) {
    case PRIMITIVE_TYPE.STRING: {
      val = value;
      break;
    }
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.DECIMAL:
    case PRIMITIVE_TYPE.FLOAT:
    case PRIMITIVE_TYPE.INTEGER: {
      val = guaranteeIsNumber(Number(value));
      break;
    }
    case PRIMITIVE_TYPE.DATE:
    case PRIMITIVE_TYPE.STRICTDATE:
    case PRIMITIVE_TYPE.DATETIME: {
      val = value; // TODO?: make sure this is a parsable date string
      break;
    }
    default: {
      throw new UnsupportedOperationError(
        `Can't filter on column with unsupported type '${columnConfiguration.type}'`,
      );
    }
  }
  return { label, value: { type: columnConfiguration.type, value: val } };
}

function getColumnFilterOperations(
  columnConfiguration: DataCubeColumnConfiguration,
): string[] {
  switch (columnConfiguration.type) {
    case PRIMITIVE_TYPE.STRING: {
      return [
        DataCubeQueryFilterOperator.EQUAL,
        DataCubeQueryFilterOperator.NOT_EQUAL,
        DataCubeQueryFilterOperator.LESS_THAN,
        DataCubeQueryFilterOperator.LESS_THAN_OR_EQUAL,
        DataCubeQueryFilterOperator.GREATER_THAN,
        DataCubeQueryFilterOperator.GREATER_THAN_OR_EQUAL,
        DataCubeQueryFilterOperator.CONTAIN,
        DataCubeQueryFilterOperator.NOT_CONTAIN,
        DataCubeQueryFilterOperator.START_WITH,
        DataCubeQueryFilterOperator.NOT_START_WITH,
        DataCubeQueryFilterOperator.END_WITH,
        DataCubeQueryFilterOperator.NOT_END_WITH,
      ];
    }
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.DECIMAL:
    case PRIMITIVE_TYPE.FLOAT:
    case PRIMITIVE_TYPE.INTEGER: {
      return [
        DataCubeQueryFilterOperator.EQUAL,
        DataCubeQueryFilterOperator.NOT_EQUAL,
        DataCubeQueryFilterOperator.LESS_THAN,
        DataCubeQueryFilterOperator.LESS_THAN_OR_EQUAL,
        DataCubeQueryFilterOperator.GREATER_THAN,
        DataCubeQueryFilterOperator.GREATER_THAN_OR_EQUAL,
      ];
    }
    case PRIMITIVE_TYPE.DATE:
    case PRIMITIVE_TYPE.STRICTDATE:
    case PRIMITIVE_TYPE.DATETIME: {
      return [
        DataCubeQueryFilterOperator.EQUAL,
        DataCubeQueryFilterOperator.NOT_EQUAL,
        DataCubeQueryFilterOperator.LESS_THAN,
        DataCubeQueryFilterOperator.LESS_THAN_OR_EQUAL,
        DataCubeQueryFilterOperator.GREATER_THAN,
        DataCubeQueryFilterOperator.GREATER_THAN_OR_EQUAL,
      ];
    }
    default: {
      return [];
    }
  }
}

function buildNewFilterConditionMenuItem(
  columnConfiguration: DataCubeColumnConfiguration,
  operator: string,
  value: { label?: string | undefined; value: DataCubeOperationValue },
  controller: DataCubeGridControllerState,
): MenuItemDef {
  const operation = controller.view.engine.getFilterOperation(operator);
  return {
    name: `Add Filter: ${columnConfiguration.name} ${operation.textLabel}${value.label ? ` ${value.label}` : ''}`,
    action: () => {
      controller.addNewFilterCondition(
        new DataCubeFilterEditorConditionTreeNode(
          controller.filterTree.root,
          {
            name: columnConfiguration.name,
            type: columnConfiguration.type,
          },
          operation,
          value.value,
          undefined,
        ),
      );
    },
  };
}

export function generateMenuBuilder(
  controller: DataCubeGridControllerState,
): (
  params: GetContextMenuItemsParams | GetMainMenuItemsParams,
  fromHeader: boolean,
) => (DefaultMenuItem | MenuItemDef)[] {
  const view = controller.view;
  const dataCube = view.dataCube;

  // NOTE: we need to minimize the usage of these states
  // since the grid context-menu should be solely driven
  // by the grid controller
  const filter = view.filter;
  const editor = view.editor;
  const extend = view.extend;

  return (
    params: GetContextMenuItemsParams | GetMainMenuItemsParams,
    fromHeader: boolean,
  ) => {
    const column = params.column ?? undefined;
    const columnName = column?.getColId();
    const columnConfiguration = controller.getColumnConfiguration(columnName);
    const baseColumnConfiguration =
      columnName && isPivotResultColumnName(columnName)
        ? controller.getColumnConfiguration(
            getPivotResultColumnBaseColumnName(columnName),
          )
        : undefined;
    const isExtendedColumn =
      columnName &&
      _findCol(
        [...controller.leafExtendedColumns, ...controller.groupExtendedColumns],
        columnName,
      );
    // NOTE: here we assume the value must be coming from the same column
    const value: unknown = 'value' in params ? params.value : undefined;

    const sortMenu = [
      {
        name: 'Sort',
        subMenu: [
          ...(column && columnName && controller.getSortableColumn(columnName)
            ? [
                {
                  name: 'Ascending',
                  action: () =>
                    controller.setSortByColumn(
                      columnName,
                      DataCubeQuerySortDirection.ASCENDING,
                    ),
                },
                {
                  name: 'Descending',
                  action: () =>
                    controller.setSortByColumn(
                      columnName,
                      DataCubeQuerySortDirection.DESCENDING,
                    ),
                },
                {
                  name: 'Clear Sort',
                  disabled: !_findCol(controller.sortColumns, columnName),
                  action: () => controller.clearSortByColumn(columnName),
                },
                'separator',
                {
                  name: 'Add Ascending',
                  disabled: Boolean(
                    controller.sortColumns.find(
                      (col) =>
                        col.name === columnName &&
                        col.direction === DataCubeQuerySortDirection.ASCENDING,
                    ),
                  ),
                  action: () =>
                    controller.addSortByColumn(
                      columnName,
                      DataCubeQuerySortDirection.ASCENDING,
                    ),
                },
                {
                  name: 'Add Descending',
                  disabled: Boolean(
                    controller.sortColumns.find(
                      (col) =>
                        col.name === columnName &&
                        col.direction === DataCubeQuerySortDirection.DESCENDING,
                    ),
                  ),
                  action: () =>
                    controller.addSortByColumn(
                      columnName,
                      DataCubeQuerySortDirection.DESCENDING,
                    ),
                },
                'separator',
              ]
            : []),
          {
            name: 'Clear All Sorts',
            disabled: controller.sortColumns.length === 0,
            action: () => controller.clearAllSorts(),
          },
        ],
      },
    ] satisfies (DefaultMenuItem | MenuItemDef)[];

    let newFilterMenu: MenuItemDef[] = [];
    if (column && value !== undefined) {
      let _columnConfiguration = columnConfiguration;
      if (
        column.getColId() === INTERNAL__GRID_CLIENT_TREE_COLUMN_ID &&
        controller.verticalPivotColumns.length &&
        'node' in params &&
        params.node
      ) {
        const groupByColumn =
          controller.verticalPivotColumns[params.node.level];
        _columnConfiguration = controller.getColumnConfiguration(
          groupByColumn?.name,
        );
      }

      if (_columnConfiguration) {
        if (value !== INTERNAL__GRID_CLIENT_MISSING_VALUE) {
          const filterValue = toFilterValue(value, _columnConfiguration);
          const filterOperations =
            getColumnFilterOperations(_columnConfiguration);

          if (
            filterOperations.length &&
            filterOperations.includes(DataCubeQueryFilterOperator.EQUAL)
          ) {
            const moreFilterOperations = filterOperations.filter(
              (op) => op !== DataCubeQueryFilterOperator.EQUAL,
            );

            newFilterMenu = [
              buildNewFilterConditionMenuItem(
                _columnConfiguration,
                DataCubeQueryFilterOperator.EQUAL,
                filterValue,
                controller,
              ),
              moreFilterOperations.length
                ? {
                    name: `More Filters on ${columnName}...`,
                    subMenu: moreFilterOperations.map((operator) =>
                      buildNewFilterConditionMenuItem(
                        _columnConfiguration,
                        operator,
                        filterValue,
                        controller,
                      ),
                    ),
                  }
                : undefined,
            ].filter(isNonNullable);
          }
        } else {
          newFilterMenu = [
            buildNewFilterConditionMenuItem(
              _columnConfiguration,
              DataCubeQueryFilterOperator.IS_NULL,
              {
                value: {
                  type: DataCubeOperationAdvancedValueType.VOID,
                },
              },
              controller,
            ),
            buildNewFilterConditionMenuItem(
              _columnConfiguration,
              DataCubeQueryFilterOperator.IS_NOT_NULL,
              {
                value: {
                  type: DataCubeOperationAdvancedValueType.VOID,
                },
              },
              controller,
            ),
          ];
        }
      }
    }

    return [
      {
        name: 'Export',
        subMenu: [
          {
            name: 'HTML',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
          {
            name: 'Plain Text',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
          {
            name: 'PDF',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
          {
            name: 'Excel',
            action: () =>
              view.grid.exportEngine.exportFile(
                DataCubeGridClientExportFormat.EXCEL,
              ),
          },
          {
            name: 'CSV',
            action: () =>
              view.grid.exportEngine.exportFile(
                DataCubeGridClientExportFormat.CSV,
              ),
          },
          'separator',
          {
            name: 'DataCube Specification',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
        ],
      },
      {
        name: 'Email',
        subMenu: [
          {
            name: 'HTML',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
          {
            name: 'Plain Text',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
          'separator',
          {
            name: 'HTML Attachment',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
          {
            name: 'Plain Text Attachment',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
          {
            name: 'PDF Attachment',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
          {
            name: 'Excel Attachment',
            action: () => {
              view.grid.exportEngine
                .exportEmail(DataCubeGridClientExportFormat.EXCEL)
                .catch((error) =>
                  dataCube.alertService.alertUnhandledError(error),
                );
            },
          },
          {
            name: 'CSV Attachment',
            action: () => {
              view.grid.exportEngine
                .exportEmail(DataCubeGridClientExportFormat.CSV)
                .catch((error) =>
                  dataCube.alertService.alertUnhandledError(error),
                );
            },
          },
          {
            name: 'DataCube Specification Attachment',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
        ],
      },
      {
        name: 'Copy',
        menuItem: WIP_GridMenuItem,
        cssClasses: ['!opacity-100'],
        subMenu: [
          {
            name: 'Plain Text',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
          {
            name: 'Selected Rows as Plain Text',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
          {
            name: 'Selected Column as Plain Text',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
        ],
      },
      'separator',
      ...sortMenu,
      {
        name: 'Filter',
        subMenu: [
          ...newFilterMenu,
          newFilterMenu.length ? 'separator' : undefined,
          {
            name: 'Filters...',
            action: () => {
              filter.display.open();
            },
          },
          {
            name: 'Clear All Filters',
            action: () => controller.clearFilters(),
          },
        ].filter(isNonNullable),
      },
      {
        name: 'Pivot',
        subMenu: [
          ...(column &&
          columnName &&
          columnConfiguration?.kind === DataCubeColumnKind.DIMENSION &&
          controller.getVerticalPivotableColumn(columnName)
            ? [
                {
                  name: `Vertical Pivot on ${columnName}`,
                  action: () => controller.setVerticalPivotOnColumn(columnName),
                },
                {
                  name: `Add Vertical Pivot on ${columnName}`,
                  disabled: Boolean(
                    _findCol(controller.verticalPivotColumns, columnName),
                  ),
                  action: () => controller.addVerticalPivotOnColumn(columnName),
                },
                {
                  name: `Remove Vertical Pivot on ${columnName}`,
                  disabled: !_findCol(
                    controller.verticalPivotColumns,
                    columnName,
                  ),
                  action: () =>
                    controller.removeVerticalPivotOnColumn(columnName),
                },
                'separator',
              ]
            : []),
          ...(column &&
          columnName &&
          columnConfiguration?.kind === DataCubeColumnKind.DIMENSION &&
          controller.getHorizontalPivotableColumn(columnName)
            ? [
                {
                  name: `Horizontal Pivot on ${columnName}`,
                  action: () =>
                    controller.setHorizontalPivotOnColumn(columnName),
                },
                {
                  name: `Add Horizontal Pivot on ${columnName}`,
                  disabled: Boolean(
                    _findCol(controller.horizontalPivotColumns, columnName),
                  ),
                  action: () =>
                    controller.addHorizontalPivotOnColumn(columnName),
                },
                'separator',
              ]
            : []),
          ...(column &&
          columnName &&
          baseColumnConfiguration?.kind === DataCubeColumnKind.MEASURE &&
          !baseColumnConfiguration.excludedFromPivot &&
          controller.horizontalPivotColumns.length !== 0 // pivot must be active
            ? [
                {
                  name: `Exclude Column ${baseColumnConfiguration.name} from Horizontal Pivot`,
                  action: () =>
                    controller.excludeColumnFromHorizontalPivot(columnName),
                },
                'separator',
              ]
            : []),
          ...(column &&
          columnName &&
          columnConfiguration?.kind === DataCubeColumnKind.MEASURE &&
          columnConfiguration.excludedFromPivot &&
          controller.horizontalPivotColumns.length !== 0 // pivot must be active
            ? [
                {
                  name: `Include Column ${columnName} in Horizontal Pivot`,
                  action: () =>
                    controller.includeColumnInHorizontalPivot(columnName),
                },
                'separator',
              ]
            : []),
          {
            name: `Clear All Vertical Pivots`,
            disabled: controller.verticalPivotColumns.length === 0,
            action: () => controller.clearAllVerticalPivots(),
          },
          {
            name: `Clear All Horizontal Pivots`,
            disabled: controller.horizontalPivotColumns.length === 0,
            action: () => controller.clearAllHorizontalPivots(),
          },
        ],
      },
      {
        name: 'Extended Columns',
        subMenu: [
          {
            name: `Add New Column...`,
            action: () => {
              extend
                .openNewColumnEditor()
                .catch((error) =>
                  dataCube.alertService.alertUnhandledError(error),
                );
            },
          },
          ...(columnConfiguration && columnName
            ? [
                {
                  name: `Extend Column ${columnName}...`,
                  action: () => {
                    extend
                      .openNewColumnEditor(columnConfiguration)
                      .catch((error) =>
                        dataCube.alertService.alertUnhandledError(error),
                      );
                  },
                },
              ]
            : []),
          ...(isExtendedColumn
            ? [
                'separator',
                {
                  name: `Edit Column ${columnName}...`,
                  action: () => {
                    extend
                      .openExistingColumnEditor(columnName)
                      .catch((error) =>
                        dataCube.alertService.alertUnhandledError(error),
                      );
                  },
                },
                {
                  name: `Delete Column ${columnName}`,
                  action: () => {
                    extend
                      .deleteColumn(columnName)
                      .catch((error) =>
                        dataCube.alertService.alertUnhandledError(error),
                      );
                  },
                },
              ]
            : []),
        ],
      },
      'separator',
      {
        name: 'Resize',
        subMenu: [
          {
            name: `Auto-size to Fit Content`,
            disabled:
              !column ||
              !columnConfiguration ||
              columnConfiguration.fixedWidth !== undefined,
            action: () =>
              params.api.autoSizeColumns(
                [column?.getColId()].filter(isNonNullable),
              ),
          },
          {
            name: `Minimize Column`,
            disabled:
              !column ||
              !columnConfiguration ||
              columnConfiguration.fixedWidth !== undefined,
            action: () => {
              if (column && columnConfiguration) {
                params.api.setColumnWidths([
                  {
                    key: columnConfiguration.name,
                    newWidth:
                      columnConfiguration.minWidth ?? DEFAULT_COLUMN_MIN_WIDTH,
                  },
                ]);
              }
            },
          },
          'separator',
          {
            name: `Auto-size All Columns`,
            action: () =>
              params.api.autoSizeColumns([
                ...controller.configuration.columns
                  .filter(
                    (col) =>
                      col.fixedWidth === undefined &&
                      col.isSelected &&
                      !col.hideFromView,
                  )
                  .map((col) => col.name),
                ...controller.horizontalPivotCastColumns
                  .map((col) => {
                    if (isPivotResultColumnName(col.name)) {
                      const colConf = _findCol(
                        controller.configuration.columns,
                        getPivotResultColumnBaseColumnName(col.name),
                      );
                      if (
                        colConf &&
                        colConf.fixedWidth === undefined &&
                        colConf.isSelected &&
                        !colConf.hideFromView
                      ) {
                        return col.name;
                      }
                    }
                    return undefined;
                  })
                  .filter(isNonNullable),
              ]),
          },
          {
            name: `Minimize All Columns`,
            action: () => {
              params.api.setColumnWidths([
                ...controller.configuration.columns
                  .filter((col) => col.fixedWidth === undefined)
                  .map((col) => ({
                    key: col.name,
                    newWidth:
                      columnConfiguration?.minWidth ?? DEFAULT_COLUMN_MIN_WIDTH,
                  })),
                ...controller.horizontalPivotCastColumns
                  .map((col) => {
                    if (isPivotResultColumnName(col.name)) {
                      const colConf = _findCol(
                        controller.configuration.columns,
                        getPivotResultColumnBaseColumnName(col.name),
                      );
                      if (
                        colConf &&
                        colConf.fixedWidth === undefined &&
                        colConf.isSelected &&
                        !colConf.hideFromView
                      ) {
                        return {
                          key: col.name,
                          newWidth:
                            colConf.minWidth ?? DEFAULT_COLUMN_MIN_WIDTH,
                        };
                      }
                    }
                    return undefined;
                  })
                  .filter(isNonNullable),
              ]);
            },
          },
          {
            name: `Size Grid to Fit Screen`,
            action: () => params.api.sizeColumnsToFit(),
          },
        ],
      },
      {
        name: 'Pin',
        subMenu: [
          ...(columnConfiguration
            ? [
                {
                  name: `Pin Left`,
                  disabled: !column || column.isPinnedLeft(),
                  checked: Boolean(column?.isPinnedLeft()),
                  action: () =>
                    controller.pinColumn(
                      columnName,
                      DataCubeColumnPinPlacement.LEFT,
                    ),
                },
                {
                  name: `Pin Right`,
                  disabled: !column || column.isPinnedRight(),
                  checked: Boolean(column?.isPinnedRight()),
                  action: () =>
                    controller.pinColumn(
                      columnName,
                      DataCubeColumnPinPlacement.RIGHT,
                    ),
                },
                {
                  name: `Unpin`,
                  disabled: !column?.isPinned(),
                  action: () => controller.pinColumn(columnName, undefined),
                },
                'separator',
              ]
            : []),
          {
            name: `Remove All Pinnings`,
            disabled: controller.configuration.columns.every(
              (col) => col.pinned === undefined,
            ),
            action: () => controller.removeAllPins(),
          },
        ],
      },
      {
        name: 'Hide',
        disabled: !columnConfiguration,
        action: () => controller.showColumn(columnName, false),
      },
      ...((columnName === INTERNAL__GRID_CLIENT_TREE_COLUMN_ID
        ? [
            'separator',
            {
              name: 'Collapse All',
              action: () => {
                controller.collapseAllPaths();
              },
            },
          ]
        : []) as (DefaultMenuItem | MenuItemDef)[]),
      'separator',
      {
        name: 'Heatmap',
        menuItem: WIP_GridMenuItem,
        cssClasses: ['!opacity-100'],
        disabled: !column,
        subMenu: column
          ? [
              {
                name: `Add to ${column.getColId()}`,
                menuItem: WIP_GridMenuItem,
                cssClasses: ['!opacity-100'],
                disabled: true,
              },
              {
                name: `Remove from ${column.getColId()}`,
                menuItem: WIP_GridMenuItem,
                cssClasses: ['!opacity-100'],
                disabled: true,
              },
            ]
          : [],
      },
      {
        name: 'Show Plot...',
        menuItem: WIP_GridMenuItem,
        cssClasses: ['!opacity-100'],
        disabled: true,
      },
      {
        name: 'Show TreeMap...',
        menuItem: WIP_GridMenuItem,
        cssClasses: ['!opacity-100'],
        disabled: true,
      },
      'separator',
      {
        name: 'Properties...',
        disabled: editor.display.isOpen,
        action: () => {
          // open the column property
          if (column && fromHeader) {
            editor.setCurrentTab(DataCubeEditorTab.COLUMN_PROPERTIES);
            editor.columnProperties.setSelectedColumnName(
              baseColumnConfiguration?.name ??
                columnConfiguration?.name ??
                columnName,
            );
          }
          editor.display.open();
        },
      },
    ] satisfies (DefaultMenuItem | MenuItemDef)[];
  };
}
