<template>
  <h2>{{ site?.domainAddress }}</h2>
  <h3>Cookies</h3>
  <div class="cards">
    <div v-for="cookie in site.cookies" :key="cookie.name">
      <div class="card-label">Name: {{ cookie.name }}</div>
      <div class="card-value">Value: {{ cookie.value }}</div>
    </div>
  </div>
  <h3>Local Storage</h3>
  <pre class="json-display">{{ formattedJson }}</pre>
</template>
<script>
export default {
  props: ["site"],
  computed: {
    formattedJson() {
      return this.syntaxHighlight(this.site.localStorage);
    },
  },
  methods: {
    syntaxHighlight(json) {
      if (typeof json !== "string") {
        json = JSON.stringify(json, undefined, 2);
      }
      json = json
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return json.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\\-]?\d+)?)/g,
        function (match) {
          var cls = "number";
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = "key";
            } else {
              cls = "string";
            }
          } else if (/true|false/.test(match)) {
            cls = "boolean";
          } else if (/null/.test(match)) {
            cls = "null";
          }
          return '<span class="' + cls + '">' + match + "</span>";
        }
      );
    },
  },
};
</script>
<style scoped>
.cards {
  display: block;
  flex-wrap: wrap;
}

.card {
  display: inline-block;
  flex-direction: column;
  border-radius: 5px;
}

.card-label {
  font-weight: bold;
  margin-bottom: 10px;
}

.json-display {
  font-family: monospace;
  white-space: pre-wrap;
}

.json-display .string {
  color: green;
}

.json-display .number {
  color: darkorange;
}

.json-display .boolean {
  color: blue;
}

.json-display .null {
  color: magenta;
}

.json-display .key {
  color: red;
}
</style>
