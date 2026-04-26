import { useState, useRef, useEffect, useCallback, useMemo, startTransition } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/useAppStore';
import { detectIntent, resolveMachineId } from '../../lib/kairosIntent';
import { mkMsg, stageLog } from '../../services/kairos/messages';
import { applyPanelModification } from '../../services/kairos/panel';
import { buildKairosReport } from '../../services/kairos/reports';
import { FOCUS_RESPONSES, resolveFocusId } from '../../services/kairos/focus';
import { resolveKnowledgeResponse } from '../../services/kairos/questions';
import { buildWidgetPayload } from '../../services/widgets/payload';
import type { Entity } from '../../types/domain';
import type { KairosLogEntry, KairosMessage } from '../../types/kairos';
import type { WidgetPayload } from '../../types/widgets';

type Intent =
  | 'panel_modify'
  | 'widget'
  | 'report'
  | 'command'
  | 'onboard'
  | 'offline_sim'
  | 'offline_clear'
  | 'trace'
  | 'aegis'
  | 'cfr_block'
  | 'question';

type PanelModificationResult = {
  ok: boolean;
  text: string;
  verb?: string;
  resolvedKey?: string;
  panel?: WidgetPayload | null;
};

type PendingCfr = { label: string; machineId: string } | null;
type ThreadElement = HTMLDivElement | null;
type SubmitFn = (text: string) => void;

export function useKairosController() {
  const {
    kairosOpen, kairosEntityId, entityMap, dark, liveIds, entityPhysics,
    enterFocus, setMachineOffline, setMachineOnline, clearOffline,
    openOnboarding, addActionLog, addSpatialWidget,
  } = useAppStore(useShallow((state) => ({
    kairosOpen: state.kairosOpen,
    kairosEntityId: state.kairosEntityId,
    entityMap: state.entityMap,
    dark: state.dark,
    liveIds: state.liveIds,
    entityPhysics: state.entityPhysics,
    enterFocus: state.enterFocus,
    setMachineOffline: state.setMachineOffline,
    setMachineOnline: state.setMachineOnline,
    clearOffline: state.clearOffline,
    openOnboarding: state.openOnboarding,
    addActionLog: state.addActionLog,
    addSpatialWidget: state.addSpatialWidget,
  })));

  const entityPhysicsRef = useRef(entityPhysics);
  useEffect(() => {
    entityPhysicsRef.current = entityPhysics;
  }, [entityPhysics]);
  const liveDataProvider = useCallback((tag: string) => entityPhysicsRef.current?.[tag]?.currentValue, []);

  const [messages, setMessages] = useState<KairosMessage[]>([
    mkMsg('kairos', {
      breakdown: [
        { label: 'OEE', value: '78.4%', detail: 'vs 92.4% golden batch', delta: '−14.0pp', severity: 'critical' },
        { label: 'LOSS', value: '23 min', detail: 'hidden micro-stops · CT-1101', delta: null, severity: 'warning' },
        { label: 'RISK', value: 'HIGH', detail: 'misses 2-min recovery threshold', delta: null, severity: 'critical' },
      ],
      text: 'OEE dropped by 14.0 pp (78.4% vs golden batch). CT-1101 micro-stops are the main driver.',
      actions: [
        { label: '→ Root cause analysis', cmd: 'film tension drift' },
        { label: '→ Show hidden loss', cmd: 'show hidden loss' },
      ],
    }),
  ]);
  const [thinking, setThinking] = useState(false);
  const [currentPanel, setCurrentPanel] = useState<WidgetPayload | null>(null);
  const [cfrPending, setCfrPending] = useState<PendingCfr>(null);
  const [cfrPin, setCfrPin] = useState('');
  const [cfrError, setCfrError] = useState(false);

  const threadRef = useRef<ThreadElement>(null);

  const handleReport = useCallback((text: string) => {
    const report = buildKairosReport(entityMap, text);
    setMessages((prev) => [...prev, mkMsg('kairos', { report, actions: [] })]);
  }, [entityMap]);

  const handleCommand = useCallback((text: string) => {
    const focusId = resolveFocusId(text);
    enterFocus(focusId);
    const response = FOCUS_RESPONSES[focusId] || {
      text: `Graph updated — focusing on ${focusId.replace(/_/g, ' ')}.`,
      actions: [],
    };
    setMessages((prev) => [...prev, mkMsg('kairos', response)]);
  }, [enterFocus]);

  const handleOfflineSim = useCallback((text: string) => {
    const lower = text.toLowerCase();
    const machineId = resolveMachineId(lower);
    if (!machineId) return;
    const label = machineId.replace('_', '-').toUpperCase();
    const isRestore = lower.includes('restore') || lower.includes('bring back') || lower.includes('online') || lower.includes('recover');

    if (isRestore) {
      setMachineOnline(machineId);
      setMessages((prev) => [
        ...prev,
        mkMsg('system', { text: `PLC write confirmed · ${label} → NOMINAL · product flow released` }),
        mkMsg('kairos', {
          text: `${label} restored — machine back online. Product flow resuming on the line. Monitor output rate for the next 5 minutes to confirm recovery.`,
          actions: [{ label: '→ Check output gap', cmd: 'show me planned vs actual' }],
        }),
      ]);
      return;
    }

    setMachineOffline(machineId);
    setMessages((prev) => [
      ...prev,
      mkMsg('system', { text: `PLC write confirmed · ${label} → OFFLINE · downstream starvation active` }),
      mkMsg('kairos', {
        text: `Simulating ${label} offline. Product flow is now blocked at that station — vials queuing at the machine entrance. Downstream throughput will drop to zero within 90 seconds. Raise a bypass deviation or restore the unit to recover.`,
        actions: [
          { label: `→ Restore ${label}`, cmd: `restore ${machineId.replace('_', '-')}` },
          { label: '→ Generate deviation', cmd: 'generate incident report' },
        ],
      }),
    ]);
  }, [setMachineOffline, setMachineOnline]);

  const handleQuestion = useCallback((text: string) => {
    const response = resolveKnowledgeResponse(text);
    if (response.focusIds?.length) enterFocus(response.focusIds[0]);
    setMessages((prev) => [
      ...prev,
      mkMsg('kairos', {
        text: response.response,
        chartKey: response.chartKey,
        otifAlert: response.otifAlert,
        actions: response.actions,
      }),
    ]);
  }, [enterFocus]);

  const handlePanelModify = useCallback((text: string) => {
    const result = applyPanelModification(currentPanel, text) as PanelModificationResult;
    if (!result.ok) {
      setMessages((prev) => [...prev, mkMsg('kairos', { text: result.text, actions: [] })]);
      return;
    }

    setCurrentPanel(result.panel ?? null);
    setMessages((prev) => [
      ...prev,
      mkMsg('kairos', {
        text: `Panel updated — ${result.verb} ${result.resolvedKey} widget.`,
        widget: result.panel,
        actions: [{ label: '⊞ Pin to HUD', cmd: 'pin widget' }],
      }),
    ]);
  }, [currentPanel]);

  const submitImplRef = useRef<SubmitFn>(() => {});
  submitImplRef.current = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    startTransition(() => {
      setMessages((prev) => [...prev, mkMsg('user', { text: trimmed, actions: [] })]);
      setThinking(true);
    });

    setTimeout(() => {
      setThinking(false);
      const intent = detectIntent(trimmed, currentPanel) as Intent;

      if (intent === 'panel_modify') {
        stageLog(addActionLog as (entry: KairosLogEntry) => void, [
          [0, 'sys', 'Parsing panel modification intent...'],
          [300, 'sys', 'Mutating widget tree...'],
          [600, 'ok', 'Panel updated · re-rendering'],
        ]);
        handlePanelModify(trimmed);
        return;
      }

      if (intent === 'widget') {
        stageLog(addActionLog as (entry: KairosLogEntry) => void, [
          [0, 'sys', 'Querying AEGIS manifest · tag namespace v3.2.1'],
          [280, 'sys', 'LLM inference → widget JSON payload...'],
          [620, 'ok', 'Widget schema validated · mounting component'],
        ]);

        const widget = buildWidgetPayload(trimmed) as WidgetPayload;
        if (widget.type === 'layout') setCurrentPanel(widget);

        setMessages((prev) => [
          ...prev,
          mkMsg('kairos', {
            text: 'Widget generated from live namespace tags.',
            widget,
            actions: [{ label: '⊞ Pin to HUD', cmd: 'pin widget' }],
          }),
        ]);
        return;
      }

      if (intent === 'report') {
        stageLog(addActionLog as (entry: KairosLogEntry) => void, [
          [0, 'sys', 'Reading historian tags · batch PH-2026-018'],
          [320, 'sys', 'Fetching OEE metrics · Shift B · Line 1'],
          [700, 'sys', 'Assembling report template...'],
          [1100, 'ok', 'Report compiled · ready for export'],
        ]);
        handleReport(trimmed);
      } else if (intent === 'command') {
        const focusLabel = trimmed.toLowerCase().includes('root')
          ? 'film_tension'
          : trimmed.toLowerCase().includes('golden')
            ? 'batch_golden'
            : 'causal_graph';
        stageLog(addActionLog as (entry: KairosLogEntry) => void, [
          [0, 'sys', 'Computing causal impact neighborhood...'],
          [400, 'sys', `Resolving focus node: ${focusLabel}`],
          [800, 'ok', 'Graph updated · entity scope resolved'],
        ]);
        handleCommand(trimmed);
      } else if (intent === 'onboard') {
        stageLog(addActionLog as (entry: KairosLogEntry) => void, [
          [0, 'sys', 'Launching onboarding wizard...'],
          [350, 'sys', 'Scanning local MQTT broker · port 1883'],
          [800, 'sys', 'Listening for EtherCAT discovery packets...'],
          [1400, 'info', 'Awaiting device confirmation from operator'],
        ]);
        setMessages((prev) => [
          ...prev,
          mkMsg('kairos', {
            text: 'Opening the machine onboarding wizard. You\'ll need the equipment manual, P&IDs, and IQ/OQ protocols ready. The machine won\'t go live until qualification is complete.',
            actions: [],
          }),
        ]);
        setTimeout(() => openOnboarding(), 400);
      } else if (intent === 'offline_sim') {
        const machineId = resolveMachineId(trimmed.toLowerCase());
        const label = machineId ? machineId.replace('_', '-').toUpperCase() : 'MACHINE';
        const isRestore = trimmed.toLowerCase().includes('restore') || trimmed.toLowerCase().includes('online');
        if (isRestore) {
          stageLog(addActionLog as (entry: KairosLogEntry) => void, [
            [0, 'sys', `Resolving node: ${label}`],
            [300, 'sys', `Injecting NOMINAL state → ${machineId}`],
            [700, 'sys', 'Releasing downstream starvation locks...'],
            [1000, 'ok', `${label} state = ONLINE · flow resumed`],
          ]);
        } else {
          stageLog(addActionLog as (entry: KairosLogEntry) => void, [
            [0, 'sys', `Resolving EtherCAT node: ${label}`],
            [350, 'sys', `Querying node status · bus addr 0x${Math.floor(Math.random() * 0xFF).toString(16).toUpperCase().padStart(2, '0')}`],
            [750, 'sys', `Injecting OFFLINE state → ${machineId}`],
            [1100, 'sys', 'Computing downstream starvation map...'],
            [1500, 'warn', `${label} OFFLINE · product flow BLOCKED`],
          ]);
        }
        handleOfflineSim(trimmed);
      } else if (intent === 'offline_clear') {
        stageLog(addActionLog as (entry: KairosLogEntry) => void, [
          [0, 'sys', 'Clearing all offline flags across bus...'],
          [400, 'sys', 'Restoring nominal state on all nodes...'],
          [800, 'ok', 'All machines = NOMINAL · flow resumed'],
        ]);
        clearOffline();
        setMessages((prev) => [
          ...prev,
          mkMsg('system', { text: 'All nodes → NOMINAL · NOMINAL state broadcast across bus · product flow resumed' }),
          mkMsg('kairos', { text: 'All machines restored to operational state. Product flow resuming across all lines.', actions: [] }),
        ]);
      } else if (intent === 'trace') {
        stageLog(addActionLog as (entry: KairosLogEntry) => void, [
          [0, 'sys', 'Resolving prediction anchor chain...'],
          [300, 'sys', 'Querying FT-1101 · Modbus 10.0.0.12:502'],
          [700, 'ok', 'Anchor verified · register 40001 · 34.0N'],
        ]);
        setMessages((prev) => [
          ...prev,
          mkMsg('kairos', {
            text: 'Prediction anchored to 34.0N live reading from Modbus Node 10.0.0.12. Every inference KairOS makes is shackled to a verified physical sensor in the Unified Namespace.',
            tracePanel: true,
            actions: [],
          }),
        ]);
      } else if (intent === 'aegis') {
        stageLog(addActionLog as (entry: KairosLogEntry) => void, [
          [0, 'warn', 'Fabrication attempt intercepted · AEGIS active'],
          [400, 'err', 'Request rejected · sensor not in namespace'],
        ]);
        setMessages((prev) => [
          ...prev,
          mkMsg('kairos', {
            aegisTarget: 'CT-1101 Cartoner',
            aegisField: 'temperature',
            aegisValidSensors: 'pack_rate [AI] · jam_count [AI] · run_status [DI]',
            actions: [],
          }),
        ]);
      } else if (intent === 'cfr_block') {
        const machineId = resolveMachineId(trimmed) || 'bf_1101';
        const label = machineId.replace('_', '-').toUpperCase();
        stageLog(addActionLog as (entry: KairosLogEntry) => void, [
          [0, 'warn', `PLC write requested · ${label} → OFFLINE`],
          [300, 'warn', '21 CFR Part 11 gate triggered · awaiting human auth'],
        ]);
        setMessages((prev) => [
          ...prev,
          mkMsg('kairos', {
            text: 'Override command intercepted. BM-1101 cannot be taken offline without operator authorization — 21 CFR Part 11 requires a signed audit record before any PLC write. Authorization modal requires your operator PIN.',
            actions: [],
          }),
        ]);
        setTimeout(() => setCfrPending({ label, machineId }), 500);
      } else {
        stageLog(addActionLog as (entry: KairosLogEntry) => void, [
          [0, 'sys', 'Parsing query intent...'],
          [400, 'sys', 'Scoring knowledge base entries...'],
          [700, 'info', 'Response generated · no write actions issued'],
        ]);
        handleQuestion(trimmed);
      }
    }, 380);
  };

  const submit = useCallback((text: string) => submitImplRef.current(text), []);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, thinking]);

  useEffect(() => {
    if (!kairosOpen || !kairosEntityId) return;
    const entity = entityMap[kairosEntityId] as Entity | undefined;
    if (!entity) return;
    setMessages((prev) => [
      ...prev,
      mkMsg('kairos', {
        text: `${entity.label} — ${entity.metadata?.detail || entity.insight || 'No detail available.'}`,
        actions: entity.action ? [{ label: `→ ${entity.action}`, cmd: `focus ${kairosEntityId}` }] : [],
      }),
    ]);
  }, [kairosEntityId, entityMap, kairosOpen]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail) submit(customEvent.detail);
    };
    window.addEventListener('kairos-cmd', handler);
    return () => window.removeEventListener('kairos-cmd', handler);
  }, [submit]);

  return useMemo(() => ({
    messages,
    setMessages,
    thinking,
    setThinking,
    currentPanel,
    setCurrentPanel,
    cfrPending,
    setCfrPending,
    cfrPin,
    setCfrPin,
    cfrError,
    setCfrError,
    threadRef,
    liveDataProvider,
    liveIds,
    submit,
    dark,
    addActionLog,
    addSpatialWidget,
  }), [
    messages,
    thinking,
    currentPanel,
    cfrPending,
    cfrPin,
    cfrError,
    liveDataProvider,
    liveIds,
    submit,
    dark,
    addActionLog,
    addSpatialWidget,
  ]);
}

export type KairosControllerValue = ReturnType<typeof useKairosController>;
