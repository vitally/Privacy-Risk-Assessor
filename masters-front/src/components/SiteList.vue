<template>
  <SiteItem
    v-for="site in sites"
    :key="site._id"
    @click="$emit('showSiteDetails', site)"
  >
    <template #icon>
      <DocumentationIcon />
    </template>
    <template #heading>{{ site.domainAddress }}</template>
    Cookies: {{ site.cookies.length }}
    <br />
    LocalStorage: {{ Object.keys(site.localStorage).length }}
  </SiteItem>
</template>
<script>
import SiteItem from "./SiteItem.vue";
import { ref, onMounted } from "vue";

export default {
  components: {
    SiteItem,
  },
  emits: ["showSiteDetails"],
  setup() {
    const sites = ref([]);

    onMounted(async () => {
      const response = await fetch("http://localhost:3000/api/sites");
      const data = await response.json();
      sites.value = data;
    });

    return {
      sites,
    };
  },
};
</script>
