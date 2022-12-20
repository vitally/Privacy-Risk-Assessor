<template>
  <h2>{{ site.domainAddress }}</h2>
  <p>{{ site.cookies.length }}</p>
</template>

<script>
export default {
  props: ["site"],
};
</script>
