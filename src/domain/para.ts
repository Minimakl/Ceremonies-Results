/**
 * Para events: extract the performance percentage from Roster's free-text
 * notes field into its own value (plan §8).
 *
 * The percentage always has the shape XX.XX (two decimal places). Everything
 * else in the notes — implement weights like "2kg", class codes, commentary —
 * is stripped. "2kg" style tokens must not be mistaken for percentages
 * (they have no decimal part, so the pattern cannot match them).
 */
export function extractParaPercentage(notes: string | undefined): string | undefined {
  if (!notes) return undefined
  const match = notes.match(/(?<![\d.])(\d{1,3}\.\d{2})(?![\d.])/)
  return match ? match[1] : undefined
}
