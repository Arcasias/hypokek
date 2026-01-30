<script lang="ts">
  function onChange(ev: Event & { currentTarget: HTMLInputElement }) {
    const safeString = ev.currentTarget.value
      .replaceAll(RE_FORBIDDEN, "")
      .replaceAll(RE_NUMBER, (match) => String(Number(match)));
    try {
      const number = window.eval(safeString);
      value = round(number);
      onchange(value);
    } catch {
      console.warn("Invalid expression:", safeString);
    }
  }

  function onKeyDown(ev: KeyboardEvent & { currentTarget: HTMLInputElement }) {
    if (ev.key === "ArrowUp" || ev.key === "ArrowDown") {
      ev.preventDefault();
      const diff = ev.shiftKey ? 10 : 1;
      value = round(value + (ev.key === "ArrowUp" ? diff : -diff));
      onchange(value);
    }
  }

  function round(n: number) {
    const mult = 10 ** digits;
    return Math.floor(Number(n || 0) * mult) / mult;
  }

  const RE_FORBIDDEN = /[^\de\+\-\*\/\.,\(\)\s]/g;
  const RE_NUMBER = /\d+/g;

  let {
    digits = 3,
    id,
    onchange = () => {},
    value = $bindable(),
    suffix = "",
    short = false,
  } = $props();
</script>

<input
  {id}
  class="px-1 border-b-2 border-amber-500 focus:border-amber-500 {short
    ? 'w-12 text-right'
    : 'w-full'}"
  type="text"
  onchange={onChange}
  onkeydown={onKeyDown}
  {value}
/>
{#if suffix}
  {suffix}
{/if}
