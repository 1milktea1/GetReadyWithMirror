// Getting-ready overview tile. Renders the backend plan; it does not compute leave-by.

import { useState } from 'react';
import type { TransportMode } from '@contracts/maps/types';
import type { ScheduledTask } from '@contracts/planner/types';
import { formatClock, formatTimeOfDay } from '../../shared/time/format';
import { buildPlannerQuery, usePlanner } from './usePlanner';
import './planner.css';

interface PlannerPanelProps {
  expanded: boolean;
  onToggle: () => void;
  /** Demo clock forwarded to the backend, already floored to the minute. */
  now?: string;
  /** Selected transportation. Defaults to subway. */
  mode?: TransportMode;
}

const MODE_LABEL: Record<TransportMode, string> = {
  transit: 'Subway',
  walking: 'Walk',
  driving: 'Drive',
  rideshare: 'Rideshare',
  cycling: 'Cycling',
};

export function PlannerPanel({ expanded, onToggle, now, mode = 'transit' }: PlannerPanelProps) {
  const [tasks, setTasks] = useState<string | undefined>();
  const [done, setDone] = useState<string[]>([]);
  const { state, retry } = usePlanner(buildPlannerQuery({ now, tasks, done, mode }));

  if (state.status === 'loading') {
    return <section className="planner planner--status">Loading your plan…</section>;
  }

  if (state.status === 'error') {
    return (
      <section className="planner planner--status" role="alert">
        <div className="planner__label">Getting ready</div>
        <p className="planner__summary">{state.error.message}</p>
        <button type="button" className="planner__button" onClick={retry}>
          Retry
        </button>
      </section>
    );
  }

  const { data } = state;
  const leave = formatClock(new Date(data.leaveBy.at), data.timeZone);
  const hair = data.tasks.find((task) => task.id === 'hair');
  const hairExtended = (hair?.durationMinutes ?? 20) > 20;

  const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();

  return (
    <section className={`planner ${expanded ? 'planner--expanded' : ''}`} aria-label="Getting ready">
      <div
        className="planner__toggle"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle();
          }
        }}
      >
        <div className="planner__label">{data.feasible ? 'Leave by' : 'Leave by · conflict'}</div>
        <div className="planner__clock">
          <span className="planner__time">{leave.time}</span>
          <span className="planner__period">{leave.period}</span>
        </div>
        <p className="planner__meta">
          {MODE_LABEL[data.leaveBy.transportMode]} · {data.leaveBy.travelMinutes} min · arrive by{' '}
          {formatTimeOfDay(new Date(data.leaveBy.arriveBy), data.timeZone)}
        </p>
        <p className="planner__summary">{data.summary}</p>
        <ol className="planner__tasks">
          {data.tasks.map((task) => (
            <li key={task.id} className={task.overruns ? 'planner__task planner__task--over' : 'planner__task'}>
              <span className="planner__task-name">{task.name}</span>
              <span className="planner__task-time">{taskWindow(task, data.timeZone)}</span>
            </li>
          ))}
        </ol>
        {data.provenance.isFixture && <div className="planner__badge">Sample route — not live</div>}
      </div>

      <div className="leave-by" role="status" aria-label="Leave by reminder">
        <div className="leave-by__label">{data.feasible ? 'Leave by' : 'Leave by · conflict'}</div>
        <div className="leave-by__clock">
          <span className="leave-by__time">{leave.time}</span>
          <span className="leave-by__period">{leave.period}</span>
        </div>
        <div className="leave-by__meta">
          {MODE_LABEL[data.leaveBy.transportMode]} · {data.leaveBy.travelMinutes} min
        </div>
      </div>

      <div className="planner__details" aria-hidden={!expanded} inert={!expanded}>
        <div className="planner__details-inner">
          <p className="planner__meta">
            {data.feasible ? 'Start at' : 'Needed to start by'}{' '}
            {formatTimeOfDay(new Date(data.startGettingReadyAt), data.timeZone)}
            {data.event.venueName ? ` · ${data.event.title} at ${data.event.venueName}` : ''}
          </p>
          {data.conflict && data.conflict.adjustments.length > 0 && (
            <ul className="planner__adjustments">
              {data.conflict.adjustments.map((adjustment) => (
                <li key={adjustment.id}>{adjustment.label}</li>
              ))}
            </ul>
          )}
          <div className="planner__actions">
            {data.tasks.map((task) =>
              task.completed ? null : (
                <button
                  key={task.id}
                  type="button"
                  className="planner__button"
                  onClick={(event) => {
                    stop(event);
                    setDone((current) => (current.includes(task.id) ? current : [...current, task.id]));
                  }}
                >
                  {task.name} done
                </button>
              ),
            )}
            {hair && (
              <button
                type="button"
                className="planner__button"
                onClick={(event) => {
                  stop(event);
                  const nextHair = hairExtended ? 20 : hair.durationMinutes + 20;
                  setTasks(data.tasks.map((task) => `${task.id}:${task.id === 'hair' ? nextHair : task.durationMinutes}`).join(','));
                }}
              >
                {hairExtended ? 'Back to 20 minutes for hair' : 'Give hair 20 more minutes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function taskWindow(task: ScheduledTask, timeZone: string): string {
  if (task.completed || !task.start || !task.end) return 'Done';
  const range = `${formatTimeOfDay(new Date(task.start), timeZone)} – ${formatTimeOfDay(new Date(task.end), timeZone)}`;
  return task.overruns ? `${range} · past leave-by` : range;
}
