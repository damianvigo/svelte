<script>
  let someText = `Frontend Developer`;
  let count = 0;

  function handleClick() {
    count += 1;
  }
</script>

<style>
  p {
    color: var(--theme-color);
  }
</style>

<div class="About">
  <!-- separar en estructura con div, recomendado  -->
  <p>{someText}</p>
  <button on:click={handleClick} role="button">
    Click {count === 0 ? '' : count}
  </button>
</div>
