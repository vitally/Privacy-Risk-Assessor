<template>
  <CForm>
    <CInputGroup>
      <CFormInput
        type="text"
        floatingLabel="Site to check"
        placeholder="Site to check"
        v-model="site"
        @keyup.enter="submitSiteForCheck"
      />
      <CButton
        variant="outline"
        type="button"
        color="primary"
        @click="submitSiteForCheck"
      >
        Check Site
      </CButton>
    </CInputGroup>
  </CForm>
  <br />
  <CCard v-if="Object.entries(response).length > 0">
    <CCardBody>
      <CCardTitle
        >{{ response.owners[0]?.name }} ({{
          response.domainAddress
        }})</CCardTitle
      >
      <CCardSubtitle class="mb-2 text-muted">
        {{ formatDate(response.visitDate)[0] }}
      </CCardSubtitle>
      <div>
        Cookies :
        {{ response.cookies?.length ? response.cookies?.length : 0 }}
      </div>
      <div>
        Local Storage :
        {{
          response.localStorage
            ? Object.entries(response.localStorage)?.length
            : 0
        }}
      </div>
      <br />
      <CTable align="middle" class="mb-0 border" hover responsive>
        <CTableHead color="light">
          <CTableRow>
            <CTableHeaderCell>Domain Address</CTableHeaderCell>
            <CTableHeaderCell>Method Called</CTableHeaderCell>
            <CTableHeaderCell>Headers</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          <CTableRow v-for="request in response.requests" :key="request._id">
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
                    ? `${request.fullAddressWithoutParams.substring(0, 30)}...`
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
</template>

<script>
import { ref } from 'vue'
import moment from 'moment'
import { Buffer } from 'buffer'
import { CInputGroup } from '@coreui/vue'

export default {
  name: 'Requests',
  setup() {
    const response = ref({})
    const site = ref('')
    return {
      response,
      site,
    }
  },
  methods: {
    async submitSiteForCheck() {
      const base64SiteAddress = Buffer.from(this.site).toString('base64')
      const siteCheckResponse = await fetch(
        `http://localhost:3000/api/sites/${base64SiteAddress}`,
      )
      const data = await siteCheckResponse.json()
      console.log(data[0])
      this.response = data[0]
    },
    formatDate(value) {
      if (value) {
        return [
          moment(String(value)).fromNow(),
          moment(String(value)).format('DD.MM.YYYY'),
        ]
      }
    },
  },
  computed: {
    aggregatedRequests() {
      return {
        labels: this.requestsAggregatedByDomainAddress.map(
          (request) => request._id,
        ),
        datasets: [
          {
            label: 'Requests to 2nd level domains',
            data: this.requestsAggregatedByDomainAddress.map(
              (request) => request.count,
            ),
            backgroundColor: '#f87979',
          },
        ],
      }
    },
  },
  components: { CInputGroup },
}
</script>
