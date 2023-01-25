<template>
  <CCard>
    <CCardBody>
      <CCardHeader>
        <strong> File a complaint</strong>
      </CCardHeader>
      <br />
      <CForm
        class="row g-3"
        novalidate
        :validated="validatedComplaint"
        @submit="handleSubmitComplaint"
      >
        <CFormFeedback invalid>
          You must contact the tracker before submitting.
        </CFormFeedback>
        <CCol xs="12">
          <CFormSwitch
            label="I have contacted the entity I wish to complain about"
            v-model="contactConfirmation"
            required
          />
        </CCol>
        <CCol xs="12">
          <CFormTextarea
            label="What kind of information was submitted to the entity?"
            rows="3"
            required
          ></CFormTextarea>
        </CCol>
        <CCol xs="12">
          <CFormTextarea
            label="How did you find that you have been tracked?"
            rows="3"
            required
          ></CFormTextarea>
        </CCol>
        <CCol xs="12">
          <CFormTextarea
            label="Which of your rights were violated?"
            rows="3"
            required
          ></CFormTextarea>
        </CCol>
        <CCol md="12">
          <CFormSelect
            label="A Site That Tracked You"
            :options="siteData.options"
            @change="handleSitePick"
            v-model="trackingSite"
            required
          ></CFormSelect>
        </CCol>
        <CCol md="6">
          <CFormInput
            label="Site Owner Name"
            required
            v-model="siteOwnerName"
          />
        </CCol>
        <CCol md="6">
          <CFormInput
            label="Site Owner Registration Number"
            required
            v-model="siteOwnerRegNr"
          />
        </CCol>
        <CCol xs="12">
          <CFormInput
            label="Site Owner Address"
            placeholder="1234 Main St"
            required
            v-model="siteOwnerAddress"
          />
        </CCol>
        <CCol md="6">
          <CFormInput
            label="Site Owner Phone Number"
            required
            v-model="siteOwnerPhone"
          />
        </CCol>
        <CCol md="6">
          <CFormSelect
            label="Your Relation to the Site Owner"
            :options="[
              { label: 'Client', value: '1' },
              { label: 'Employee', value: '2' },
              { label: 'No Relation', value: '3', disabled: true },
            ]"
            required
          >
          </CFormSelect>
        </CCol>
        <CCol md="6">
          <CFormInput label="Your First Name" required v-model="firstName" />
        </CCol>
        <CCol md="6">
          <CFormInput label="Your Last Name" required v-model="lastName" />
        </CCol>
        <CCol md="6">
          <CFormInput
            label="Your Personal Code"
            required
            v-model="personalCode"
          />
        </CCol>
        <CCol md="6">
          <CFormInput
            label="Your email"
            type="email"
            required
            v-model="emailAddress"
          />
        </CCol>
        <CCol xs="12">
          <CButton type="submit">Create Complaint</CButton>
        </CCol>
      </CForm>
    </CCardBody>
  </CCard>
</template>

<script>
import { ref, onMounted } from 'vue'
import moment from 'moment'

export default {
  name: 'Complaint',
  setup() {
    let contactConfirmation = false
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
      contactConfirmation,
    }
  },
  data: () => {
    return {
      validatedComplaint: null,
      siteOwnerName: '',
      siteOwnerAddress: '',
      siteOwnerPhone: '',
      siteOwnerRegNr: '',
      trackingSite: '',
      firstName: '',
      lastName: '',
      personalCode: '',
      emailAddress: '',
    }
  },
  methods: {
    handleSubmitComplaint(event) {
      const form = event.currentTarget
      if (form.checkValidity() === false) {
        event.preventDefault()
        event.stopPropagation()
      }
      this.validatedComplaint = true
      const requestData = {
        siteOwnerName: this.siteOwnerName,
        siteOwnerAddress: this.siteOwnerAddress,
        siteOwnerPhone: this.siteOwnerPhone,
        siteOwnerRegNr: this.siteOwnerRegNr,
        trackingSite: this.trackingSite,
        firstName: this.firstName,
        lastName: this.lastName,
        personalCode: this.personalCode,
        emailAddress: this.emailAddress,
        complaintDate: moment().format('DD.MM.YYYY'),
      }
      fetch('http://localhost:3000/api/docs/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })
        .then((response) => {
          if (response.ok) {
            let filename = `${this.firstName}${this.lastName}-DVI-Complaint.docx`
            return response.blob().then((b) => ({ b, filename }))
          }
          throw new Error('Failed to fetch file')
        })
        .then(({ b, filename }) => {
          let url = URL.createObjectURL(b)
          let a = document.createElement('a')
          document.body.appendChild(a)
          a.style = 'display: none'
          a.href = url
          a.download = filename
          a.click()
          window.URL.revokeObjectURL(url)
        })
        .catch((error) => console.error(error))
    },
    handleSitePick(event) {
      const selectedOwner = this.sites
        .filter((site) => site.domainAddress === event.currentTarget.value)
        .map((site) => site.owners)[0][0]
      // console.log(JSON.stringify(selectedOwners[0][0]))
      this.siteOwnerName = selectedOwner.name
      this.siteOwnerAddress = selectedOwner.address
      this.siteOwnerPhone = selectedOwner.phone
      this.siteOwnerRegNr = selectedOwner.regNr
    },
  },
  computed: {
    siteData() {
      return {
        options: this.sites.map((site) => {
          return {
            label: site.domainAddress,
            value: site.domainAddress,
          }
        }),
      }
    },
  },
}
</script>
