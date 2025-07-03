/**
 * Copyright (c) 2025-present, Goldman Sachs
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

import { useEffect, useState } from 'react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  PanelHeader,
  PanelContent,
  clsx,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import { isNonNullable } from '@finos/legend-shared';

// Helper function to convert lineage data to React Flow nodes and edges
const convertLineageToFlow = (lineage: any) => {
  const nodes = lineage.nodes.map((node: any) => ({
    id: node.id,
    data: { label: node.text || node.id },
    position: { x: Math.random() * 500, y: Math.random() * 500 }, // Random positions for simplicity
    type: 'default',
  }));

  const edges = lineage.edges.map((edge: any) => ({
    id: `${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    label: edge.type,
    type: 'default',
  }));

  return { nodes, edges };
};

// Graph Viewer Component
const LineageGraphViewer = observer((props: { nodes: any[]; edges: any[] }) => {
  const { nodes, edges } = props;

  return (
    <ReactFlow nodes={nodes} edges={edges} fitView style={{ height: '100%' }}>
      <Background />
      <MiniMap />
      <Controls />
    </ReactFlow>
  );
});

// Main Viewer Content
const LineageViewerContent = observer((props: { lineageState: any }) => {
  const { lineageState } = props;
  const selectedTab = lineageState.selectedTab;
  const lineageData = lineageState.lineageData;

  // Convert lineage data to React Flow format
  const classLineageFlow = convertLineageToFlow(lineageData.classLineage);
  const databaseLineageFlow = convertLineageToFlow(lineageData.databaseLineage);
  const reportLineageFlow = convertLineageToFlow(lineageData.reportLineage);

  const renderGraph = () => {
    switch (selectedTab) {
      case 'CLASS_LINEAGE':
        return (
          <LineageGraphViewer
            nodes={classLineageFlow.nodes}
            edges={classLineageFlow.edges}
          />
        );
      case 'DATABASE_LINEAGE':
        return (
          <LineageGraphViewer
            nodes={databaseLineageFlow.nodes}
            edges={databaseLineageFlow.edges}
          />
        );
      case 'REPORT_LINEAGE':
        return (
          <LineageGraphViewer
            nodes={reportLineageFlow.nodes}
            edges={reportLineageFlow.edges}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="lineage-viewer__content">
      <ResizablePanelGroup orientation="vertical">
        <ResizablePanel>
          <div className="panel lineage-viewer__graph">
            <PanelHeader title="Lineage Graph" />
            <PanelContent>{renderGraph()}</PanelContent>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
});

// Main Lineage Viewer
export const LineageViewer = observer((props: { lineageState: any }) => {
  const { lineageState } = props;

  useEffect(() => {
    if (!lineageState.selectedTab) {
      lineageState.setSelectedTab('CLASS_LINEAGE');
    }
  }, [lineageState]);

  return (
    <div className="lineage-viewer">
      <LineageViewerContent lineageState={lineageState} />
    </div>
  );
});
