<script>
  let someText = `Frontend Developer`;
  let count = 0;
  let styles = { darkMode: false };

  function handleClick() {
    count += 1;
  }

  function toggle() {
    styles.darkMode = !styles.darkMode;
    console.log(styles.darkMode);
    window.document.body.classList.toggle("dark-mode");
  }
</script>

<style>
  p {
    color: var(--theme-color);
  }
</style>

<div class="About">

  {#if !styles.darkMode}
    <!-- separar en estructura con div, recomendado  -->
    <p>{someText}</p>
  {:else}
    <p>
      <span>Hello DarkMode</span>
    </p>
  {/if}

  <button on:click={handleClick} role="button">
    Click {count === 0 ? '' : count}
  </button>
  <button on:click={toggle}>DarkMode</button>
</div>
