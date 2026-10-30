// Supabase calls never throw: they return { data, error }. unwrap() turns that
// into a normal throw, so a page can wrap several calls in one try/catch.
export function unwrap({ data, error }) {
  if (error) throw new Error(friendlyMessage(error))
  return data
}

// Postgres error codes for the rules in supabase/schema.sql.
function friendlyMessage(error) {
  switch (error.code) {
    case '23503': // foreign_key_violation: the "on delete restrict" rule
      return "This category isn't empty. Move or delete what's inside it first."
    case '23505': // unique_violation: categories_unique_name
      return 'A category with that name already exists here.'
    case '23514': // check_violation: the name length check
      return 'Names must be 1 to 100 characters.'
    default:
      return error.message
  }
}
