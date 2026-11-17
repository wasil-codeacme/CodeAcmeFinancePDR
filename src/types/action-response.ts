/** The shape every Server Action returns: data on success, a user-safe message on failure. */
export type ActionResponse<TData> =
  | { data: TData; error?: never; fieldErrors?: never }
  | { data?: never; error: string; fieldErrors?: Record<string, string[] | undefined> };
