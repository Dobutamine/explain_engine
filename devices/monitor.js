/* eslint-disable */

class Monitor {
  constructor(_model) {
    this._model = _model;

    this.heart_rate = 0
    this.saO2_pre = 0
    this.saO2_post = 0
    this.svO2 = 0
    this.abp_syst = 0
    this.abp_diast = 0
    this.abp_mean = 0
    this.pap_syst = 0
    this.pap_diast = 0
    this.pap_mean = 0
    this.cvp = 0
    this.resp_rate = 0
    this.etco2 = 0
    this.temperature = 0

    this.ivc_flow = 0
    this.svc_flow = 0
    this.ofo_flow = 0
    this.vsd_flow = 0
    this.pda_flow = 0
    this.kidney_flow = 0
    this.liver_flow = 0
    this.brain_flow = 0
    this.myo_flow = 0
    this.lungshunt_flow = 0
    this.lvo = 0
    this.rvo = 0
    this.lv_stroke = 0
    this.rv_stroke = 0

    this.pao2 = 0
    this.paco2 = 0
    this.ph = 0
    this.hco3 = 0
    this.be = 0
    this.pAO2 = 0
    this.pACO2 = 0

    this.ecg_signal = 0
    this.abp_signal = 0
    this.pap_signal = 0
    this.cvp_signal = 0
    this.etco2_signal = 0
    this.resp_signal = 0

    // state variables
    this._abp_max = -1000
    this._abp_min = 1000
    this._pap_max = -1000
    this._pap_min = 1000
    this._cvp_max = -1000
    this._cvp_min = 1000
  
    this._ivc_flow_counter = 0
    this._svc_flow_counter = 0
    this._lvo_counter = 0
    this._rvo_counter = 0
    this._pda_counter = 0
    this._ofo_counter = 0
    this._vsd_counter = 0
    this._kidney_flow_counter = 0
    this._brain_flow_counter = 0
    this._liver_flow_counter = 0
    this._myo_flow_counter = 0
    this._lungshunt_flow_counter = 0

    this._time_counter = 0
    this._time_start = 0
  }

  modelStep() {
    if (this.is_enabled) {
      this.modelCycle();
    }
  }

  getValueFromModel(source) {
    if (this._model.components[source[0]] != undefined) {
      if (source.length > 0) {
        return this._model.components[source[0]][source[1]]
      } else {
        return 0
      }
    }
    
  }
  modelCycle() {
    // this model is a model of the patient monitor of the future
    this.ecg_signal = this.getValueFromModel(this.ecg_signal_source)
    this.abp_signal = this.getValueFromModel(this.abp_signal_source)
    this.pap_signal = this.getValueFromModel(this.pap_signal_source)
    this.cvp_signal = this.getValueFromModel(this.cvp_signal_source)
    this.etco2_signal = this.getValueFromModel(this.etco2_signal_source)
    this.resp_signal = this.getValueFromModel(this.resp_signal_source)

    this.heart_rate = this.getValueFromModel(this.heartrate_source)
    this.resp_rate = this.getValueFromModel(this.resprate_source)
    this.saO2_pre = this.getValueFromModel(this.sao2_pre_source) * 100
    this.saO2_post = this.getValueFromModel(this.sao2_post_source) * 100
    this.svO2 = this.getValueFromModel(this.svo2_source) * 100
    this.etco2 = this.getValueFromModel(this.etco2_source)
    this.temperature = this.getValueFromModel(this.temp_source)

    this.vent_peak_presssure = this.getValueFromModel(this.vent_peak_pressure_source)
    this.vent_plateau_pressure = this.getValueFromModel(this.vent_plateau_pressure_source)
    this.vent_compliance = this.getValueFromModel(this.vent_compliance_source)
    this.vent_resistance = this.getValueFromModel(this.vent_resistance_source)
    this.vent_peep = this.getValueFromModel(this.vent_peep_source)
    this.vent_freq = this.getValueFromModel(this.vent_freq_source)
    this.vent_minute_volume = this.getValueFromModel(this.vent_minute_volume_source)
    this.vent_tidal_volume = this.getValueFromModel(this.vent_tidal_volume_source)
    this.vent_insp_flow = this.getValueFromModel(this.vent_insp_flow_source)
    this.vent_exp_flow = this.getValueFromModel(this.vent_exp_flow_source)
    this.vent_insp_time = this.getValueFromModel(this.vent_insp_time_source)



    if (this.alveolar_gas_source.length > 0) {
      this.pAO2 = (this._model.components[this.alveolar_gas_source[0]].po2 + this._model.components[this.alveolar_gas_source[1]].po2) / 2
      this.pACO2 = (this._model.components[this.alveolar_gas_source[0]].pco2 + this._model.components[this.alveolar_gas_source[1]].pco2) / 2
    }
    
    if (this.arterial_bloodgas_source !== '') {
      this.pao2 = this._model.components[this.arterial_bloodgas_source].po2
      this.paco2 = this._model.components[this.arterial_bloodgas_source].pco2
      this.hco3 = this._model.components[this.arterial_bloodgas_source].hco3p
      this.be = this._model.components[this.arterial_bloodgas_source].be
      this.ph = this._model.components[this.arterial_bloodgas_source].ph
    }
    

    if (this._model.components.ecg.ncc_ventricular === 1) {
      this.abp_syst = this._abp_max
      this.abp_diast = this._abp_min
      this.abp_mean = (this.abp_syst + (2 * this.abp_diast)) / 3

      this._abp_max = -1000
      this._abp_min = 1000

      this.pap_syst = this._pap_max
      this.pap_diast = this._pap_min
      this.pap_mean = (this.pap_syst + (2 * this.pap_diast)) / 3

      this._pap_max = -1000
      this._pap_min = 1000

      this.cvp = (this._cvp_max + (2 * this._cvp_min)) / 3

      this._cvp_max = -1000
      this._cvp_min = 1000

      this.pda_flow = (this._pda_counter / this._time_counter) * 60.0
      this._pda_counter = 0

      this.vsd_flow = (this._vsd_counter / this._time_counter) * 60.0
      this._vsd_counter = 0

      this.ofo_flow = (this._ofo_counter / this._time_counter) * 60.0
      this._ofo_counter = 0

      this.ivc_flow = (this._ivc_flow_counter / this._time_counter) * 60.0
      this._ivc_flow_counter = 0

      this.svc_flow = (this._svc_flow_counter / this._time_counter) * 60.0
      this._svc_flow_counter = 0

      this.lvo = (this._lvo_counter / this._time_counter) * 60.0
      this.lv_stroke = this._lvo_counter
      this._lvo_counter = 0

      this.rvo = (this._rvo_counter / this._time_counter) * 60.0
      this.rv_stroke = this._rvo_counter
      this._rvo_counter = 0

      this.kidney_flow = (this._kidney_flow_counter / this._time_counter) * 60.0
      this._kidney_flow_counter = 0

      this.liver_flow = (this._liver_flow_counter / this._time_counter) * 60.0
      this._liver_flow_counter = 0

      this.myo_flow = (this._myo_flow_counter / this._time_counter) * 60.0
      this._myo_flow_counter = 0

      this.brain_flow = (this._brain_flow_counter / this._time_counter) * 60.0
      this._brain_flow_counter = 0

      this.lungshunt_flow = (this._lungshunt_flow_counter / this._time_counter) * 60.0
      this._lungshunt_flow_counter = 0

      this._time_counter = 0
    }

    this._liver_flow_counter += this.getValueFromModel(this.liver_flow_source) * this._model.modeling_stepsize
    this._myo_flow_counter += this.getValueFromModel(this.myocardium_flow_source) * this._model.modeling_stepsize

    this._kidney_flow_counter += this.getValueFromModel(this.kidney_flow_source) * this._model.modeling_stepsize
    this._brain_flow_counter += this.getValueFromModel(this.brain_flow_source)* this._model.modeling_stepsize
    this._lungshunt_flow_counter += this.getValueFromModel(this.lungshunt_flow_source)* this._model.modeling_stepsize

    this._vsd_counter += this.getValueFromModel(this.vsd_flow_source) * this._model.modeling_stepsize
    this._pda_counter += this.getValueFromModel(this.pda_flow_source) * this._model.modeling_stepsize
    this._ofo_counter += this.getValueFromModel(this.ofo_flow_source) * this._model.modeling_stepsize

    this._ivc_flow_counter += this.getValueFromModel(this.ivc_flow_source) * this._model.modeling_stepsize
    this._svc_flow_counter += this.getValueFromModel(this.svc_flow_source) * this._model.modeling_stepsize

    this._lvo_counter += this.getValueFromModel(this.lvo_source) * this._model.modeling_stepsize
    this._rvo_counter += this.getValueFromModel(this.rvo_source) * this._model.modeling_stepsize

    if (this.abp_signal > this._abp_max) {
      this._abp_max = this.abp_signal
    }
    if (this.abp_signal < this._abp_min) {
      this._abp_min = this.abp_signal
    }
    if (this.pap_signal > this._pap_max) {
      this._pap_max = this.pap_signal
    }
    if (this.pap_signal < this._pap_min) {
      this._pap_min = this.pap_signal
    }
    if (this.cvp_signal > this._cvp_max) {
      this._cvp_max = this.cvp_signal
    }
    if (this.cvp_signal < this._cvp_min) {
      this._cvp_min = this.cvp_signal
    }

    this._time_counter += this._model.modeling_stepsize




  }
}