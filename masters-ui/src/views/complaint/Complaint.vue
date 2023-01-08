<template>
  <CCard>
    <CCardBody>
      <CCardHeader>
        <strong> File a complaint</strong>
      </CCardHeader>
      <br />
      <CForm class="row g-3">
        <CCol xs="12">
          <CFormSwitch
            label="I have contacted the entity I wish to complain about"
            v-model="contactConfirmation"
          />
        </CCol>
        <CCol xs="12">
          <CFormTextarea
            label="What kind of information was submitted to the entity?"
            rows="3"
          ></CFormTextarea>
        </CCol>
        <CCol xs="12">
          <CFormTextarea
            label="How did you find that you have been tracked?"
            rows="3"
          ></CFormTextarea>
        </CCol>
        <CCol xs="12">
          <CFormTextarea
            label="Which of your rights were violated?"
            rows="3"
          ></CFormTextarea>
        </CCol>
        <CCol md="12">
          <CFormSelect
            :options="[
              'Which site did track you?',
              { label: 'delfi.lv', value: '1' },
              { label: 'lsm.lv', value: '2' },
              { label: 'ss.lv', value: '3', disabled: true },
            ]"
          >
          </CFormSelect>
        </CCol>
        <CCol md="6">
          <CFormInput label="Site Owner Name" />
        </CCol>
        <CCol md="6">
          <CFormInput label="Site Owner Registration Number" />
        </CCol>
        <CCol xs="12">
          <CFormInput label="Site Owner Address" placeholder="1234 Main St" />
        </CCol>
        <CCol md="6">
          <CFormInput label="Site Owner Phone Number" />
        </CCol>
        <CCol md="6">
          <CFormSelect
            label="Your Relation to the Site Owner"
            :options="[
              { label: 'Client', value: '1' },
              { label: 'Employee', value: '2' },
              { label: 'No Relation', value: '3', disabled: true },
            ]"
          >
          </CFormSelect>
        </CCol>
        <CCol md="6">
          <CFormInput label="Your First Name" />
        </CCol>
        <CCol md="6">
          <CFormInput label="Your Last Name" />
        </CCol>
        <CCol md="6">
          <CFormInput label="Your Personal Code" />
        </CCol>
        <CCol md="6">
          <CFormInput label="Your email" type="email" />
        </CCol>
        <CCol xs="12">
          <CButton type="submit">Create Complaint</CButton>
        </CCol>
      </CForm>
    </CCardBody>
  </CCard>
</template>

<script>
import { ref } from 'vue'
import moment from 'moment'
import { Buffer } from 'buffer'

export default {
  name: 'Requests',
  setup() {
    const response = ref({})
    const site = ref('')
    let contactConfirmation = false
    return {
      response,
      site,
      contactConfirmation,
    }
  },
  methods: {
    async submitSiteForCheck() {
      const base64SiteAddress = Buffer.from(this.site).toString('base64')
      const siteCheckResponse = await fetch(
        `http://localhost:3000/api/sites/${base64SiteAddress}`,
      )
      const data = await siteCheckResponse.json()
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
}
</script>
