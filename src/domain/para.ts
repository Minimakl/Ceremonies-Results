/**
 * Para events: extract the performance percentage from Roster's free-text
 * notes field into its own value (plan §8).
 *
 * The percentage always has the shape XX.XX (two decimal places). Everything
 * else in the notes — implement weights, class codes, commentary — is
 * stripped, and a number carrying a unit is never the percentage: Roster
 * writes "7.26kg 77.27" for a 7.26 kg shot thrown for 77.27%
 * (27550/337021, Todd HODGETTS), so a match immediately followed by a letter
 * is skipped.
 */
export function extractParaPercentage(notes: string | undefined): string | undefined {
  if (!notes) return undefined
  const matches = notes.matchAll(/(?<![\d.])(\d{1,3}\.\d{2})(?![\d.a-zA-Z])/g)
  for (const match of matches) return match[1]
  return undefined
}
