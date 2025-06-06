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

import { action, computed, makeObservable, observable, override } from 'mobx';
import type { DataCubeViewState } from '../DataCubeViewState.js';
import type { DisplayState } from '../../services/DataCubeLayoutService.js';
import { DataCubeColumnCreator } from '../../../components/view/extend/DataCubeColumnEditor.js';
import { editor as monacoEditorAPI, Uri } from 'monaco-editor';
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  hasWhiteSpace,
  uuid,
  type PlainObject,
} from '@finos/legend-shared';
import { buildExecutableQuery } from '../../core/DataCubeQueryBuilder.js';
import {
  DataCubeColumnDataType,
  DataCubeColumnKind,
  DEFAULT_LAMBDA_VARIABLE_NAME,
  getDataType,
  isPrimitiveType,
} from '../../core/DataCubeQueryEngine.js';
import {
  CODE_EDITOR_LANGUAGE,
  setErrorMarkers,
} from '@finos/legend-code-editor';
import type { DataCubeExtendManagerState } from './DataCubeExtendManagerState.js';
import {
  EngineError,
  V1_Lambda,
  type V1_ValueSpecification,
} from '@finos/legend-graph';
import type { DataCubeColumnConfiguration } from '../../core/model/DataCubeConfiguration.js';
import type { DataCubeSnapshotExtendedColumn } from '../../core/DataCubeSnapshot.js';
import { _lambda } from '../../core/DataCubeQueryBuilderUtils.js';
import { _findCol } from '../../core/model/DataCubeColumn.js';
import { DataCubeCodeEditorState } from '../../../components/view/extend/DataCubeCodeEditorState.js';
import type { DataCubeSource } from '../../core/model/DataCubeSource.js';

export abstract class DataCubeColumnBaseEditorState extends DataCubeCodeEditorState {
  protected override readonly uuid = uuid();
  protected readonly _manager: DataCubeExtendManagerState;
  readonly view: DataCubeViewState;

  // NOTE: use UUID in the column name to prevent collision
  // when parsing/compiling the expression
  private readonly _name = `col_${this.uuid.replaceAll('-', '_')}`;
  readonly display: DisplayState;
  readonly validationState = ActionState.create();

  name: string;
  expectedType: string;
  isGroupLevel: boolean;
  columnKind?: DataCubeColumnKind | undefined;

  codeSuffix: string;

  override model: DataCubeSource;
  queryLambda: () => V1_Lambda;

  constructor(
    manager: DataCubeExtendManagerState,
    name: string,
    expectedType: string,
    isGroupLevel: boolean,
    columnKind: DataCubeColumnKind | undefined,
  ) {
    super(manager.view.engine);
    makeObservable(this, {
      name: observable,
      setName: action,
      isNameValid: computed,

      expectedType: observable,
      setExpectedType: action,
      isTypeValid: computed,

      isGroupLevel: observable,
      columnKind: observable,
      setColumnKind: action,

      editor: observable.ref,
      setEditor: action,

      codeError: observable.ref,
      showError: action,
      clearError: action,

      returnType: observable,
      setReturnType: action,
    });

    this._manager = manager;
    this.view = manager.view;
    this.model = manager.view.source;
    this.engine = this.view.engine;
    this.display = this.newDisplay(this);

    this.name = name;
    this.expectedType = expectedType;
    this.isGroupLevel = isGroupLevel;
    this.columnKind = columnKind;

    this.codePrefix = `->extend(~${this._name}:`;
    this.codeSuffix = `)`;

    this.editorModelUri = Uri.file(`/${this.uuid}.pure`);
    this.editorModel = monacoEditorAPI.createModel(
      '',
      CODE_EDITOR_LANGUAGE.PURE,
      this.editorModelUri,
    );
    this.queryLambda = this.buildExtendBaseQuery;
  }

  alertHandler = (error: Error): void => {
    this.view.dataCube.alertService.alertUnhandledError(error);
  };

  abstract getInitialCode(): Promise<string>;

  async initialize() {
    this.code = await this.getInitialCode();
    this.editorModel.setValue(this.code);
  }

  protected abstract newDisplay(
    state: DataCubeColumnBaseEditorState,
  ): DisplayState;

  setName(value: string) {
    this.name = value;
  }

  get isNameValid(): boolean {
    return !this._manager.allColumnNames.includes(this.name);
  }

  setExpectedType(value: string) {
    this.expectedType = value;
  }

  get isTypeValid() {
    return (
      this.returnType !== undefined &&
      this.expectedType === getDataType(this.returnType)
    );
  }

  setColumnKind(
    isGroupLevel: boolean,
    columnKind: DataCubeColumnKind | undefined,
  ) {
    this.isGroupLevel = isGroupLevel;
    this.columnKind = columnKind;
  }

  showError(error: EngineError) {
    this.codeError = error;
    if (error.sourceInformation) {
      setErrorMarkers(
        this.editorModel,
        [
          {
            message: error.message,
            startLineNumber: error.sourceInformation.startLine,
            startColumn: error.sourceInformation.startColumn,
            endLineNumber: error.sourceInformation.endLine,
            endColumn: error.sourceInformation.endColumn,
          },
        ],
        this.uuid,
      );
    }
  }

  buildExtendBaseQuery = () => {
    const currentSnapshot = guaranteeNonNullable(
      this._manager.getLatestSnapshot(),
    );
    const snapshot = currentSnapshot.clone();
    if (!this.isGroupLevel) {
      snapshot.data.leafExtendedColumns = [];
      snapshot.data.selectColumns = [];
      snapshot.data.filter = undefined;
      snapshot.data.groupBy = undefined;
      snapshot.data.pivot = undefined;
    }
    snapshot.data.groupExtendedColumns = [];
    snapshot.data.sortColumns = [];
    snapshot.data.limit = undefined;
    return _lambda(
      [],
      [
        buildExecutableQuery(snapshot, this.view.source, this.view.engine, {
          skipExecutionContext: true,
        }),
      ],
    );
  };

  async getReturnType() {
    this.validationState.inProgress();

    // properly reset the error state before revalidating
    this.clearError();
    this.setReturnType(undefined);

    try {
      const returnRelationType =
        await this.view.engine.getQueryCodeRelationReturnType(
          this.codePrefix + this.code + this.codeSuffix,
          this.buildExtendBaseQuery(),
          this.view.source,
        );
      let returnType = _findCol(returnRelationType.columns, this._name)?.type;
      returnType =
        returnType && isPrimitiveType(returnType) ? returnType : undefined;
      this.setReturnType(returnType);
      return returnType;
    } catch (error) {
      assertErrorThrown(error);
      if (error instanceof EngineError) {
        this.validationState.fail();
        // correct the source information since we added prefix to the code
        // and reveal error in the editor
        if (error.sourceInformation) {
          error.sourceInformation.startColumn -=
            error.sourceInformation.startLine === 1
              ? this.codePrefix.length
              : 0;
          error.sourceInformation.endColumn -=
            error.sourceInformation.endLine === 1 ? this.codePrefix.length : 0;
          const fullRange = this.editorModel.getFullModelRange();
          if (
            error.sourceInformation.startLine < 1 ||
            (error.sourceInformation.startLine === 1 &&
              error.sourceInformation.startColumn < 1) ||
            error.sourceInformation.endLine > fullRange.endLineNumber ||
            (error.sourceInformation.endLine === fullRange.endLineNumber &&
              error.sourceInformation.endColumn > fullRange.endColumn)
          ) {
            error.sourceInformation.startColumn = fullRange.startColumn;
            error.sourceInformation.startLine = fullRange.startLineNumber;
            error.sourceInformation.endColumn = fullRange.endColumn;
            error.sourceInformation.endLine = fullRange.endLineNumber;
          }
        }
        this.showError(error);
        return undefined;
      }
      this.view.dataCube.alertService.alertError(error, {
        message: `Expression Validation Failure: ${error.message}`,
      });
    } finally {
      this.validationState.complete();
    }

    return undefined;
  }

  abstract applyChanges(): Promise<void>;

  close() {
    // dispose the editor and its model to avoid memory leak
    this.editorModel.dispose();
    this.editor?.dispose();

    this.display.close();
  }
}

export class DataCubeNewColumnState extends DataCubeColumnBaseEditorState {
  private initialCode: string;

  constructor(
    manager: DataCubeExtendManagerState,
    referenceColumn?: DataCubeColumnConfiguration | undefined,
  ) {
    super(
      manager,
      `col_${manager.allColumnNames.length + 1}`,
      referenceColumn
        ? getDataType(referenceColumn.type)
        : DataCubeColumnDataType.NUMBER,
      false,
      referenceColumn ? referenceColumn.kind : DataCubeColumnKind.MEASURE,
    );

    this.initialCode = referenceColumn
      ? hasWhiteSpace(referenceColumn.name)
        ? `${DEFAULT_LAMBDA_VARIABLE_NAME}|$${DEFAULT_LAMBDA_VARIABLE_NAME}.'${referenceColumn.name}'`
        : `${DEFAULT_LAMBDA_VARIABLE_NAME}|$${DEFAULT_LAMBDA_VARIABLE_NAME}.${referenceColumn.name}`
      : `${DEFAULT_LAMBDA_VARIABLE_NAME}|`;
  }

  override async getInitialCode(): Promise<string> {
    return this.initialCode;
  }

  override newDisplay(state: DataCubeColumnBaseEditorState): DisplayState {
    return this.view.dataCube.layoutService.newDisplay(
      'Add New Column',
      () => <DataCubeColumnCreator state={this} />,
      {
        x: 50,
        y: 50,
        width: 500,
        height: 300,
        minWidth: 300,
        minHeight: 200,
        center: false,
      },
    );
  }

  override async applyChanges() {
    if (
      !this.validationState.hasCompleted ||
      !this.isNameValid ||
      !this.isTypeValid
    ) {
      return;
    }

    this.finalizationState.inProgress();

    let query: V1_ValueSpecification;
    let returnType: string | undefined;
    try {
      [query, returnType] = await Promise.all([
        this.view.engine.parseValueSpecification(this.code, false),
        this.getReturnType(), // recompile to get the return type
      ]);
    } catch (error) {
      assertErrorThrown(error);
      this.view.dataCube.alertService.alertError(error, {
        message: `Expression Validation Failure: ${error.message}`,
      });
      return;
    } finally {
      this.finalizationState.complete();
    }

    if (!(query instanceof V1_Lambda)) {
      this.view.dataCube.alertService.alertError(new Error(), {
        message: `Expression Validation Failure: Expression must be a lambda.`,
      });
      return;
    }

    if (!returnType) {
      this.view.dataCube.alertService.alertError(new Error(), {
        message: `Expression Validation Failure: Can't compute expression return type.`,
      });
      return;
    }

    this._manager.addNewColumn(
      {
        name: this.name,
        type: returnType,
        mapFn: this.view.engine.serializeValueSpecification(query),
      },
      this.isGroupLevel,
      this.columnKind,
      this,
    );

    this.close();
  }
}

export class DataCubeExistingColumnEditorState extends DataCubeColumnBaseEditorState {
  readonly initialData: {
    name: string;
    type: string;
    kind: DataCubeColumnKind;
    isGroupLevel: boolean;
    mapFn: PlainObject<V1_Lambda>;
  };

  constructor(
    manager: DataCubeExtendManagerState,
    column: DataCubeSnapshotExtendedColumn,
    kind: DataCubeColumnKind,
    isGroupLevel: boolean,
  ) {
    super(manager, column.name, getDataType(column.type), isGroupLevel, kind);

    makeObservable(this, {
      initialData: observable.ref,
      isNameValid: override,
    });

    this.initialData = {
      name: column.name,
      type: column.type,
      kind,
      isGroupLevel: isGroupLevel,
      mapFn: column.mapFn,
    };
  }

  override get isNameValid(): boolean {
    return !this._manager.allColumnNames
      .filter((colName) => colName !== this.initialData.name)
      .includes(this.name);
  }

  override async getInitialCode(): Promise<string> {
    return this.view.engine.getValueSpecificationCode(
      this.view.engine.deserializeValueSpecification(this.initialData.mapFn),
      true,
    );
  }

  override newDisplay(state: DataCubeColumnBaseEditorState): DisplayState {
    return this.view.dataCube.layoutService.newDisplay(
      'Edit Column',
      () => <DataCubeColumnCreator state={this} />,
      {
        x: 50,
        y: 50,
        width: 500,
        height: 300,
        minWidth: 300,
        minHeight: 200,
        center: false,
      },
    );
  }

  async reset() {
    this.setName(this.initialData.name);
    this.setExpectedType(getDataType(this.initialData.type));
    this.setColumnKind(this.initialData.isGroupLevel, this.initialData.kind);
    await this.initialize();
    await this.getReturnType();
  }

  override async applyChanges() {
    if (
      !this.validationState.hasCompleted ||
      !this.isNameValid ||
      !this.isTypeValid
    ) {
      return;
    }

    this.finalizationState.inProgress();

    let query: V1_ValueSpecification;
    let returnType: string | undefined;
    try {
      [query, returnType] = await Promise.all([
        this.view.engine.parseValueSpecification(this.code, false),
        this.getReturnType(), // recompile to get the return type
      ]);
    } catch (error) {
      assertErrorThrown(error);
      this.view.dataCube.alertService.alertError(error, {
        message: `Expression Validation Failure: ${error.message}`,
      });
      return;
    } finally {
      this.finalizationState.complete();
    }

    if (!(query instanceof V1_Lambda)) {
      this.view.dataCube.alertService.alertError(new Error(), {
        message: `Expression Validation Failure: Expression must be a lambda.`,
      });
      return;
    }

    if (!returnType) {
      this.view.dataCube.alertService.alertError(new Error(), {
        message: `Expression Validation Failure: Can't compute expression return type.`,
      });
      return;
    }

    await this._manager.updateColumn(
      this.initialData.name,
      {
        name: this.name,
        type: returnType,
        mapFn: this.view.engine.serializeValueSpecification(query),
      },
      this.isGroupLevel,
      this.columnKind,
    );
  }
}
