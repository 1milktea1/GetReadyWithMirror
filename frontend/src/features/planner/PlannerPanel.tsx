// Getting-ready overview tile. Renders the backend plan; it does not compute leave-by.

import { useState } from 'react';
import type { TransportMode } from '@contracts/maps/types';
import type { PreparationPlan, ScheduledTask } from '@contracts/planner/types';
import { formatRemainingDuration, formatTimeOfDay } from '../../shared/time/format';
import { buildPlannerQuery, usePlanner } from './usePlanner';
import './planner.css';

interface PlannerPanelProps {
  expanded: boolean;
  onToggle: () => void;
  /** Optional clock for tests. The overview uses the live backend clock. */
  now?: string;
  /** Selected transportation. Defaults to subway. */
  mode?: TransportMode;
}

export function PlannerPanel({ expanded, onToggle, now, mode = 'transit' }: PlannerPanelProps) {
  const [tasks, setTasks] = useState<string | undefined>();
  const [done, setDone] = useState<string[]>([]);
  const { state, retry } = usePlanner(buildPlannerQuery({ now, tasks, done, mode }));

  if (state.status === 'loading') {
    return (
      <section className="planner planner--status" aria-label="Getting ready">
        Loading your plan…
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section className="planner planner--status" role="alert" aria-label="Getting ready">
        <div className="planner__label">Getting ready</div>
        <p className="planner__summary">{state.error.message}</p>
        <button type="button" className="planner__button" onClick={retry}>
          Retry
        </button>
      </section>
    );
  }

  const { data } = state;
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
        <div className="planner__label">Leave by {formatTimeOfDay(new Date(data.leaveBy.at), data.timeZone)}</div>
        <p className="planner__summary">{leaveStatus(data)}</p>
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

function leaveStatus(data: PreparationPlan): string {
  const remaining = Math.floor((Date.parse(data.leaveBy.at) - Date.parse(data.now)) / 60_000);
  if (!data.feasible || remaining < 0) return 'Late';
  if (remaining === 0) return 'On time';
  const destination = eventDestination(data.event);
  const duration = formatRemainingDuration(remaining);
  return destination ? `${duration} for ${destination}` : duration;
}

function eventDestination(event: { title: string; venueName?: string }): string {
  const venue = event.venueName?.trim();
  return venue ? `${event.title} · ${venue}` : event.title;
}

function taskWindow(task: ScheduledTask, timeZone: string): string {
  if (task.completed || !task.start || !task.end) return 'Done';
  const range = `${formatTimeOfDay(new Date(task.start), timeZone)} – ${formatTimeOfDay(new Date(task.end), timeZone)}`;
  return task.overruns ? `${range} · past leave-by` : range;
}
