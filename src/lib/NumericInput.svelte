<script lang="ts">
  function onChange(ev: Event & { currentTarget: HTMLInputElement }) {
    const safeString = ev.currentTarget.value
      .replaceAll(RE_FORBIDDEN, "")
      .replaceAll(RE_NUMBER, (match) => String(Number(match)));
    try {
      const number = eval(safeString);
      value = Number(Number(number).toFixed(3));
    } catch {
      console.warn("Invalid expression:", safeString);
    }
  }

  const RE_FORBIDDEN = /[^\de\+\-\*\/\.,\(\)\s]/g;
  const RE_NUMBER = /\d+/g;

  let { id, value = $bindable(), suffix = "", short = false } = $props();
</script>

<input
  {id}
  class="px-1 border-b-2 border-amber-500 focus:border-amber-500 {short
    ? 'w-12 text-right'
    : 'w-full'}"
  type="text"
  onchange={onChange}
  {value}
/>
{#if suffix}
  {suffix}
{/if}
