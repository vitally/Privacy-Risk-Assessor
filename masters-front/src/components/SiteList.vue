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
    <div>
      <span v-if="site.cookies.length">🍪</span>
      <span v-if="Object.keys(site.localStorage).length">💿</span>
    </div>
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
