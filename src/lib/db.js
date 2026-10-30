// Supabase calls never throw: they return { data, error }. unwrap() turns that
// into a normal throw, so a page can wrap several calls in one try/catch.
export function unwrap({ data, error }) {
  if (error) throw new Error(friendlyMessage(error))
  return data
}

// Postgres error codes for the rules in supabase/*.sql.
function friendlyMessage(error) {
  switch (error.code) {
    case '23503': // foreign_key_violation: the "on delete restrict" rule
      return "This folder isn't empty. Move or delete what's inside it first."
    case '23505': // unique_violation: categories_unique_name
      return 'A folder with that name already exists here.'
    case '23514': // check_violation: the message names the broken constraint
      if (error.message.includes('notes_not_empty')) return 'A note needs a title or some text.'
      if (error.message.includes('notes_')) return 'That note is too long.'
      return 'Names must be 1 to 100 characters.'
    default:
      return error.message
  }
}

// For ILIKE searches: % means "anything" and _ means "any one character".
// Escape them (and the escape char \ itself) so typing "50%" finds a literal
// "50%" instead of matching everything that starts with 50.
export function escapeLike(term) {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`)
}
