<script lang="ts">
  import NumericInput from "./lib/NumericInput.svelte";
  import { computeMortgage, sum, type Loaner } from "./lib/utils";

  function addLoaner() {
    params.loaners.push({ ...DEFAULT_LOANER_VALUES });
    updateShares();
  }

  function formatCurrency(value: number) {
    return currencyFormatter.format(value);
  }

  function formatPercent(value: number) {
    return percentFormatter.format(value);
  }

  function updateShares(targetLoaner?: Loaner) {
    let remaining = 100 - (targetLoaner?.share || 0);
    const sharePerLoaner =
      remaining / (params.loaners.length - (targetLoaner ? 1 : 0));
    for (const loaner of params.loaners) {
      if (loaner === targetLoaner) {
        continue;
      }
      loaner.share = sharePerLoaner;
    }
  }

  function removeLoaner(loaner: Loaner) {
    params.loaners = params.loaners.filter((l) => l !== loaner);
    updateShares();
  }

  const DEFAULT_LOANER_VALUES = {
    name: "",
    equity: 0,
    owner: false,
    share: 0,
  };
  const DURATIONS = [20, 25, 30];
  const LOCALE = "fr-BE";
  const STORAGE_FEES_KEY = "mortgage-fees";
  const STORAGE_PARAMS_KEY = "mortgage-params";

  const currencyFormatter = new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: "EUR",
  });
  const percentFormatter = new Intl.NumberFormat(LOCALE, {
    style: "percent",
    maximumFractionDigits: 2,
  });

  const storageFees = localStorage.getItem(STORAGE_FEES_KEY);
  let fees = $state(
    storageFees
      ? JSON.parse(storageFees)
      : {
          ["Droit pour les annexes"]: 100,
          ["Honoraires"]: 2771.74,
          ["Frais administratifs"]: 855,
          ["Débours"]: 304,
          ["Transcription hypothécaire"]: 285,
          ["Droit d'écriture"]: 100,
          ["TVA"]: 846.46,
          ["Autres Frais"]: 0,
        },
  );

  const storageParams = localStorage.getItem(STORAGE_PARAMS_KEY);
  let params = $state<{
    asrd: number;
    asrdPeriod: number;
    duration: number;
    fixedRate: number;
    incendie: number;
    loaners: Loaner[];
    principal: number;
  }>(
    storageParams
      ? JSON.parse(storageParams)
      : {
          asrd: 0,
          asrdPeriod: 0,
          duration: DURATIONS[0],
          fixedRate: 3,
          incendie: 0,
          loaners: [{ ...DEFAULT_LOANER_VALUES, share: 100 }],
          mandatoryInsurance: 0,
          principal: 100_000,
        },
  );

  let mortgageResult = $derived(computeMortgage(params, fees));
  $effect(() => {
    localStorage.setItem(STORAGE_FEES_KEY, JSON.stringify(fees));
  });
  $effect(() => {
    localStorage.setItem(STORAGE_PARAMS_KEY, JSON.stringify(params));
  });
</script>

<main
  class="w-screen h-screen flex flex-col gap-8 p-5 overflow-auto md:flex-row md:flex-wrap"
>
  <details class="flex flex-col gap-3" open>
    <summary class="cursor-pointer list-none">
      <h2 class="font-bold text-xl py-1 border-b-2 border-slate-300">
        Paramètres ⚙️
      </h2>
    </summary>
    <div class="flex flex-col gap-3">
      <label
        class="flex items-center text-nowrap gap-2 select-none"
        for="principal"
      >
        Prix total :
        <NumericInput id="principal" bind:value={params.principal} suffix="€" />
      </label>
      <label
        for="fixedRate"
        class="flex items-center text-nowrap gap-2 select-none"
      >
        Taux fixe :
        <NumericInput id="fixedRate" bind:value={params.fixedRate} suffix="%" />
      </label>
      <div class="flex gap-2">
        Durée :
        <ul class="flex gap-1">
          {#each DURATIONS as duration}
            <li>
              <label
                for="duration_{duration}"
                class="cursor-pointer p-2 rounded-lg hover:bg-amber-500 hover:text-white transition-colors"
                class:bg-amber-600={params.duration === duration}
                class:text-white={params.duration === duration}
              >
                <strong>{duration} ans</strong>
                <input
                  id="duration_{duration}"
                  type="radio"
                  name="duration"
                  class="hidden"
                  value={duration}
                  bind:group={params.duration}
                />
              </label>
            </li>
          {/each}
        </ul>
      </div>
      <label
        class="flex items-center text-nowrap gap-2 select-none"
        for="incendie"
      >
        Assurance incendie :
        <NumericInput id="incendie" bind:value={params.incendie} suffix="€" />
      </label>
      <label class="flex items-center text-nowrap gap-2 select-none" for="asrd">
        Assurance Solde Restant Dû :
        <NumericInput id="asrd" bind:value={params.asrd} suffix="€" />
      </label>
      {#if params.asrd}
        <label
          class="flex items-center text-nowrap gap-2 select-none"
          for="asrdPeriod"
        >
          Période de l'ASRD :
          <NumericInput
            id="asrdPeriod"
            bind:value={params.asrdPeriod}
            suffix="ans"
          />
        </label>
      {/if}
      <ul class="flex flex-col gap-3">
        {#each params.loaners as loaner, index}
          {@const loanerId = `loaner_${index}`}
          <li
            class="flex flex-col gap-2 shadow border-amber-500 border-2 p-3 rounded-lg"
          >
            <div class="flex items-center gap-3">
              <label
                class="flex w-full items-center text-nowrap gap-2 select-none"
                for="{loanerId}-name"
              >
                Nom :
                <input
                  id="{loanerId}-name"
                  type="text"
                  class="w-full px-1 border-b-2 border-amber-500"
                  bind:value={loaner.name}
                />
              </label>
              <button
                type="button"
                class="cursor-pointer font-black text-red-700"
                title="Supprimer"
                onclick={() => removeLoaner(loaner)}
              >
                x
              </button>
            </div>
            <label
              class="flex w-full items-center text-nowrap gap-2 select-none"
              for="{loanerId}-equity"
            >
              Fonds propres :
              <NumericInput
                id="{loanerId}-equity"
                bind:value={loaner.equity}
                suffix="€"
              />
            </label>
            {#if params.loaners.length > 1}
              <label
                class="flex w-full items-center text-nowrap gap-2 select-none"
                for="{loanerId}-share"
              >
                Part :
                <input
                  type="range"
                  class="w-full"
                  min={1}
                  max={100}
                  step={1}
                  bind:value={loaner.share}
                  oninput={() => updateShares(loaner)}
                />
                <NumericInput
                  id="{loanerId}-share"
                  bind:value={loaner.share}
                  suffix="%"
                  short={true}
                />
              </label>
            {/if}
            <label
              class="flex w-full items-center text-nowrap gap-2 cursor-pointer select-none"
              for="{loanerId}-owner"
            >
              Déjà propriétaire :
              <input
                id="{loanerId}-owner"
                class="cursor-pointer"
                type="checkbox"
                bind:checked={loaner.owner}
              />
            </label>
          </li>
        {/each}
      </ul>
      <button
        type="button"
        class="cursor-pointer flex p-3 shadow bg-amber-600 hover:bg-amber-700 transition-colors text-white rounded-xl font-bold"
        onclick={addLoaner}
      >
        ➕ Ajouter un propriétaire
      </button>
    </div>
  </details>
  <details class="flex flex-col gap-3" open>
    <summary class="cursor-pointer list-none">
      <h2 class="font-bold text-xl py-1 border-b-2 border-slate-300">
        Frais 💸
      </h2>
    </summary>
    <div class="flex flex-col gap-3">
      <ul class="flex flex-col gap-2">
        {#each Object.keys(mortgageResult.fees) as name}
          <li>
            <label
              class="flex items-center text-nowrap gap-2 select-none"
              for={name}
            >
              {name} :
              {#if name in fees}
                <NumericInput id={name} bind:value={fees[name]} suffix="€" />
              {:else}
                <strong>
                  {formatCurrency((mortgageResult.fees as any)[name])}
                </strong>
              {/if}
            </label>
          </li>
        {/each}
      </ul>
      <h3 class="p-2 border-2 border-amber-600 rounded-lg">
        Total : <strong class="text-amber-600">
          {formatCurrency(sum(Object.values(mortgageResult.fees)))}
        </strong>
      </h3>
    </div>
  </details>
  <details class="flex flex-col gap-3" open>
    <summary class="cursor-pointer list-none">
      <h2 class="font-bold text-xl py-1 border-b-2 border-slate-300">
        Résultats 📈
      </h2>
    </summary>
    <fieldset class="flex flex-col gap-2">
      <div>
        Fonds propres restant : <strong>
          {formatCurrency(mortgageResult.equity)}
        </strong>
      </div>
      <div>
        Montant du prêt : <strong>
          {formatCurrency(mortgageResult.principal)}
        </strong>
      </div>
      <div>
        TAEG : <strong>{formatPercent(mortgageResult.taeg)}</strong>
      </div>
      <div>
        Mensualités : <strong>
          {formatCurrency(
            mortgageResult.monthlyBase +
              mortgageResult.monthlyInterests +
              mortgageResult.monthlyInsurances,
          )}
        </strong>
      </div>
      <ul class="ms-5 text-sm text-gray-500 italic list-disc">
        <li>
          base : <strong>
            {formatCurrency(mortgageResult.monthlyBase)}
          </strong>
        </li>
        <li>
          intérêts : <strong>
            {formatCurrency(mortgageResult.monthlyInterests)}
          </strong>
        </li>
        <li>
          assurances : <strong>
            {formatCurrency(mortgageResult.monthlyInsurances)}
          </strong>
        </li>
      </ul>
      {#each mortgageResult.monthlyPayments || [] as [name, payment]}
        <div class="ps-2">
          <strong class="text-amber-600">{name}</strong>
          :
          <span>{formatCurrency(payment)}</span>
        </div>
      {/each}
      <div>
        Total : <strong>
          {formatCurrency(
            mortgageResult.totalBase +
              mortgageResult.totalInterests +
              mortgageResult.totalInsurances,
          )}
        </strong>
      </div>
      <ul class="ms-5 text-sm text-gray-500 italic list-disc">
        <li>
          base : <strong>
            {formatCurrency(mortgageResult.totalBase)}
          </strong>
        </li>
        <li>
          intérêts : <strong>
            {formatCurrency(mortgageResult.totalInterests)}
          </strong>
        </li>
        <li>
          assurances : <strong>
            {formatCurrency(mortgageResult.totalInsurances)}
          </strong>
        </li>
      </ul>
      {#each mortgageResult.totalsPaid || [] as [name, total]}
        <div class="ps-2">
          <strong class="text-amber-600">{name}</strong>
          :
          <span>{formatCurrency(total)}</span>
        </div>
      {/each}
    </fieldset>
  </details>
</main>
