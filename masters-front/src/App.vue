<template>
  <header>
    <div class="wrapper">
      <SiteList @show-site-details="handleSiteDetailsEvent" />
    </div>
  </header>
  <main>
    <SiteDetails v-bind="{ site: siteDetailsEventData }" />
  </main>
</template>

<script>
import SiteDetails from "./components/SiteDetails.vue";
import SiteList from "./components/SiteList.vue";

export default {
  components: {
    SiteList,
    SiteDetails,
  },
  data() {
    return {
      siteDetailsEventData: null,
    };
  },
  methods: {
    handleSiteDetailsEvent(data) {
      this.siteDetailsEventData = data;
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
