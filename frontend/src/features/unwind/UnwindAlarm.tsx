import './unwind.css'

/** Bedtime alarm shown on the unwind screen. Fixed for the demo morning. */
export function UnwindAlarm() {
  return (
    <section className="unwind-alarm" aria-label="Alarm">
      <p className="unwind-alarm__label">Alarm set</p>
      <p className="unwind-alarm__clock">
        <span className="unwind-alarm__time">8:00</span>
        <span className="unwind-alarm__period">AM</span>
      </p>
      <p className="unwind-alarm__day">Tomorrow</p>
    </section>
  )
}
