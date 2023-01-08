<template>
  <CChartBar :data="siteData" />
  <CRow>
    <CCol>
      <CCard class="mb-4">
        <CCardHeader>
          <strong>Visited Sites</strong>
        </CCardHeader>
        <CCardBody>
          <CTable align="middle" class="mb-0 border" hover responsive>
            <CTableHead color="light">
              <CTableRow>
                <CTableHeaderCell>Site Address</CTableHeaderCell>
                <CTableHeaderCell>Visit Date</CTableHeaderCell>
                <CTableHeaderCell>Cookies</CTableHeaderCell>
                <CTableHeaderCell>Local Storage</CTableHeaderCell>
                <CTableHeaderCell>Requests</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              <CTableRow v-for="site in sites" :key="site._id">
                <CTableDataCell>
                  <strong>{{ site.domainAddress }}</strong>
                  <div v-for="owner in site.owners" :key="owner._id">
                    <span v-if="owner.name">{{ owner.name }}</span>
                  </div>
                </CTableDataCell>
                <CTableDataCell>
                  <strong>{{ formatDate(site.visitDate)[0] }}</strong>
                  <div class="small text-medium-emphasis">
                    {{ formatDate(site.visitDate)[1] }}
                  </div>
                </CTableDataCell>
                <CTableDataCell>{{ site.cookies?.length }}</CTableDataCell>
                <CTableDataCell>
                  {{
                    site.localStorage &&
                    Object.entries(site.localStorage).length > 0
                      ? Object.entries(site.localStorage).length
                      : ''
                  }}
                </CTableDataCell>
                <CTableDataCell>{{ site.requests?.length }}</CTableDataCell>
              </CTableRow>
            </CTableBody>
          </CTable>
        </CCardBody>
      </CCard>
    </CCol>
  </CRow>
</template>

<script>
import { ref, onMounted } from 'vue'
import moment from 'moment'
import { CChartBar } from '@coreui/vue-chartjs'

export default {
  name: 'Sites',
  components: { CChartBar },
  setup() {
    const sites = ref([])

    onMounted(async () => {
      const response = await fetch(
        'http://localhost:3000/api/sites/completeInfo',
      )
      const data = await response.json()
      data.sort((a, b) => b.requests.length - a.requests.length)
      sites.value = data.filter((site) => site.domainAddress)
    })

    return {
      sites,
    }
  },
  methods: {
    formatDate(value) {
      if (value) {
        return [
          moment(String(value)).fromNow(),
          moment(String(value)).format('DD.MM.YYYY HH:mm'),
        ]
      }
    },
  },
  computed: {
    siteData() {
      return {
        labels: this.sites.slice(0, 20).map((site) => site.domainAddress),
        datasets: [
          {
            label: 'Requests',
            data: this.sites.slice(0, 20).map((site) => site.requests.length),
            backgroundColor: '#f87979',
          },
          {
            label: 'Cookies',
            data: this.sites.slice(0, 20).map((site) => site.cookies?.length),
            backgroundColor: '#79f879',
          },
          {
            label: 'Local Storage',
            data: this.sites
              .slice(0, 20)
              .map((site) =>
                site.localStorage
                  ? Object.entries(site.localStorage).length
                  : 0,
              ),
            backgroundColor: '#7979f8',
          },
        ],
      }
    },
  },
}
</script>
