/** Touch scrolling stays native; mouse dragging also works in a narrow viewport. */
export function useMobileNavScroll() {
  const dragging = ref(false);
  let pointer: { id: number; x: number; scrollLeft: number } | null = null;
  let suppressClick = false;

  function start(event: PointerEvent) {
    suppressClick = false;
    pointer = null;
    const nav = event.currentTarget as HTMLElement;
    if (event.pointerType !== 'mouse' || event.button !== 0 || !window.matchMedia('(max-width: 767px)').matches || nav.scrollWidth <= nav.clientWidth) return;
    pointer = { id: event.pointerId, x: event.clientX, scrollLeft: nav.scrollLeft };
  }

  function move(event: PointerEvent) {
    if (!pointer || event.pointerId !== pointer.id || !(event.buttons & 1)) return;
    const delta = event.clientX - pointer.x;
    if (!dragging.value && Math.abs(delta) < 6) return;
    const nav = event.currentTarget as HTMLElement;
    if (!dragging.value) {
      dragging.value = true;
      suppressClick = true;
      nav.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    nav.scrollLeft = pointer.scrollLeft - delta;
  }

  function finish(event: PointerEvent) {
    if (pointer?.id !== event.pointerId) return;
    pointer = null;
    dragging.value = false;
    const nav = event.currentTarget as HTMLElement;
    if (nav.hasPointerCapture(event.pointerId)) nav.releasePointerCapture(event.pointerId);
  }

  function click(event: MouseEvent) {
    // A swipe must not select a menu. Ordinary taps/clicks and keyboard clicks do.
    if (suppressClick && event.detail !== 0) {
      event.preventDefault();
      event.stopPropagation();
    }
    suppressClick = false;
  }

  return { dragging, start, move, finish, click };
}
