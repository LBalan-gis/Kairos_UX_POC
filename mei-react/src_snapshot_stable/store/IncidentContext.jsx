/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react';

// Centralized state representing the 3-Layer UX architecture
// (App UI State, Graph Nodes, and KairOS Focus)
const IncidentContext = createContext();

const initialGraphData = {
  nodes: [
    { 
      id: 'batch_golden', label: 'Golden Batch PH-2025-088', type: 'GoldenBatch', state: 'normal', pinned: { x: 80, y: 70 },
      metadata: { description: 'Reference profile' },
      metrics: { OEE: '92.4%', Output: '4 800 units', Speed: '240 bpm' },
      chart: true
    },
    { 
      id: 'batch_current', label: 'Batch PH-2026-018', type: 'Batch', state: 'warning', pinned: { x: 300, y: 200 },
      metadata: { description: 'Live batch · Operator: K. Mueller' },
      metrics: { Units: '1 120 packed', OEE: '78.4%', Shift: 'B' },
      chart: true
    },
    { 
      id: 'hidden_loss', label: 'OEE-2026-031 · Hidden Loss', type: 'Deviation', state: 'critical', pinned: { x: 300, y: 400 },
      metadata: { description: '23 minutes of micro-stop loss since 08:14' },
      metrics: { Severity: 'Major', 'Hidden Loss': '23 min', Events: '11 micro-stops' },
      insight: 'Invisible to standard OEE reporting'
    },
    { id: 'sim_unchanged', label: 'If unchanged', type: 'SimulationScenario', state: 'simulation', pinned: { x: 150, y: 600 }, metrics: { 'Miss by': '2 200 units', Loss: '£34K shift' } },
    { id: 'sim_corrected', label: 'Tension roller adjusted', type: 'SimulationScenario', state: 'simulation', pinned: { x: 450, y: 600 }, metrics: { Recovery: '94% confidence', Savings: '£29K' } },
    { id: 'sys_mes', label: 'MES', type: 'ExternalSystem', state: 'external', pinned: { x: 700, y: 400 }, metadata: { description: 'Execution layer' } },
    { id: 'sys_qa', label: 'QA', type: 'ExternalSystem', state: 'external', pinned: { x: 700, y: 500 }, metadata: { description: 'Approval layer' } },
    { id: 'sys_erp', label: 'ERP', type: 'ExternalSystem', state: 'external', pinned: { x: 700, y: 600 }, metadata: { description: 'Cost sync layer' } },
  ],
  edges: [
    { source: 'batch_golden', target: 'batch_current' },
    { source: 'batch_current', target: 'hidden_loss' },
    { source: 'hidden_loss', target: 'sim_unchanged' },
    { source: 'hidden_loss', target: 'sim_corrected' },
    { source: 'sim_corrected', target: 'sys_mes' },
    { source: 'sim_corrected', target: 'sys_qa' },
    { source: 'sim_corrected', target: 'sys_erp' },
  ]
};

export const IncidentProvider = ({ children }) => {
  const [activeLayer, setActiveLayer] = useState('floor'); // 'floor' | 'graph'
  const [focusedNode, setFocusedNode] = useState(null);
  const [graphData, setGraphData] = useState(initialGraphData);
  const [revealedNodeIds, setRevealedNodeIds] = useState(['batch_golden', 'batch_current', 'hidden_loss']); // Progressive disclosure

  const enterFocusMode = (nodeId) => {
    setFocusedNode(nodeId);
    // Auto-reveal nodes related to this focus, ensuring the progressive disclosure opens up logically
    if (nodeId === 'hidden_loss') {
      setRevealedNodeIds(prev => [...new Set([...prev, 'sim_corrected', 'sim_unchanged'])]);
    } else if (nodeId === 'sim_corrected') {
      setRevealedNodeIds(prev => [...new Set([...prev, 'sys_mes', 'sys_qa', 'sys_erp'])]);
    }
  };

  const exitFocusMode = () => setFocusedNode(null);

  const transitionToGraph = () => setActiveLayer('graph');
  const transitionToFloor = () => setActiveLayer('floor');

  // Handle free-flowing whiteboard card dragging
  const updateNodePosition = (id, x, y) => {
    setGraphData(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id === id ? { ...n, pinned: { x, y } } : n)
    }));
  };

  return (
    <IncidentContext.Provider
      value={{
        activeLayer,
        transitionToGraph,
        transitionToFloor,
        focusedNode,
        enterFocusMode,
        exitFocusMode,
        graphData,
        revealedNodeIds,
        updateNodePosition
      }}
    >
      {children}
    </IncidentContext.Provider>
  );
};

export const useIncident = () => useContext(IncidentContext);
