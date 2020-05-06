<script>
  import { count } from "../store/store.js";

  function handClick() {
    count.update(n => n + 1);
  }
</script>

<style>
  button {
    background-color: #f76027;
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 0.5rem;
    text-transform: uppercase;
    cursor: pointer;
  }
</style>

<button on:click={handClick}>Click {$count === 0 ? '' : $count}</button>
