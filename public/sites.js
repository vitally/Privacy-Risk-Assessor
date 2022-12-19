import { ref } from 'vue';
import axios from 'axios';

export default {
  data(){
    const sites = ref([]);
    axios.get('/api/sites').then(response => {
      sites.value = response.data;
    });
    return { sites };
  },
  template:
  `<div>
    <ul>
      <li v-for="site in sites" :key="item._id">{{ site.domainAddress }}</li>
    </ul>
  </div>`
}
