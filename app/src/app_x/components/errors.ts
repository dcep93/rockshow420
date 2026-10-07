export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Could not save. Please try again.";
}
