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

export class LineageEdge {
  source: string;
  target: string;
  type: string;

  constructor(source: string = '', target: string = '', type: string = '') {
    this.source = source;
    this.target = target;
    this.type = type;
  }
}

export class LineageNode {
  id: string;
  text: string;
  type: string;

  constructor(id: string = '', text: string = '', type: string = '') {
    this.id = id;
    this.text = text;
    this.type = type;
  }
}

export class LineageGraph {
  edges: LineageEdge[];
  nodes: LineageNode[];

  constructor(edges: LineageEdge[] = [], nodes: LineageNode[] = []) {
    this.edges = edges;
    this.nodes = nodes;
  }
}

export class FunctionTreeNode {
  display: string;
  type: string;
  children?: FunctionTreeNode[] | undefined;

  constructor(
    display: string = '',
    type: string = '',
    children?: FunctionTreeNode[],
  ) {
    this.display = display;
    this.type = type;
    this.children = children;
  }
}

export class ReportLineageColumn {
  database: string;
  name: string;
  schema: string;
  table: string;

  constructor(
    database: string = '',
    name: string = '',
    schema: string = '',
    table: string = '',
  ) {
    this.database = database;
    this.name = name;
    this.schema = schema;
    this.table = table;
  }
}

export class ReportLineagePropertyTree {
  display: string;
  type: string;
  children?: ReportLineagePropertyTree[] | undefined;

  constructor(
    display: string = '',
    type: string = '',
    children?: ReportLineagePropertyTree[],
  ) {
    this.display = display;
    this.type = type;
    this.children = children;
  }
}

export class ReportLineage {
  columns: ReportLineageColumn[];
  name: string;
  propertyTree: ReportLineagePropertyTree;

  constructor(
    columns: ReportLineageColumn[] = [],
    name: string = '',
    propertyTree: ReportLineagePropertyTree = new ReportLineagePropertyTree(),
  ) {
    this.columns = columns;
    this.name = name;
    this.propertyTree = propertyTree;
  }
}

export class RelationTree {
  display: string;
  isView: boolean;

  constructor(display: string = '', isView: boolean = false) {
    this.display = display;
    this.isView = isView;
  }
}

export class SerializerInfo {
  name: string;
  version: string;

  constructor(name: string = '', version: string = '') {
    this.name = name;
    this.version = version;
  }
}
export type RawLineageModel = object;

export class LineageModel {
  classLineage?: LineageGraph | undefined;
  databaseLineage?: LineageGraph | undefined;
  functionTree?: FunctionTreeNode[] | undefined;
  relationTree?: RelationTree | undefined;
  reportLineage?: ReportLineage[] | undefined;

  constructor(
    classLineage?: LineageGraph,
    databaseLineage?: LineageGraph,
    functionTree?: FunctionTreeNode[],
    relationTree?: RelationTree,
    reportLineage?: ReportLineage[],
  ) {
    this.classLineage = classLineage;
    this.databaseLineage = databaseLineage;
    this.functionTree = functionTree;
    this.relationTree = relationTree;
    this.reportLineage = reportLineage;
  }
}
