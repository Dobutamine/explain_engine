/* eslint-disable */
class Heart {
  constructor(_model) {

    // state properties (accessible from outside)
    this.aaf = 0.0
    this.vaf = 0.0

    // local state properties
    this._model = _model;
  }

  modelStep() {
    if (this.is_enabled) {
      this.modelCycle();
    }
  }

  // the model step function is called during every step of the model
  modelCycle() {
    const t = this._model["modeling_stepsize"];
    
    // get the relevant timings from the ecg model
    let ncc_atrial = this._model.components.ecg["ncc_atrial"]
    let atrial_duration = this._model.components.ecg["pq_time"] 
    let ncc_ventricular = this._model.components.ecg["ncc_ventricular"]
    let ventricular_duration = (this._model.components.ecg["pq_time"] + this._model.components.ecg["qrs_time"])

    // varying elastance activation function of the atria
    if (ncc_atrial >= 0 && ncc_atrial < (atrial_duration / t)) {
      this.aaf = Math.pow(Math.sin(Math.PI * (ncc_atrial / atrial_duration) * t), 2);
    } else {
      this.aaf = 0;
    }

    // varying elastance activation function of the ventricles
    if (ncc_ventricular >= 0 && ncc_ventricular < (ventricular_duration / t)) {
      this.vaf = Math.pow(Math.sin(Math.PI * (ncc_ventricular / ventricular_duration) * t), 2);
    } else {
      this.vaf = 0;
    }


    // increase the atrial and ventricular activation function timers
    this._model.components.ecg["ncc_atrial"] += 1;
    this._model.components.ecg["ncc_ventricular"] += 1;

    // transfer the activation function to the heart compartments
    this._model.components["RA"].el_act = this.aaf;
    this._model.components["RV"].el_act = this.vaf;
    this._model.components["LA"].el_act = this.aaf;
    this._model.components["LV"].el_act = this.vaf;
  }
}
