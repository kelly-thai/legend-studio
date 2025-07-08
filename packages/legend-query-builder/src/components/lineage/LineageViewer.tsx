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

import { useEffect, useState, useMemo, type JSX } from 'react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  PanelHeader,
  PanelContent,
  clsx,
  Dialog,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  type Node,
  type Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { isNonNullable } from '@finos/legend-shared';
import {
  type LineageState,
  LINEAGE_VIEW_MODE,
} from '../../stores/lineage/LineageState.js';
// Import the new LineageModel types
import {
  type LineageGraph,
  type LineageNode,
  type LineageEdge,
  type ReportLineage,
  type ReportLineageColumn,
  type LineageModel,
} from '@finos/legend-graph';

// Helper function to convert LineageGraph to React Flow nodes and edges
const convertLineageGraphToFlow = (graph?: LineageGraph) => {
  if (!graph?.nodes) {
    return { nodes: [], edges: [] };
  }
  const nodes = graph.nodes.map((node: LineageNode) => ({
    id: node.id,
    data: { label: node.text || node.id },
    position: { x: Math.random() * 500, y: Math.random() * 500 },
    type: 'default' as const,
  }));
  const edges =
    graph.edges.map((edge: LineageEdge) => ({
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      label: edge.type,
      type: 'default' as const,
    })) || [];
  return { nodes, edges };
};

// Helper function to convert ReportLineage[] to React Flow nodes and edges
const convertReportLineageToFlow = (reportLineages?: ReportLineage[]) => {
  if (!reportLineages || !Array.isArray(reportLineages)) {
    return { nodes: [], edges: [] };
  }
  const nodes = reportLineages.flatMap((report: ReportLineage) =>
    report.columns.map((col: ReportLineageColumn) => ({
      id: `${report.name}-${col.name}`,
      data: { label: `${report.name}.${col.name}` },
      position: { x: Math.random() * 500, y: Math.random() * 500 },
      type: 'default' as const,
    })),
  );
  const edges: [] = [];
  return { nodes, edges };
};

// Helper to render ReactFlow as a JSX.Element
function renderReactFlow(nodes: Node[], edges: Edge[]): JSX.Element {
  return (
    <ReactFlowProvider>
      <div style={{ height: 800 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          defaultEdgeOptions={{ type: 'default' }}
        >
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}

// Graph Viewer Component
const LineageGraphViewer = observer(
  (props: { nodes: Node[]; edges: Edge[] }) => {
    const { nodes, edges } = props;
    return (
      <div style={{ height: '100%', width: '100%' }}>
        {renderReactFlow(nodes, edges)}
      </div>
    );
  },
);

// Main Viewer Content
const LineageViewerContent = observer(
  (props: { lineageState: LineageState }) => {
    const { lineageState } = props;
    const selectedTab = lineageState.selectedTab;
    const lineageData = lineageState.lineageData;

    // Convert lineage data to React Flow format with safety checks
    const classLineageFlow = convertLineageGraphToFlow(
      lineageData?.classLineage,
    );
    const databaseLineageFlow = convertLineageGraphToFlow(
      lineageData?.databaseLineage,
    );
    const reportLineageFlow = convertReportLineageToFlow(
      lineageData?.reportLineage,
    );

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
  },
);

// Main Lineage Viewer
export const LineageViewer = observer(
  (props: { lineageState: LineageState }) => {
    const { lineageState } = props;

    const closePlanViewer = (): void => {
      lineageState.setLineageData(undefined);
      lineageState.setSelectedTab(LINEAGE_VIEW_MODE.CLASS_LINEAGE);
    };
    if (!lineageState) {
      return null;
    }
    //const isDarkMode = !executionPlanState.applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;

    // useEffect(() => {
    //   if (!lineageState.selectedTab) {
    //     lineageState.setSelectedTab(LINEAGE_VIEW_MODE.CLASS_LINEAGE);
    //   }
    // }, [lineageState]);

    return (
      <Dialog
        open={Boolean(lineageState.lineageData)}
        onClose={closePlanViewer}
        // ...existing code...
      >
        <Modal className="editor-modal">
          <ModalHeader title="Lineage" />
          <ModalBody>
            <div className="lineage-viewer" style={{ height: 800 }}>
              <LineageViewerContent lineageState={lineageState} />
            </div>
          </ModalBody>
          <ModalFooter>
            {/* <ModalFooterButton
              onClick={closePlanViewer}
              text="Close"
              type="secondary"
            /> */}
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

// export const ExecutionPlanViewer = observer(
//   (props: { executionPlanState: ExecutionPlanState }) => {
//     const { executionPlanState } = props;

//     const rawPlan = executionPlanState.rawPlan;
//     const isDarkMode =
//       !executionPlanState.applicationStore.layoutService
//         .TEMPORARY__isLightColorThemeEnabled;

//     return (
//       <Dialog
//         open={Boolean(executionPlanState.rawPlan)}
//         onClose={closePlanViewer}
//         classes={{
//           root: 'editor-modal__root-container',
//           container: 'editor-modal__container',
//           paper: 'editor-modal__content',
//         }}
//       >
//         <Modal className="editor-modal" darkMode={isDarkMode}>
//           <ModalHeader title="Execution Plan" />
//           <ModalBody>

//               <ExecutionPlanViewerContent
//                 executionPlanState={executionPlanState}
//                 rawPlan={rawPlan}
//               />
//             }
//           </ModalBody>
//           <ModalFooter>
//             <ModalFooterButton
//               onClick={closePlanViewer}
//               text="Close"
//               type="secondary"
//             />
//           </ModalFooter>
//         </Modal>
//       </Dialog>
//     );
//   },
// );
