interface Props {
  loading?: boolean
  error?: Error | null
  empty?: boolean
  loadingText: string
  emptyText?: string
  retry?: () => void
}

export default function QueryFeedback({ loading, error, empty, loadingText, emptyText, retry }: Props) {
  if (loading)
    return (
      <p className="mt-4 text-sm text-neutral-400" role="status">
        {loadingText}
      </p>
    )
  if (error)
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-red-300" role="alert">
        <span>Nie udało się pobrać danych: {error.message}</span>
        {retry && (
          <button onClick={retry} className="rounded border border-red-400/40 px-3 py-1 hover:bg-red-400/10">
            Spróbuj ponownie
          </button>
        )}
      </div>
    )
  if (empty) return <p className="mt-4 text-sm text-neutral-400">{emptyText ?? 'Brak danych.'}</p>
  return null
}
