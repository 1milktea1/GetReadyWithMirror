import type { Condition } from '../../../../shared/contracts/weather/types.ts';

const CLOUD = 'M7 19h10.5a4.5 4.5 0 0 0 .6-8.96A6.5 6.5 0 0 0 5.6 11.2 4 4 0 0 0 7 19z';

export function WeatherIcon({ condition, size = '1em' }: { condition: Condition; size?: string }) {
  return (
    <svg
      className="weather-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths(condition)}
    </svg>
  );
}

function paths(condition: Condition) {
  switch (condition) {
    case 'clear':
      return (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
        </>
      );
    case 'partly-cloudy':
      return (
        <>
          <path d="M9 3.5v1.5M3.5 9H5M5.1 5.1l1 1M12.9 5.1l-1 1" />
          <path d="M5.6 11.2A3.5 3.5 0 0 1 12 7.2" />
          <path d={CLOUD} />
        </>
      );
    case 'cloudy':
      return <path d={CLOUD} />;
    case 'fog':
      return <path d="M4 8h16M3 12h18M5 16h14M8 20h8" />;
    case 'drizzle':
    case 'rain':
      return (
        <>
          <path d="M7 16h10.5a4.5 4.5 0 0 0 .6-8.96A6.5 6.5 0 0 0 5.6 8.2 4 4 0 0 0 7 16z" />
          <path d={condition === 'rain' ? 'M8 19l-1 2.5M12 19l-1 2.5M16 19l-1 2.5' : 'M9 19.5v.5M13 19.5v.5M17 19.5v.5'} />
        </>
      );
    case 'snow':
      return (
        <>
          <path d="M7 16h10.5a4.5 4.5 0 0 0 .6-8.96A6.5 6.5 0 0 0 5.6 8.2 4 4 0 0 0 7 16z" />
          <path d="M8 19.5h.01M12 21h.01M16 19.5h.01" strokeWidth={2.5} />
        </>
      );
    case 'thunderstorm':
      return (
        <>
          <path d="M7 16h10.5a4.5 4.5 0 0 0 .6-8.96A6.5 6.5 0 0 0 5.6 8.2 4 4 0 0 0 7 16z" />
          <path d="M12.5 16l-2 3.5h3l-2 3.5" />
        </>
      );
    default:
      return <circle cx="12" cy="12" r="1" />;
  }
}
