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

import { action, makeObservable, observable } from 'mobx';
import {
  ActionState,
  assertErrorThrown,
  IllegalStateError,
  UnsupportedOperationError,
  type PlainObject,
} from '@finos/legend-shared';
import { LegendQueryDataCubeSourceBuilderState } from './source/LegendQueryDataCubeSourceBuilderState.js';
import type { LegendDataCubeApplicationStore } from '../LegendDataCubeBaseStore.js';
import {
  LegendDataCubeSourceBuilderType,
  type LegendDataCubeSourceBuilderState,
} from './source/LegendDataCubeSourceBuilderState.js';
import {
  type DataCubeAlertService,
  DEFAULT_TOOL_PANEL_WINDOW_CONFIG,
  type DisplayState,
} from '@finos/legend-data-cube';
import type { LegendDataCubeDataCubeEngine } from '../LegendDataCubeDataCubeEngine.js';
import { LegendDataCubeCreator } from '../../components/builder/LegendDataCubeCreator.js';
import { FreeformTDSExpressionDataCubeSourceBuilderState } from './source/FreeformTDSExpressionDataCubeSourceBuilderState.js';
import {
  LegendDataCubeBuilderState,
  type LegendDataCubeBuilderStore,
} from './LegendDataCubeBuilderStore.js';
import { generateBuilderRoute } from '../../__lib__/LegendDataCubeNavigation.js';
import { LocalFileDataCubeSourceBuilderState } from './source/LocalFileDataCubeSourceBuilderState.js';
import { UserDefinedFunctionDataCubeSourceBuilderState } from './source/UserDefinedFunctionDataCubeSourceBuilderState.js';
import { LEGEND_DATACUBE_APP_EVENT } from '../../__lib__/LegendDataCubeEvent.js';

const DEFAULT_SOURCE_TYPE = LegendDataCubeSourceBuilderType.LEGEND_QUERY;

export class LegendDataCubeCreatorState {
  private readonly _application: LegendDataCubeApplicationStore;
  private readonly _store: LegendDataCubeBuilderStore;
  private readonly _engine: LegendDataCubeDataCubeEngine;
  private readonly _alertService: DataCubeAlertService;

  readonly finalizeState = ActionState.create();
  readonly display: DisplayState;

  sourceBuilder: LegendDataCubeSourceBuilderState;

  constructor(store: LegendDataCubeBuilderStore) {
    makeObservable(this, {
      sourceBuilder: observable,
      changeSourceBuilder: action,
    });

    this._application = store.application;
    this._store = store;
    this._engine = store.engine;
    this._alertService = store.alertService;

    this.display = store.layoutService.newDisplay(
      'New DataCube',
      () => <LegendDataCubeCreator />,
      {
        ...DEFAULT_TOOL_PANEL_WINDOW_CONFIG,
        width: 500,
        minWidth: 500,
      },
    );

    this.sourceBuilder = this.createSourceBuilder(DEFAULT_SOURCE_TYPE);
  }

  changeSourceBuilder(
    type: LegendDataCubeSourceBuilderType,
    skipCheck?: boolean | undefined,
  ): void {
    if (this.sourceBuilder.label !== type || skipCheck) {
      this.sourceBuilder = this.createSourceBuilder(type);
    }
  }

  private createSourceBuilder(
    type: LegendDataCubeSourceBuilderType,
  ): LegendDataCubeSourceBuilderState {
    switch (type) {
      case LegendDataCubeSourceBuilderType.LEGEND_QUERY:
        return new LegendQueryDataCubeSourceBuilderState(
          this._application,
          this._engine,
          this._store.engineServerClient,
          this._store.depotServerClient,
          this._store.graphManager,
          this._alertService,
        );
      case LegendDataCubeSourceBuilderType.FREEFORM_TDS_EXPRESSION:
        return new FreeformTDSExpressionDataCubeSourceBuilderState(
          this._application,
          this._engine,
          this._alertService,
          this._store,
        );
      case LegendDataCubeSourceBuilderType.LOCAL_FILE:
        return new LocalFileDataCubeSourceBuilderState(
          this._application,
          this._engine,
          this._alertService,
        );
      case LegendDataCubeSourceBuilderType.USER_DEFINED_FUNCTION:
        return new UserDefinedFunctionDataCubeSourceBuilderState(
          this._application,
          this._engine,
          this._alertService,
          this._store,
        );
      default:
        throw new UnsupportedOperationError(
          `Can't create source builder for unsupported type '${type}'`,
        );
    }
  }

  async finalize(sourceData?: PlainObject) {
    if (!sourceData && !this.sourceBuilder.isValid) {
      throw new IllegalStateError(
        `Can't generate DataCube: source is not valid`,
      );
    }

    this.finalizeState.inProgress();
    try {
      sourceData =
        sourceData ?? (await this.sourceBuilder.generateSourceData());
      try {
        const source = await this._engine.processSource(sourceData);
        const specification = await this._engine.generateBaseSpecification(
          sourceData,
          source,
        );
        if (specification.configuration) {
          this.sourceBuilder.finalizeConfiguration(specification.configuration);
        }

        // reset
        this._store.setBuilder(
          new LegendDataCubeBuilderState(this._store, specification),
        );
        // only update the route instead of reloading in case we are creating
        // a new DataCube when we are editing another DataCube
        this._application.navigationService.navigator.updateCurrentLocation(
          generateBuilderRoute(null),
        );
        this.changeSourceBuilder(DEFAULT_SOURCE_TYPE, true);
        this.display.close();
        this.finalizeState.pass();
        this._engine.sendTelemetry(
          LEGEND_DATACUBE_APP_EVENT.NEW_DATACUBE__SUCCESS,
          this._engine.getDataFromSource(source),
        );
      } catch (error) {
        assertErrorThrown(error);
        const message = `DataCube Creation Failure: ${error.message}`;
        this._engine.sendTelemetry(
          LEGEND_DATACUBE_APP_EVENT.NEW_DATACUBE__FAILURE,
          { ...this._engine.getDataFromRawSource(sourceData), error: message },
        );
        this._alertService.alertError(error, {
          message: message,
        });
        this.finalizeState.fail();
      }
    } catch (error) {
      assertErrorThrown(error);
      const message = `DataCube Creation Failure: ${error.message}`;
      this._engine.sendTelemetry(
        LEGEND_DATACUBE_APP_EVENT.NEW_DATACUBE__FAILURE,
        { error: message },
      );
      this._alertService.alertError(error, {
        message: message,
      });
      this.finalizeState.fail();
    }
  }
}
