<template>
  <CListGroup>
    <CListGroupItem component="button" v-for="site in sites" :key="site._id">
      <div class="d-flex w-100 justify-content-between">
        <h5 class="mb-1">{{ site.domainAddress }}</h5>
        <!-- <small> {{ formattedDate(site.visitDate) }}</small> -->
      </div>
      <CBadge v-if="site.cookies.length" color="primary">
        {{ site.cookies.length }} Cookies
      </CBadge>
      <CBadge v-if="Object.keys(site.localStorage).length" color="info">
        {{ Object.keys(site.localStorage).length }} Local Storage properties
      </CBadge>
    </CListGroupItem>
  </CListGroup>
</template>
<script>
import { CListGroup, CListGroupItem, CBadge } from "@coreui/vue";

import { ref, onMounted } from "vue";

export default {
  components: {
    CListGroup,
    CListGroupItem,
    CBadge,
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
  computed: {
    formattedDate(date) {
      const dateDisplayOptions = {
        year: "numeric",
        month: "short",
        day: "numeric",
      };
      return date.toLocaleDateString(undefined, dateDisplayOptions);
    },
  },
};
</script>
