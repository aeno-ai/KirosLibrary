import useSavedItems from './useSavedItems'
import Icon from '../components/Icon'

export default function SavedItemActions({ itemType, itemId, label }) {
  const {
    loading,
    isPinned,
    isPending,
    operationError,
    setPinned,
  } = useSavedItems()
  const pinned = isPinned(itemType, itemId)
  const pinBusy = isPending(itemType, itemId, 'pinned')
  const favoriteError = operationError(itemType, itemId, 'favorite')
  const pinError = operationError(itemType, itemId, 'pinned')

  async function togglePinned() {
    try {
      await setPinned(itemType, itemId, !pinned)
    } catch {
      // The hook stores a compact error next to the control that failed.
    }
  }

  return (
    <span className="saved-item-controls">
      <span className="saved-item-buttons" aria-label={`Save ${label}`}>
        <button
          type="button"
          className={`saved-item-action pin${pinned ? ' active' : ''}`}
          onClick={togglePinned}
          disabled={loading || pinBusy}
          aria-label={`${pinned ? 'Unpin' : 'Pin'} ${label}`}
          aria-pressed={pinned}
          title={pinned ? 'Remove from Quick Access' : 'Pin to Quick Access'}
        >
          <Icon name="pin" filled={pinned} />
        </button>
      </span>
      {(favoriteError || pinError) && <span className="saved-item-error" role="alert">{favoriteError || pinError}</span>}
    </span>
  )
}
