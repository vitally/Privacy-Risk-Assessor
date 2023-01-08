<template>
  <CChartBar :data="aggregatedRequests" />
  <CRow>
    <CCol>
      <CCard class="mb-4">
        <CCardHeader>
          <strong>Requests From Sites</strong>
        </CCardHeader>
        <CCardBody>
          <CTable align="middle" class="mb-0 border" hover responsive>
            <CTableHead color="light">
              <CTableRow>
                <CTableHeaderCell>Domain Address</CTableHeaderCell>
                <CTableHeaderCell>Method Called</CTableHeaderCell>
                <CTableHeaderCell>Headers</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              <CTableRow v-for="request in requests" :key="request._id">
                <CTableDataCell
                  v-c-tooltip="{ content: request.fullAddressWithoutParams }"
                >
                  <strong>
                    {{ request.domainAddress }}
                    {{
                      `(${request.siteIds.length} request${
                        request.siteIds.length > 1 ? 's' : ''
                      })`
                    }}</strong
                  >
                  <div>
                    {{
                      request.fullAddressWithoutParams.length > 50
                        ? `${request.fullAddressWithoutParams.substring(
                            0,
                            30,
                          )}...`
                        : request.fullAddressWithoutParams
                    }}
                  </div>
                </CTableDataCell>
                <CTableDataCell>
                  <div>
                    {{
                      request.postData &&
                      Object.entries(request.postData).length > 0
                        ? 'POST'
                        : 'GET'
                    }}
                  </div>
                </CTableDataCell>
                <CTableDataCell>
                  <div>
                    <strong>Last Referer: </strong>
                    <span>{{ request.headers.referer }}</span>
                  </div>
                  <div>
                    <strong>User-Agent: </strong>
                    <span>{{ request.headers['user-agent'] }}</span>
                  </div>
                </CTableDataCell>
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
  name: 'Requests',
  components: { CChartBar },
  setup() {
    const requests = ref([])
    const requestsAggregatedByDomainAddress = ref([])

    onMounted(async () => {
      const response = await fetch('http://localhost:3000/api/trackers')
      const data = await response.json()
      data.sort((a, b) => b.siteIds.length - a.siteIds.length)
      requests.value = data.filter(
        (requestData) => requestData.domainAddress.indexOf('data:') < 0,
      )

      const aggregatedRequestResponse = await fetch(
        'http://localhost:3000/api/trackers/groupByDomain',
      )
      const aggregatedData = await aggregatedRequestResponse.json()
      requestsAggregatedByDomainAddress.value = aggregatedData
        .filter(
          (aggregatedRequestData) =>
            aggregatedRequestData._id.indexOf('data:') < 0,
        )
        .filter((filteredRequestData) => filteredRequestData.count > 3)
    })

    return {
      requests,
      requestsAggregatedByDomainAddress,
    }
  },
  methods: {
    formatDate(value) {
      if (value) {
        return moment(String(value)).format('DD.MM.YYYY')
      }
    },
  },
  computed: {
    aggregatedRequests() {
      return {
        labels: this.requestsAggregatedByDomainAddress
          .slice(0, 20)
          .map((request) => request._id),
        datasets: [
          {
            label: 'Requests to 2nd level domains',
            data: this.requestsAggregatedByDomainAddress
              .slice(0, 20)
              .map((request) => request.count),
            backgroundColor: '#f87979',
          },
        ],
      }
    },
  },
}
</script>
