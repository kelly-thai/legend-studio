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
import React, { useState, useRef } from 'react';
import {
  BlankPanelPlaceholder,
  PanelContent,
  PanelHeader,
  PlusIcon,
  TimesIcon,
  LockIcon,
  TrashIcon,
  UploadIcon,
  FileExportIcon,
  Dialog,
  clsx,
  InputWithInlineValidation,
  CustomSelectorInput,
} from '@finos/legend-art';
import { RelationElement } from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import type {
  RelationalTestDataState,
  RelationElementState,
} from '../../../../stores/editor/editor-state/element-editor-state/data/EmbeddedDataState.js';
import {
  ActionAlertActionType,
  ActionAlertType,
  useApplicationNavigationContext,
} from '@finos/legend-application';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../__lib__/LegendStudioApplicationNavigationContext.js';
import { useEditorStore } from '../../EditorStoreProvider.js';

const DATA_TYPES = ['VARCHAR', 'INTEGER', 'DECIMAL', 'DATE', 'BOOLEAN'];

const NewRelationalElementModal = observer(
  (props: { dataState: RelationalTestDataState; isReadOnly: boolean }) => {
    const { isReadOnly, dataState } = props;
    const applicationStore = dataState.editorStore.applicationStore;

    // const pathTypeOptions = ['Schema and Table', 'Ingest Dataset', 'Data Product Access Point']
    enum PathType {
      SCHEMA_TABLE = 'Schema and Table',
      INGEST_DATASET = 'Ingest Dataset',
      DATAPRODUCT = 'Data Product Access Point',
    }
    interface PathTypeOption {
      value: PathType;
      label: string;
    }
    const pathTypeOptions = Object.values(PathType).map((type) => ({
      label: type, // Display label
      value: type, // Actual value
    }));
    const [pathType, setPathType] = useState<PathTypeOption | undefined>(
      pathTypeOptions[0],
    );
    const onPathTypeChange = (val: PathTypeOption): void => {
      setPathType(val);
    };

    //table/schema
    const [schemaName, setSchemaName] = useState<string | undefined>();
    const [tableName, setTableName] = useState<string | undefined>();
    const changeSchemaValue: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      setSchemaName(event.target.value);
    };
    const changeTableValue: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      setTableName(event.target.value);
    };

    //path
    const [pathValue, setPathValue] = useState<string | undefined>();
    const changePathValue: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      setPathValue(event.target.value);
    };

    const closeModal = (): void =>
      dataState.setShowNewRelationalElementModal(false);
    const handleSubmit = (): void => {
      const path: string[] = [];
      if (
        pathType &&
        pathType.value === PathType.SCHEMA_TABLE &&
        schemaName &&
        tableName
      ) {
        path[0] = schemaName;
        path[1] = tableName;
      } else if (pathType && pathValue) {
        path[0] = pathValue;
      }
      const relationalElement = new RelationElement();
      relationalElement.paths = path;

      dataState.addRelationElement(relationalElement);
      closeModal();
    };

    return (
      <Dialog
        open={dataState.showNewRelationalElementModal}
        onClose={closeModal}
        classes={{ container: 'search-modal__container' }}
        PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
            closeModal();
          }}
          className="modal modal--dark search-modal"
        >
          <div className="modal__title">Add Relational Element</div>
          <div className="relational-data-editor__identifier">
            <div className="relational-data-editor__identifier__values">
              <CustomSelectorInput //KXT TODO maybe cahnge styling here? looks a lil off
                className="explorer__new-element-modal__driver__dropdown"
                options={pathTypeOptions}
                onChange={onPathTypeChange}
                value={pathType}
                isClearable={false}
                darkMode={
                  !applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled
                }
              />
            </div>
            {pathType?.value === PathType.SCHEMA_TABLE ? (
              <>
                <div className="relational-data-editor__identifier__values">
                  <input
                    className="panel__content__form__section__input"
                    disabled={isReadOnly}
                    placeholder="schemaName"
                    value={schemaName}
                    onChange={changeSchemaValue}
                  />
                </div>
                <div className="relational-data-editor__identifier__values">
                  <input
                    className="relational-data-editor__identifier__values panel__content__form__section__input"
                    disabled={isReadOnly}
                    placeholder="tableName"
                    value={tableName}
                    onChange={changeTableValue}
                  />
                </div>
              </>
            ) : (
              <div className="relational-data-editor__identifier__values">
                <input
                  className="relational-data-editor__identifier__values panel__content__form__section__input"
                  disabled={isReadOnly}
                  placeholder="path"
                  value={pathValue}
                  onChange={changePathValue}
                />
              </div>
            )}
          </div>
          <div className="search-modal__actions">
            <button
              className="btn btn--dark"
              disabled={isReadOnly} //KXT TODO add check to make sure fields are filled out
            >
              Add
            </button>
          </div>
        </form>
      </Dialog>
    );
  },
);

const RelationElementEditor = observer(
  (props: {
    relationElementState: RelationElementState;
    isReadOnly: boolean;
  }) => {
    const { relationElementState, isReadOnly } = props;
    const editorStore = useEditorStore();
    const embeddedData = relationElementState.relationElement;
    const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'sql'>(
      'json',
    );
    const fileInputRef = useRef<HTMLInputElement>(null);

    const addColumn = (): void => {
      if (!isReadOnly) {
        const columnName = `column_${embeddedData.columns.length + 1}`;
        relationElementState.addColumn(columnName);
      }
    };

    const removeColumn = (index: number): void => {
      if (!isReadOnly) {
        relationElementState.removeColumn(index);
      }
    };

    const updateColumn = (index: number, value: string): void => {
      if (!isReadOnly) {
        const column = embeddedData.columns[index];
        if (column) {
          relationElementState.updateColumn(index, value);
        }
      }
    };

    const addRow = (): void => {
      if (!isReadOnly) {
        relationElementState.addRow();
      }
    };

    const removeRow = (index: number): void => {
      if (!isReadOnly) {
        relationElementState.removeRow(index);
      }
    };

    const updateCellValue = (
      rowIndex: number,
      columnIndex: number,
      value: string,
    ): void => {
      if (!isReadOnly) {
        relationElementState.updateRow(rowIndex, columnIndex, value);
      }
    };

    const handleFileUpload = (
      event: React.ChangeEvent<HTMLInputElement>,
    ): void => {
      const file = event.target.files?.[0];
      if (file && file.type === 'text/csv') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const csvContent = e.target?.result as string;
          if (csvContent) {
            relationElementState.importCSV(csvContent);
          }
        };
        reader.readAsText(file);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    const exportData = (): void => {
      let content = '';
      let filename = '';
      let mimeType = '';

      switch (exportFormat) {
        case 'json':
          content = relationElementState.exportJSON();
          filename = 'test_data.json';
          mimeType = 'application/json';
          break;
        case 'csv':
          content = relationElementState.exportCSV();
          filename = 'test_data.csv';
          mimeType = 'text/csv';
          break;
        case 'sql':
          content = relationElementState.exportSQL();
          filename = 'test_data.sql';
          mimeType = 'text/sql';
          break;
        default:
          content = relationElementState.exportJSON();
          filename = 'test_data.json';
          mimeType = 'application/json';
          break;
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    const handleClearData = (): void => {
      editorStore.applicationStore.alertService.setActionAlertInfo({
        message: 'Are you sure you want to clear all test data?',
        type: ActionAlertType.CAUTION,
        actions: [
          {
            label: 'Confirm',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler: (): void => {
              relationElementState.clearAllData();
            },
          },
          {
            label: 'Cancel',
            type: ActionAlertActionType.PROCEED,
            default: true,
          },
        ],
      });
    };

    return (
      <div className="relational-test-data-editor__content">
        <div className="relational-test-data-editor__columns">
          <div className="relational-test-data-editor__section-header">
            <div className="relational-test-data-editor__section-title">
              Column Definitions
            </div>
            <button
              className="btn--icon btn--dark btn--sm"
              onClick={addColumn}
              disabled={isReadOnly}
              title="Add Column"
            >
              <PlusIcon />
            </button>
          </div>
          <div className="relational-test-data-editor__columns-grid">
            {embeddedData.columns.map((column, index) => (
              <div
                key={`column-${guaranteeNonNullable(index)}`}
                className="relational-test-data-editor__column-row"
              >
                <input
                  className="relational-test-data-editor__column-input"
                  type="text"
                  value={column}
                  onChange={(e) => updateColumn(index, e.target.value)}
                  placeholder="Column Name"
                  disabled={isReadOnly}
                />
                <button
                  className="btn--icon btn--caution btn--dark btn--sm"
                  onClick={() => removeColumn(index)}
                  disabled={isReadOnly}
                  title="Remove Column"
                >
                  <TimesIcon />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="relational-test-data-editor__data">
          <div className="relational-test-data-editor__section-header">
            <div className="relational-test-data-editor__section-title">
              Test Data ({embeddedData.rows.length} rows)
            </div>
          </div>
          {embeddedData.rows.length === 0 ? (
            <div className="relational-test-data-editor__empty-data">
              <div className="relational-test-data-editor__empty-text">
                No test data rows. Click &quot;+&quot; below to start entering
                data.
              </div>
            </div>
          ) : (
            <div className="relational-test-data-editor__data-grid">
              <div className="relational-test-data-editor__data-header">
                {embeddedData.columns.map((column) => (
                  <div
                    key={column}
                    className="relational-test-data-editor__data-header-cell"
                  >
                    {column}
                    {/* <span className="relational-test-data-editor__data-type">
                  ({column.type})
                </span> */}
                  </div>
                ))}
                <div className="relational-test-data-editor__data-header-cell relational-test-data-editor__data-actions">
                  Actions
                </div>
              </div>
              {embeddedData.rows.map((row, rowIndex) => (
                <div
                  key={`row-${guaranteeNonNullable(rowIndex)}`}
                  className="relational-test-data-editor__data-row"
                >
                  {embeddedData.columns.map((column, columnIndex) => (
                    <div
                      key={column}
                      className="relational-test-data-editor__data-cell"
                    >
                      <input
                        type="text"
                        value={row.rowValues[columnIndex] ?? ''}
                        onChange={(e) =>
                          updateCellValue(rowIndex, columnIndex, e.target.value)
                        }
                        disabled={isReadOnly}
                        className="relational-test-data-editor__data-input"
                      />
                    </div>
                  ))}
                  <div className="relational-test-data-editor__data-cell relational-test-data-editor__data-actions">
                    <button
                      className="btn--icon btn--caution btn--dark btn--sm"
                      onClick={() => removeRow(rowIndex)}
                      disabled={isReadOnly}
                      title="Remove Row"
                    >
                      <TimesIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="relational-test-data-editor__export-controls">
            <div className="relational-test-data-editor__export-controls__btn-group">
              <button
                className="btn--icon btn--dark btn--sm"
                onClick={addRow}
                disabled={isReadOnly || embeddedData.columns.length === 0}
                title="Add Row"
              >
                <PlusIcon />
              </button>

              <button
                className="btn--icon btn--caution btn--dark btn--sm"
                onClick={handleClearData}
                disabled={isReadOnly || embeddedData.rows.length === 0}
                title="Clear All Data"
              >
                <TrashIcon />
              </button>
            </div>
            <div className="relational-test-data-editor__export-format">
              <label htmlFor="exportFormat">Export as:</label>
              <select
                id="exportFormat"
                value={exportFormat}
                onChange={(e) =>
                  setExportFormat(e.target.value as 'json' | 'csv' | 'sql')
                }
                disabled={isReadOnly}
                className="relational-test-data-editor__export-select"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="sql">SQL INSERT</option>
              </select>
              <button
                className="btn--icon btn--dark btn--sm"
                onClick={exportData}
                disabled={isReadOnly}
                title={`Export as ${exportFormat.toUpperCase()}`}
              >
                <FileExportIcon />
              </button>
            </div>

            <div className="relational-test-data-editor__import-controls">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                disabled={isReadOnly}
              />
              <button
                className="btn--icon btn--dark btn--sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isReadOnly}
                title="Upload a file of CSV"
              >
                <UploadIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

export const RelationalTestDataEditor = observer(
  (props: { dataState: RelationalTestDataState; isReadOnly: boolean }) => {
    const { dataState, isReadOnly } = props;
    const embeddedData = dataState.embeddedData;

    useApplicationNavigationContext(
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.EMBEDDED_DATA_RELATIONAL_EDITOR,
    );

    //KXT TODO do i abstract 'Relation Element' away from user?
    const addRelationElement = (): void => {
      dataState.setShowNewRelationalElementModal(true);
    };

    const changeRelationElement = (
      newRelationElement: RelationElementState,
    ): void => {
      dataState.setActiveRelationElement(newRelationElement);
      console.log('updated active state to this: ');
    };

    return (
      <div className="panel relational-test-data-editor">
        <PanelHeader>
          <div className="panel__header__title">
            {isReadOnly && (
              <div className="panel__header__lock">
                <LockIcon />
              </div>
            )}
            <div className="panel__header__title__label">
              {dataState.label()}
            </div>
          </div>
        </PanelHeader>
        <PanelContent>
          <div className="panel__header service-editor__header--with-tabs">
            <div className="uml-element-editor__tabs">
              {dataState.relationElementStates.map((relationElement) => (
                <div
                  // key={tab.relationElement}
                  onClick={(): void => changeRelationElement(relationElement)}
                  className={clsx('service-editor__tab', {
                    'service-editor__tab--active':
                      relationElement === dataState.activeRelationElement,
                  })}
                >
                  {relationElement.relationElement.paths.length > 1 ? (
                    <span>
                      {relationElement.relationElement.paths.join('.')}
                    </span>
                  ) : (
                    <span>{relationElement.relationElement.paths[0]}</span>
                  )}
                </div>
              ))}
            </div>
            <button
              // className="btn--icon btn--dark btn--sm"
              onClick={addRelationElement}
              disabled={isReadOnly}
              title="Add Relation Element"
            >
              <PlusIcon />
            </button>
          </div>
          {embeddedData.relationElements.length === 0 ? ( //KXT TODO track states not embedded data
            <BlankPanelPlaceholder
              text="Add a relation element to define your test data structure"
              onClick={addRelationElement}
              clickActionType="add"
              tooltipText="Add Relation Element"
              disabled={isReadOnly}
            />
          ) : (
            // <RelationElementEditor />
            <RelationElementEditor
              relationElementState={dataState.activeRelationElement!} //KXT handle undefined here
              isReadOnly={isReadOnly}
            />
          )}
        </PanelContent>
        {dataState.showNewRelationalElementModal && (
          <NewRelationalElementModal
            dataState={dataState}
            isReadOnly={isReadOnly}
          />
        )}
      </div>
    );
  },
);
