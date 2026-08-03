import { genderTone } from '../domain/format'
import type { FinalEvent } from '../domain/model'

/**
 * The "Women · U18" line under an event name, with the gender coloured the
 * way Roster colours it on its own schedule — pink for Women and Girls, blue
 * for Men and Boys. It gives the operator something to aim at when scanning a
 * board of otherwise identical cards.
 *
 * Mixed events stay in the ordinary text colour, because that is what Roster
 * does: its schedule carries only the two colours.
 */
export function GenderMeta({ event }: { event: FinalEvent }) {
  if (!event.gender) return <>{event.ageGroup}</>
  return (
    <>
      <span className={`gender gender--${genderTone(event.genderRaw)}`}>
        {event.gender}
      </span>
      {event.ageGroup ? ` · ${event.ageGroup}` : ''}
    </>
  )
}
