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

import { observer } from 'mobx-react-lite';
import { DataCubeIcon, useDropdownMenu } from '@finos/legend-art';
import {
  type ColDef,
  type ColDefField,
  type GridApi,
  type ModelUpdatedEvent,
  type RowDragEndEvent,
  type SelectionChangedEvent,
  AllCommunityModule,
} from 'ag-grid-community';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AgGridReact,
  type AgGridReactProps,
  type CustomCellRendererProps,
  type CustomNoRowsOverlayProps,
} from 'ag-grid-react';
import {
  type DataCubeEditorColumnsSelectorSortColumnState,
  type DataCubeEditorColumnsSelectorColumnState,
  type DataCubeEditorColumnsSelectorState,
} from '../../../stores/view/editor/DataCubeEditorColumnsSelectorState.js';
import { isNonNullable } from '@finos/legend-shared';
import {
  getDataForAllFilteredNodes,
  getDataForAllNodes,
} from '../../../stores/view/grid/DataCubeGridClientEngine.js';
import {
  FormDropdownMenu,
  FormDropdownMenuItem,
} from '../../core/DataCubeFormUtils.js';
import { DataCubeQuerySortDirection } from '../../../stores/core/DataCubeQueryEngine.js';
import { _findCol } from '../../../stores/core/model/DataCubeColumn.js';

export const INTERNAL__EDITOR_COLUMNS_SELECTOR_ROW_HEIGHT = 20;

export function getColumnsSelectorBaseGridProps<
  T extends { name: string } = DataCubeEditorColumnsSelectorColumnState,
>(): AgGridReactProps<T> {
  return {
    modules: [AllCommunityModule],
    theme: 'legacy',
    className: 'ag-theme-quartz',
    animateRows: false,
    getRowId: (params) => params.data.name,
    editType: 'fullRow',
    rowDragMultiRow: true,
    rowDragEntireRow: true,
    rowSelection: {
      mode: 'multiRow',
      checkboxes: true,
      headerCheckbox: true,
      enableClickSelection: true,
    },
    selectionColumnDef: {
      width: 40,
      headerClass: 'pl-6',
      cellClass: 'pl-1.5',
      rowDrag: true,
      rowDragText: (params, dragItemCount) => {
        if (dragItemCount > 1) {
          return `${dragItemCount} columns`;
        }
        return (params.rowNode?.data as T).name;
      },
      sortable: false,
      resizable: false,
      suppressHeaderMenuButton: true,
    },
    suppressMoveWhenRowDragging: true,
    rowHeight: INTERNAL__EDITOR_COLUMNS_SELECTOR_ROW_HEIGHT,
    headerHeight: INTERNAL__EDITOR_COLUMNS_SELECTOR_ROW_HEIGHT,
    suppressRowHoverHighlight: false,
    noRowsOverlayComponent: (
      params: CustomNoRowsOverlayProps<T> & {
        noColumnsSelectedRenderer?: (() => React.ReactNode) | undefined;
      },
    ) => {
      if (params.api.getQuickFilter()) {
        return (
          <div className="flex items-center border-[1.5px] border-neutral-300 p-2 font-semibold text-neutral-400">
            <div>
              <DataCubeIcon.WarningCircle className="mr-1 text-lg" />
            </div>
            No match found
          </div>
        );
      }
      if (params.noColumnsSelectedRenderer) {
        return params.noColumnsSelectedRenderer();
      }
      return <div />;
    },
    // Show no rows overlay when there are no search results
    // See https://stackoverflow.com/a/72637410
    onModelUpdated: (event: ModelUpdatedEvent<T>) => {
      if (event.api.getDisplayedRowCount() === 0) {
        event.api.showNoRowsOverlay();
      } else {
        event.api.hideOverlay();
      }
    },
  };
}

export function getColumnsSelectorBaseColumnDef<
  T extends { name: string } = DataCubeEditorColumnsSelectorColumnState,
>(): ColDef<T> {
  return {
    field: 'name' as ColDefField<T>,
    colId: 'name',
    flex: 1,
    minWidth: 100,
    filter: true,
    sortable: false,
    resizable: false,
    suppressHeaderMenuButton: true,
    getQuickFilterText: (params) => params.value,
  };
}

/**
 * Move this display to a separate component to avoid re-rendering the header too frequently
 */
const ColumnsSearchResultCountBadge = observer(
  function ColumnsSearchResultCountBadge<
    T extends
      DataCubeEditorColumnsSelectorColumnState = DataCubeEditorColumnsSelectorColumnState,
  >(props: {
    selector: DataCubeEditorColumnsSelectorState<T>;
    gridApi: GridApi<T>;
    scope: 'available' | 'selected';
  }) {
    const { selector, gridApi, scope } = props;
    return (
      <div className="flex items-center justify-center rounded-lg bg-neutral-500 px-1 py-0.5 font-mono text-xs font-bold text-white">
        {`${getDataForAllFilteredNodes(gridApi).length}/${scope === 'available' ? selector.availableColumnsForDisplay.length : selector.selectedColumnsForDisplay.length}`}
        <span className="hidden">
          {scope === 'available'
            ? // subscribing to the search text to trigger re-render as it changes
              selector.availableColumnsSearchText
            : selector.selectedColumnsSearchText}
        </span>
      </div>
    );
  },
);

export const DataCubeEditorColumnsSelector = observer(
  function DataCubeEditorColumnsSelector<
    T extends
      DataCubeEditorColumnsSelectorColumnState = DataCubeEditorColumnsSelectorColumnState,
  >(props: {
    selector: DataCubeEditorColumnsSelectorState<T>;
    columnLabelRenderer?:
      | ((p: {
          selector: DataCubeEditorColumnsSelectorState<T>;
          column: T;
        }) => React.ReactNode)
      | undefined;
    columnActionRenderer?:
      | ((p: {
          selector: DataCubeEditorColumnsSelectorState<T>;
          column: T;
        }) => React.ReactNode)
      | undefined;
    noColumnsSelectedRenderer?: (() => React.ReactNode) | undefined;
  }) {
    const {
      selector,
      columnLabelRenderer,
      columnActionRenderer,
      noColumnsSelectedRenderer,
    } = props;
    const [selectedAvailableColumns, setSelectedAvailableColumns] = useState<
      T[]
    >([]);
    const [selectedSelectedColumns, setSelectedSelectedColumns] = useState<T[]>(
      [],
    );
    const [availableColumnsGridApi, setAvailableColumnsGridApi] =
      useState<GridApi | null>(null);
    const [selectedColumnsGridApi, setSelectedColumnsGridApi] =
      useState<GridApi | null>(null);
    const searchAvailableColumnsInputRef = useRef<HTMLInputElement | null>(
      null,
    );
    const searchSelectedColumnsInputRef = useRef<HTMLInputElement | null>(null);

    const onAvailableColumnsDragStop = useCallback(
      (params: RowDragEndEvent<T>) => {
        // NOTE: here, we do not scope the columns being moved by the search
        // this is a complicated behavior to implement and it's not clear if
        // it's necessary, the current behavior is sensible in its own way.
        const columnsToMove = params.nodes
          .map((node) => node.data)
          .filter(isNonNullable);

        selector.setSelectedColumns(
          selector.selectedColumns.filter(
            (column) => !_findCol(columnsToMove, column.name),
          ),
        );
      },
      [selector],
    );

    /**
     * Since we use managed row dragging for selected columns,
     * we just need to sync the row data with the state.
     * Dragging (multiple) rows to specific position have been
     * handled by ag-grid.
     */
    const onSelectedColumnsDragStop = useCallback(
      (params: RowDragEndEvent<T>) => {
        selector.setSelectedColumns(getDataForAllNodes(params.api));
      },
      [selector],
    );

    /**
     * Since we use managed row dragging for selected columns,
     * we just need to sync the row data with the state
     * Dragging (multiple) rows to specific position have been
     * handled by ag-grid.
     */
    const onSelectedColumnsDragEnd = useCallback(
      // this event hook is mainly meant for reordering columns within
      // selected columns table
      (event: RowDragEndEvent) => {
        if (event.overIndex === -1) {
          return;
        }
        selector.setSelectedColumns(getDataForAllNodes(event.api));
      },
      [selector],
    );

    /**
     * Setup drop zones for each grid to allow moving columns between them
     * See https://www.ag-grid.com/react-data-grid/row-dragging-to-grid/
     */
    useEffect(() => {
      if (!availableColumnsGridApi || !selectedColumnsGridApi) {
        return;
      }

      const selectedColumnsDropZoneParams =
        !selectedColumnsGridApi.isDestroyed()
          ? selectedColumnsGridApi.getRowDropZoneParams({
              onDragStop: (event) => {
                onSelectedColumnsDragStop(event);
                availableColumnsGridApi.clearFocusedCell();
              },
            })
          : undefined;
      if (
        selectedColumnsDropZoneParams &&
        !availableColumnsGridApi.isDestroyed()
      ) {
        availableColumnsGridApi.addRowDropZone(selectedColumnsDropZoneParams);
      }

      const availableColumnsDropZoneParams =
        !availableColumnsGridApi.isDestroyed()
          ? availableColumnsGridApi.getRowDropZoneParams({
              onDragStop: (event) => {
                onAvailableColumnsDragStop(event);
                selectedColumnsGridApi.clearFocusedCell();
              },
            })
          : undefined;
      if (
        availableColumnsDropZoneParams &&
        !selectedColumnsGridApi.isDestroyed()
      ) {
        selectedColumnsGridApi.addRowDropZone(availableColumnsDropZoneParams);
      }
    }, [
      availableColumnsGridApi,
      selectedColumnsGridApi,
      onSelectedColumnsDragStop,
      onAvailableColumnsDragStop,
    ]);

    return (
      <div className="data-cube-column-selector flex h-full w-full">
        <div className="h-full w-[calc(50%_-_20px)]">
          <div className="flex h-5 items-center text-sm">
            Available columns:
          </div>
          <div className="h-[calc(100%_-_20px)] rounded-sm border border-neutral-200">
            <div className="relative h-6 border-b border-neutral-200">
              <input
                className="h-full w-full pl-10 pr-6 placeholder-neutral-400"
                ref={searchAvailableColumnsInputRef}
                placeholder="Search columns..."
                value={selector.availableColumnsSearchText}
                onChange={(event) =>
                  selector.setAvailableColumnsSearchText(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.code === 'Escape') {
                    event.stopPropagation();
                    searchAvailableColumnsInputRef.current?.select();
                    selector.setAvailableColumnsSearchText('');
                  }
                }}
              />
              <div className="absolute left-0 top-0 flex h-6 w-10 items-center justify-center">
                <DataCubeIcon.Search className="stroke-[3px] text-lg text-neutral-500" />
              </div>
              <button
                className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center text-neutral-500 disabled:text-neutral-300"
                disabled={!selector.availableColumnsSearchText}
                title="Clear search [Esc]"
                onClick={() => {
                  selector.setAvailableColumnsSearchText('');
                  searchAvailableColumnsInputRef.current?.focus();
                }}
              >
                <DataCubeIcon.X className="text-lg" />
              </button>
            </div>
            <div className="h-[calc(100%_-_24px)]">
              <AgGridReact
                {...getColumnsSelectorBaseGridProps<T>()}
                // Disable managed row-dragging to disallow changing the order of columns
                // and to make sure the row data and the available columns state are in sync
                rowDragManaged={false}
                onGridReady={(params) => setAvailableColumnsGridApi(params.api)}
                onSelectionChanged={(event: SelectionChangedEvent<T>) => {
                  setSelectedAvailableColumns(
                    event.api
                      .getSelectedNodes()
                      .map((node) => node.data)
                      .filter(isNonNullable),
                  );
                }}
                // Using ag-grid quick filter is a cheap way to implement search
                quickFilterText={selector.availableColumnsSearchText}
                rowData={selector.availableColumnsForDisplay}
                columnDefs={[
                  {
                    ...getColumnsSelectorBaseColumnDef<T>(),
                    /**
                     * Support double-click to add all (filtered by search) columns
                     */
                    headerComponent: (params: CustomCellRendererProps<T>) => (
                      <button
                        title="Double-click to add all columns"
                        className="flex h-full w-full items-center justify-between pl-0.5"
                        onDoubleClick={() => {
                          // The columns being moved are scoped by the current search
                          const filteredNodes = getDataForAllFilteredNodes(
                            params.api,
                          );
                          selector.setSelectedColumns([
                            ...selector.selectedColumns,
                            ...filteredNodes,
                          ]);
                          params.api.clearFocusedCell();
                        }}
                      >
                        <div>{`[All Columns]`}</div>
                        <ColumnsSearchResultCountBadge
                          selector={selector}
                          gridApi={params.api}
                          scope="available"
                        />
                      </button>
                    ),
                    cellRenderer: (params: CustomCellRendererProps<T>) => {
                      const data = params.data;
                      if (!data) {
                        return null;
                      }

                      return (
                        <div
                          className="flex h-full w-full cursor-pointer items-center"
                          title={`[${data.name}]\nDouble-click to add column`}
                          onDoubleClick={() => {
                            selector.setSelectedColumns([
                              ...selector.selectedColumns,
                              data,
                            ]);
                            params.api.clearFocusedCell();
                          }}
                        >
                          {columnLabelRenderer?.({
                            selector,
                            column: data,
                          }) ?? (
                            <div className="h-full flex-1 items-center overflow-hidden overflow-ellipsis whitespace-nowrap pl-2">
                              {data.name}
                            </div>
                          )}
                          <div className="flex h-full">
                            {columnActionRenderer?.({
                              selector,
                              column: data,
                            }) ?? null}
                          </div>
                        </div>
                      );
                    },
                  },
                ]}
              />
            </div>
          </div>
        </div>
        <div className="flex h-full w-10 items-center justify-center">
          <div className="flex flex-col">
            <button
              className="flex items-center justify-center rounded-sm border border-neutral-300 bg-neutral-100 text-neutral-500 hover:bg-neutral-200 disabled:bg-neutral-200 disabled:text-neutral-400"
              title="Add selected column(s)"
              /**
               * Support add selected (filtered by search) columns
               * We reset the selection after this operation
               */
              onClick={() => {
                if (
                  !availableColumnsGridApi ||
                  selectedAvailableColumns.length === 0
                ) {
                  return;
                }
                // The columns being moved are scoped by the current search
                const filteredNodes = getDataForAllFilteredNodes(
                  availableColumnsGridApi,
                );
                const columnsToMove = selectedAvailableColumns.filter(
                  (column) => _findCol(filteredNodes, column.name),
                );
                selector.setSelectedColumns([
                  ...selector.selectedColumns,
                  ...columnsToMove,
                ]);
                availableColumnsGridApi.clearFocusedCell();
              }}
              disabled={
                !availableColumnsGridApi ||
                selectedAvailableColumns.length === 0
              }
            >
              <DataCubeIcon.ChevronRight className="text-2xl" />
            </button>
            <button
              className="mt-2 flex items-center justify-center rounded-sm border border-neutral-300 bg-neutral-100 text-neutral-500 hover:bg-neutral-200 disabled:bg-neutral-200 disabled:text-neutral-400"
              title="Remove selected column(s)"
              /**
               * Support remove selected (filtered by search) columns
               * We reset the selection after this operation
               */
              onClick={() => {
                if (
                  !selectedColumnsGridApi ||
                  selectedSelectedColumns.length === 0
                ) {
                  return;
                }
                // The columns being moved are scoped by the current search
                const filteredNodes = getDataForAllFilteredNodes(
                  selectedColumnsGridApi,
                );
                const columnsToMove = selectedSelectedColumns.filter((column) =>
                  _findCol(filteredNodes, column.name),
                );
                selector.setSelectedColumns(
                  selector.selectedColumns.filter(
                    (column) => !_findCol(columnsToMove, column.name),
                  ),
                );
                selectedColumnsGridApi.clearFocusedCell();
              }}
              disabled={
                !selectedColumnsGridApi || selectedSelectedColumns.length === 0
              }
            >
              <DataCubeIcon.ChevronLeft className="text-2xl" />
            </button>
          </div>
        </div>
        <div className="h-full w-[calc(50%_-_20px)]">
          <div className="flex h-5 items-center text-sm">Selected columns:</div>
          <div className="h-[calc(100%_-_20px)] rounded-sm border border-neutral-200">
            <div className="relative h-6 border-b border-neutral-200">
              <input
                className="h-full w-full pl-10 placeholder-neutral-400"
                ref={searchSelectedColumnsInputRef}
                placeholder="Search columns..."
                value={selector.selectedColumnsSearchText}
                onChange={(event) =>
                  selector.setSelectedColumnsSearchText(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.code === 'Escape') {
                    event.stopPropagation();
                    selector.setSelectedColumnsSearchText('');
                  }
                }}
              />
              <div className="absolute left-0 top-0 flex h-6 w-10 items-center justify-center">
                <DataCubeIcon.Search className="stroke-[3px] text-lg text-neutral-500" />
              </div>
              <button
                className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center text-neutral-500 disabled:text-neutral-300"
                disabled={!selector.selectedColumnsSearchText}
                title="Clear search [Esc]"
                onClick={() => {
                  selector.setSelectedColumnsSearchText('');
                  searchSelectedColumnsInputRef.current?.focus();
                }}
              >
                <DataCubeIcon.X className="text-lg" />
              </button>
            </div>
            <div className="h-[calc(100%_-_24px)]">
              <AgGridReact
                {...getColumnsSelectorBaseGridProps<T>()}
                // NOTE: technically, we don't want to enable managed row-dragging here
                // but enabling this gives us free row moving management and interaction
                // comes out of the box from ag-grid, we will just sync the state with
                // grid row data afterwards to ensure consistency
                rowDragManaged={true}
                onRowDragEnd={onSelectedColumnsDragEnd}
                onGridReady={(params) => setSelectedColumnsGridApi(params.api)}
                onSelectionChanged={(event: SelectionChangedEvent<T>) => {
                  setSelectedSelectedColumns(
                    event.api
                      .getSelectedNodes()
                      .map((node) => node.data)
                      .filter(isNonNullable),
                  );
                }}
                // Using ag-grid quick filter is a cheap way to implement search
                quickFilterText={selector.selectedColumnsSearchText}
                noRowsOverlayComponentParams={{
                  noColumnsSelectedRenderer,
                }}
                rowData={selector.selectedColumnsForDisplay}
                columnDefs={[
                  {
                    ...getColumnsSelectorBaseColumnDef<T>(),
                    /**
                     * Support double-click to remove all (filtered by search) columns
                     */
                    headerComponent: (params: CustomCellRendererProps<T>) => (
                      <button
                        title="Double-click to remove all columns"
                        className="flex h-full w-full items-center justify-between pl-0.5"
                        onDoubleClick={() => {
                          // The columns being moved are scoped by the current search
                          const filteredNodes = getDataForAllFilteredNodes(
                            params.api,
                          );
                          selector.setSelectedColumns(
                            selector.selectedColumns.filter(
                              (column) => !_findCol(filteredNodes, column.name),
                            ),
                          );
                          params.api.clearFocusedCell();
                        }}
                      >
                        <div>{`[All Columns]`}</div>
                        <ColumnsSearchResultCountBadge
                          selector={selector}
                          gridApi={params.api}
                          scope="selected"
                        />
                      </button>
                    ),
                    cellRenderer: (params: CustomCellRendererProps<T>) => {
                      const data = params.data;
                      if (!data) {
                        return null;
                      }

                      return (
                        <div
                          className="flex h-full w-full cursor-pointer items-center"
                          title={`[${data.name}]\nDouble-click to remove column`}
                          onDoubleClick={() => {
                            selector.setSelectedColumns(
                              selector.selectedColumns.filter(
                                (column) => column !== data,
                              ),
                            );
                            params.api.clearFocusedCell();
                          }}
                        >
                          {columnLabelRenderer?.({
                            selector,
                            column: data,
                          }) ?? (
                            <div className="h-full flex-1 items-center overflow-hidden overflow-ellipsis whitespace-nowrap pl-2">
                              {data.name}
                            </div>
                          )}
                          <div className="flex h-full">
                            {columnActionRenderer?.({
                              selector,
                              column: data,
                            }) ?? null}
                          </div>
                        </div>
                      );
                    },
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    );
  },
);

export const DataCubeEditorColumnsSelectorSortDirectionDropdown = observer(
  (props: {
    selector: DataCubeEditorColumnsSelectorState<DataCubeEditorColumnsSelectorSortColumnState>;
    column: DataCubeEditorColumnsSelectorSortColumnState;
  }) => {
    const { column } = props;
    const [
      openDirectionDropdown,
      closeDirectionDropdown,
      directionDropdownProps,
      directionDropdownPropsOpen,
    ] = useDropdownMenu();

    return (
      <div className="group relative flex h-full items-center">
        {!directionDropdownPropsOpen && (
          <div className="flex h-[18px] w-32 items-center border border-transparent px-2 text-sm text-neutral-400 group-hover:invisible">
            {column.direction}
          </div>
        )}
        {directionDropdownPropsOpen && (
          <div className="flex h-[18px] w-32 items-center justify-between border border-sky-600 bg-sky-50 pl-2 pr-0.5 text-sm">
            <div>{column.direction}</div>
            <div>
              <DataCubeIcon.CaretDown />
            </div>
          </div>
        )}
        <button
          className="invisible absolute right-0 z-10 flex h-[18px] w-32 items-center justify-between border border-neutral-400 pl-2 pr-0.5 text-sm text-neutral-700 group-hover:visible"
          /**
           * ag-grid row select event listener is at a deeper layer than this dropdown trigger
           * so in order to prevent selecting the row while opening the dropdown, we need to stop
           * the propagation as event capturing is happening, not when it's bubbling.
           */
          onClickCapture={(event) => {
            event.stopPropagation();
            openDirectionDropdown(event);
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div>{column.direction}</div>
          <div>
            <DataCubeIcon.CaretDown />
          </div>
        </button>
        <FormDropdownMenu className="w-32" {...directionDropdownProps}>
          {[
            DataCubeQuerySortDirection.ASCENDING,
            DataCubeQuerySortDirection.DESCENDING,
          ].map((direction) => (
            <FormDropdownMenuItem
              key={direction}
              onClick={() => {
                column.setDirection(direction);
                closeDirectionDropdown();
              }}
              autoFocus={column.direction === direction}
            >
              {direction}
            </FormDropdownMenuItem>
          ))}
        </FormDropdownMenu>
      </div>
    );
  },
);
