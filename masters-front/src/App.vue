<template>
  <header>
    <div class="wrapper">
      <SiteList @show-site-details="handleSiteDetailsEvent" />
    </div>
  </header>
  <main>
    <SiteDetails site="siteDetailsEventData" />
    {{ siteDetailsEventData }}
  </main>
</template>

<script>
import SiteDetails from "./components/SiteDetails.vue";
import SiteList from "./components/SiteList.vue";
import { ref } from "vue";

const siteDetailsEventData = ref();

export default {
  components: {
    SiteList,
    SiteDetails,
  },
  methods: {
    handleSiteDetailsEvent(data) {
      siteDetailsEventData.value = data;
      console.log(siteDetailsEventData.value.domainAddress);
    },
  },
};
</script>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
