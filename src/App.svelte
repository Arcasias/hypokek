<script lang="ts">
  import { computeMortgage, sum, type Loaner } from "./lib/utils";

  function addLoaner() {
    loaners.push({ ...DEFAULT_LOANER_VALUES });
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
      remaining / (loaners.length - (targetLoaner ? 1 : 0));
    for (const loaner of loaners) {
      if (loaner === targetLoaner) {
        continue;
      }
      loaner.share = sharePerLoaner;
    }
  }

  function removeLoaner(loaner: Loaner) {
    loaners = loaners.filter((l) => l !== loaner);
    updateShares();
  }

  const DEFAULT_LOANER_VALUES = {
    name: "",
    equity: 0,
    owner: false,
    share: 0,
  };
  const LOCALE = "fr-BE";
  const STORAGE_KEY = "mortgage-data";

  const currencyFormatter = new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: "EUR",
  });
  const percentFormatter = new Intl.NumberFormat(LOCALE, {
    style: "percent",
    maximumFractionDigits: 2,
  });

  const storageData = localStorage.getItem(STORAGE_KEY);
  const defaultValues = storageData
    ? JSON.parse(storageData)
    : {
        principal: 450_000,
        durations: [20, 25, 30],
        fixedRate: 3,
        mandatoryInsurance: 0,
        loaners: [{ ...DEFAULT_LOANER_VALUES, share: 100 }],
      };

  let fixedRate = $state(defaultValues.fixedRate);
  let principal = $state(defaultValues.principal);
  let durations = $state(defaultValues.durations);
  let mandatoryInsurance = $state(defaultValues.mandatoryInsurance);
  let loaners = $state<Loaner[]>(defaultValues.loaners);

  let mortgageResults = $derived(
    computeMortgage(
      principal,
      durations,
      fixedRate,
      mandatoryInsurance,
      loaners,
    ),
  );
  $effect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        fixedRate,
        principal,
        durations,
        mandatoryInsurance,
        loaners,
      }),
    );
  });
</script>

<main
  class="w-screen h-screen flex flex-col items-center justify-center gap-8 p-5"
>
  <div class="flex flex-col gap-5 overflow-auto w-full md:flex-row md:w-auto">
    <form
      action="#"
      class="flex flex-col gap-3"
      onsubmit={(ev) => ev.preventDefault()}
    >
      <h2 class="font-bold text-xl py-1 border-b-2 border-slate-300">
        Paramètres ⚙️
      </h2>
      <label
        class="flex items-center text-nowrap gap-2 select-none"
        for="principal"
      >
        Prix total :
        <input
          id="principal"
          class="w-full px-1 border-b-2 border-amber-500"
          type="number"
          bind:value={principal}
        />
        €
      </label>
      <label
        for="fixedRate"
        class="flex items-center text-nowrap gap-2 select-none"
      >
        Taux fixe :
        <input
          id="fixedRate"
          class="w-full px-1 border-b-2 border-amber-500"
          type="number"
          bind:value={fixedRate}
        />
        %
      </label>
      <label
        class="flex items-center text-nowrap gap-2 select-none"
        for="mandatoryInsurance"
      >
        Assurances obligatoires :
        <input
          id="mandatoryInsurance"
          class="w-full px-1 border-b-2 border-amber-500"
          type="number"
          bind:value={mandatoryInsurance}
        />
        €
      </label>
      <ul class="flex flex-col gap-3">
        {#each loaners as loaner, index}
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
              <input
                id="{loanerId}-equity"
                class="w-full px-1 border-b-2 border-amber-500"
                type="number"
                bind:value={loaner.equity}
              />
              €
            </label>
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
              <input
                id="{loanerId}-share"
                type="number"
                class="w-12 text-right"
                bind:value={loaner.share}
                oninput={() => updateShares(loaner)}
              />
              %
            </label>
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
    </form>
    <div class="flex flex-col gap-3">
      <h2 class="font-bold text-xl py-1 border-b-2 border-slate-300">
        Frais 💸
      </h2>
      <ul class="flex flex-col gap-2">
        {#each Object.entries(mortgageResults.fees) as [name, value]}
          <li>
            <span class="text-nowrap">{name} :</span>
            <strong>{formatCurrency(value)}</strong>
          </li>
        {/each}
      </ul>
      <h3 class="p-2 border-2 border-amber-600 rounded-lg">
        Total : <strong class="text-amber-600">
          {formatCurrency(sum(Object.values(mortgageResults.fees)))}
        </strong>
      </h3>
    </div>
  </div>
  <div class="flex flex-col gap-3 overflow-auto w-full md:w-auto">
    <h2 class="font-bold text-xl py-1 border-b-2 border-slate-300">
      Options de prêts 📈
    </h2>
    <div>
      Montant: <strong>{formatCurrency(mortgageResults.principal)}</strong>
    </div>
    <ul class="flex flex-col gap-3 md:flex-row overflow-auto">
      {#each mortgageResults.loans as loan (loan.duration)}
        <li class="border border-amber-600 rounded-xl overflow-clip">
          <h3 class="bg-amber-600 text-white font-bold py-2 px-3">
            Durée : <strong>{loan.duration}</strong>
            ans
          </h3>
          <fieldset class="flex flex-col gap-1 p-2">
            <div>
              TAEG : <strong>{formatPercent(loan.taeg)}</strong>
            </div>
            <div>
              Mensualités : <strong>
                {formatCurrency(loan.monthlyPayment)}
              </strong>
            </div>
            {#each loan.monthlyPayments || [] as [name, payment]}
              <div class="ps-2">
                <strong class="text-amber-600">{name}</strong>
                :
                <span>{formatCurrency(payment)}</span>
              </div>
            {/each}
            <div>
              Total : <strong>{formatCurrency(loan.totalPaid)}</strong>
            </div>
            {#each loan.totalsPaid || [] as [name, total]}
              <div class="ps-2">
                <strong class="text-amber-600">{name}</strong>
                :
                <span>{formatCurrency(total)}</span>
              </div>
            {/each}
            <div>
              Total intérêts : <strong>
                {formatCurrency(loan.totalInterest)}
              </strong>
            </div>
            {#if loan.totalInsurance}
              <div>
                Total assurances : <strong>
                  {formatCurrency(loan.totalInsurance)}
                </strong>
              </div>
            {/if}
          </fieldset>
        </li>
      {/each}
    </ul>
  </div>
</main>
