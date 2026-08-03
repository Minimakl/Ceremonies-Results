import { genderTone } from '../domain/format'
import type { FinalEvent } from '../domain/model'

/**
 * The "Women · U18" line under an event name, coloured as Roster colours it —
 * pink for Women/Girls, blue for Men/Boys, plain for Mixed.
 *
 * Roster words the same event differently on its two surfaces (verified on
 * 27351/334388: "Girls · U18" on the schedule, "Women · U18" on the event
 * header), and the dashboard keeps that split: cards show the schedule
 * wording, the event screen shows the header wording.
 */
export function GenderMeta({
  event,
  wording = 'schedule',
}: {
  event: FinalEvent
  wording?: 'schedule' | 'header'
}) {
  const text = wording === 'header' ? event.genderHeader : event.gender
  if (!text) return <>{event.ageGroup}</>
  return (
    <>
      <span className={`gender gender--${genderTone(event.genderRaw)}`}>
        {text}
      </span>
      {event.ageGroup ? ` · ${event.ageGroup}` : ''}
    </>
  )
}
