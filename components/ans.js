/* eslint-disable */

class ANS {
  constructor(_model) {
    // declare the instance variables
    this._model = _model;

    this._d_map_hp = 0;
    this._d_map_cont = 0;
    this._d_map_venpool = 0;
    this.d_map_res = 0;

    this._d_lungvol_hp = 0;
    this._d_po2_hp = 0;
    this._d_pco2_hp = 0;

    this._d_po2_ve = 0;
    this._d_pco2_ve = 0;
    this._d_ph_ve = 0;

    this._a_map = 0;
    this._a_lungvol = 0;
    this._a_po2 = 0;
    this._a_pco2 = 0;
    this._a_ph = 0;

    this._update_timer = 0;
    this.ans_update_interval = 0.015;
  }

  activationCurve(value, saturation, operating_point, threshold) {
    let activation = 0;

    if (value >= saturation) {
      activation = saturation - operating_point;
    } else {
      if (value <= threshold) {
        activation = threshold - operating_point;
      } else {
        activation = value - operating_point;
      }
    }
    return activation;
  }
  modelStep() {
    if (this.is_enabled) {
      if (this._update_timer >= this.ans_update_interval) {
        this._update_timer = 0;
        this.modelCycle();
      }
      this._update_timer += this._model.modeling_stepsize;
    }
  }

  modelCycle() {
    // calculate the acidbase and oxygenation in the relevant compartments
    this._model.acidbase(this._model.components["AA"], this._model);
    this._model.oxygenation(this._model.components["AA"], this._model);

    this._model.acidbase(this._model.components["AD"], this._model);
    this._model.oxygenation(this._model.components["AD"], this._model);

    this._model.acidbase(this._model.components["IVC"], this._model);
    this._model.oxygenation(this._model.components["IVC"], this._model);

    this._model.acidbase(this._model.components["SVC"], this._model);
    this._model.oxygenation(this._model.components["SVC"], this._model);

    let t = this.ans_update_interval; // in sec

    // calculate the activation values
    this._a_map = this.activationCurve(
      this._model.components["AA"].pres,
      this.sa_map,
      this.op_map,
      this.th_map
    );
    this._a_lungvol = this.activationCurve(
      this._model.components["AA"].pres,
      this.sa_lungvol,
      this.op_lungvol,
      this.th_lungvol
    );
    this._a_po2 = this.activationCurve(
      this._model.components["AA"].po2,
      this.sa_po2,
      this.op_po2,
      this.th_po2
    );
    this._a_pco2 = this.activationCurve(
      this._model.components["AA"].pco2,
      this.sa_pco2,
      this.op_pco2,
      this.th_pco2
    );
    this._a_ph = this.activationCurve(
      this._model.components["AA"].ph,
      this.sa_ph,
      this.op_ph,
      this.th_ph
    );

    this._d_map_hp =
      t * ((1 / this.tc_map_hp) * (-this._d_map_hp + this._a_map)) +
      this._d_map_hp;
    this._d_lungvol_hp =
      t * ((1 / this.tc_lungvol_hp) * (-this._d_lungvol_hp + this._a_lungvol)) +
      this._d_lungvol_hp;
    this._d_po2_hp =
      t * ((1 / this.tc_po2_hp) * (-this._d_po2_hp + this._a_po2)) +
      this._d_po2_hp;
    this._d_pco2_hp =
      t * ((1 / this.tc_pco2_hp) * (-this._d_pco2_hp + this._a_pco2)) +
      this._d_pco2_hp;

    this._d_po2_ve =
      t * ((1 / this.tc_po2_ve) * (-this._d_po2_ve + this._a_po2)) +
      this._d_po2_ve;
    this._d_pco2_ve =
      t * ((1 / this.tc_pco2_ve) * (-this._d_pco2_ve + this._a_pco2)) +
      this._d_pco2_ve;
    this._d_ph_ve =
      t * ((1 / this.tc_ph_ve) * (-this._d_ph_ve + this._a_ph)) + this._d_ph_ve;

    this._d_map_cont =
      t * ((1 / this.tc_map_cont) * (-this._d_map_cont + this._a_map)) +
      this._d_map_cont;
    this._d_map_venpool =
      t * ((1 / this.tc_map_venpool) * (-this._d_map_venpool + this._a_map)) +
      this._d_map_venpool;
    this.d_map_res =
      t * ((1 / this.tc_map_res) * (-this.d_map_res + this._a_map)) +
      this.d_map_res;

    if (this.is_enabled) {
      // # calculate the heartrate
      this._model.components.ecg["heart_rate"] =
        60000.0 /
        (60000.0 / this._model.components.ecg["heart_rate_ref"] +
          this.g_map_hp * this._d_map_hp +
          this.g_pco2_hp * this._d_pco2_hp +
          this.g_po2_hp * this._d_po2_hp +
          this.g_lungvol_hp * this._d_lungvol_hp);

      // calculate the target exhaled minute volume
      this._model.components.breathing["target_minute_volume"] =
        this._model.components.breathing["ref_minute_volume"] +
        this.g_ph_ve * this._d_ph_ve +
        this.g_pco2_ve * this._d_pco2_ve +
        this.g_po2_ve * this._d_po2_ve;

      if (this._model.components.breathing["target_minute_volume"] < 0) {
        this._model.components.breathing["target_minute_volume"] = 0;
      }
    }
  }
}
