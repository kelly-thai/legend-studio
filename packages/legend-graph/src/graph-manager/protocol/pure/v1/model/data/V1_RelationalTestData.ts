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

import { type Hashable, hashArray } from '@finos/legend-shared';
import {
  V1_EmbeddedData,
  type V1_EmbeddedDataVisitor,
} from './V1_EmbeddedData.js';
import { CORE_HASH_STRUCTURE } from '../../../../../../graph/Core_HashUtils.js';
import type {
  TestDataColumn,
  TestDataRow,
} from '../../../../../../graph/metamodel/pure/data/RelationalTestData.js';

export class V1_RelationalTestData extends V1_EmbeddedData implements Hashable {
  columns: TestDataColumn[] = [];
  rows: TestDataRow[] = [];

  accept_EmbeddedDataVisitor<T>(visitor: V1_EmbeddedDataVisitor<T>): T {
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
