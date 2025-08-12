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

import {
  type Hashable,
  hashArray,
  SerializationFactory,
  usingConstantValueSchema,
} from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../graph/Core_HashUtils.js';
import { type EmbeddedDataVisitor, EmbeddedData } from './EmbeddedData.js';
import { createModelSchema, primitive } from 'serializr';

export class TestDataColumn {
  name!: string;
  type!: string;

  // get hashCode(): string {
  //   return hashArray([this.name, this.type]);
  // }
  static readonly serialization = new SerializationFactory(
    createModelSchema(TestDataColumn, {
      _type: usingConstantValueSchema('testDataColumn'),
      name: primitive(),
      type: primitive(),
    }),
  );
}

export interface TestDataRow {
  [columnName: string]: string;
}

export class RelationalTestData extends EmbeddedData implements Hashable {
  //KXT does this need to be renamed?
  columns: TestDataColumn[] = [];
  rows: TestDataRow[] = [];

  accept_EmbeddedDataVisitor<T>(visitor: EmbeddedDataVisitor<T>): T {
    return visitor.visit_RelationalTestData(this);
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_TEST_DATA,
      //KXT double check if this is right
      hashArray(
        this.columns.map((column) => hashArray([column.name, column.type])),
      ),
      hashArray(
        this.rows.map((row) =>
          hashArray(
            Object.entries(row).map(([columnName, value]) =>
              hashArray([columnName, value]),
            ),
          ),
        ),
      ),
    ]);
  }
}
