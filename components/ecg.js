/* eslint-disable */

class ECG {
  constructor(_model) {
    this._model = {};

    this.ecg_signal = 0;
    this.measured_heartrate = 0;
    this.normalQRSWave = [-8, 3, 96, -104, 4, 9, 0, 0];
    this.ventQRSWave = [-25, 20, 50, -150, 20, 20, 20, 15, 10, 10, 10];

    this._p_wave_signal_counter = 0;
    this._qrs_wave_signal_counter = 0;
    this._t_wave_signal_counter = 0;

    this._prev_p_signal = 0;
    this._prev_t_signal = 0;

    this._sa_node_period = 0;
    this._sa_node_counter = 0;

    this._pq_time_counter = 0;
    this._pq_running = false;

    this._qrs_time_counter = 0;
    this._qrs_running = false;

    this._qt_time_counter = 0;
    this._qt_running = false;

    this._ventricle_is_refractory = false;

    this._measured_heartrate_time_counter = 0;
    this._measured_heartrate_qrs_counter = 0;

    this._model = _model;
    this._update_timer = 0;

    this.ecg_update_interval = 0.015;
  }

  qtc() {
    if (this.heart_rate > 0) {
      return this.qt_time * Math.sqrt(60.0 / this.heart_rate);
    } else {
      return this.qt_time * Math.sqrt(60.0 / 10.0);
    }
  }
  modelStep() {
    if (this.is_enabled) {
      this.modelCycle();
    }
  }

  modelCycle() {
    // the ecg is updated every modeling_interval and not every modeling_stepsize
    // for performance reasons
    if (this._update_timer >= this.ecg_update_interval) {
      this._update_timer = 0;
      this.updateECG(this.ecg_update_interval);
    }
    this._update_timer += this._model.modeling_stepsize;
  }

  updateECG(model_interval) {
    // calculate the corrected qt time
    this.cqt_time = this.qtc() - this.qrs_time;

    // calculate the sa_node_time in seconds depending on the heartrate
    if (this.heart_rate > 0) {
      this._sa_node_period = 60 / this.heart_rate;
    } else {
      this._sa_node_period = 60;
    }

    // has the sa node period elapsed
    if (this._sa_node_counter > this._sa_node_period) {
      this._sa_node_counter = 0;
      this._pq_running = true;
      this.ncc_atrial = 0;
    }

    // has the pq time elapsed?
    if (this._pq_time_counter > this.pq_time) {
      this._pq_time_counter = 0;
      this._pq_running = false;
      if (this._ventricle_is_refractory === false) {
        this._qrs_running = true;
        this.ncc_ventricular = 0;
        this._measured_heartrate_qrs_counter += 1;
      }
    }

    if (this._measured_heartrate_qrs_counter > 5) {
      this.measured_heartrate =
        60 /
        (this._measured_heartrate_time_counter /
          this._measured_heartrate_qrs_counter);
      this._measured_heartrate_qrs_counter = 0;
      this._measured_heartrate_time_counter = 0;
    }

    // has the qrs time elapsed?
    if (this._qrs_time_counter > this.qrs_time) {
      this._qrs_time_counter = 0;
      this.ecg_signal = 0;
      this._qrs_running = false;
      this._qt_running = true;
      this._ventricle_is_refractory = true;
    }

    // has the qt time elapsed?
    if (this._qt_time_counter > this.cqt_time) {
      this._qt_time_counter = 0;
      this._qt_running = false;
      this._ventricle_is_refractory = false;
    }

    // increase the counters
    this._measured_heartrate_time_counter += model_interval;

    this._sa_node_counter += model_interval;
    // only increase the timers when running
    if (this._pq_running) {
      this._pq_time_counter += model_interval;
      this.buildDynamicPWave();
      this._p_wave_signal_counter += 1;
    } else {
      this._p_wave_signal_counter = 0;
    }
    if (this._qrs_running) {
      this._qrs_time_counter += model_interval;
      this.buildQRSWave();
      this._qrs_wave_signal_counter += 1;
    } else {
      this._qrs_wave_signal_counter = 0;
    }
    if (this._qt_running) {
      this._qt_time_counter += model_interval;
      this.buildDynamicTWave();
      this._t_wave_signal_counter += 1;
    } else {
      this._t_wave_signal_counter = 0;
    }

    if (
      this._pq_running === false &&
      this._qrs_running === false &&
      this._qt_running === false
    ) {
      this.ecg_signal = 0;
    }

    this._model.components.ecg["ecg_signal"] = this.ecg_signal;
    this._model.components.ecg["measured_heartrate"] = this.measured_heartrate;
  }
  buildDynamicPWave() {
    let duration = this._model.components.ecg["pq_time"];
    let amp_p = this._model.components.ecg["amp_p"];
    let width_p = this._model.components.ecg["width_p"];
    let skew_p = this._model.components.ecg["skew_p"];

    let new_p_signal =
      amp_p *
      Math.exp(
        -width_p *
          (Math.pow(this._pq_time_counter - duration / skew_p, 2) /
            Math.pow(duration, 2))
      );
    let delta_p = new_p_signal - this._prev_p_signal;
    this.ecg_signal += delta_p;
    this._prev_p_signal = new_p_signal;
  }
  buildQRSWave() {
    if (this._qrs_wave_signal_counter < this.normalQRSWave.length) {
      this.ecg_signal += this.normalQRSWave[this._qrs_wave_signal_counter];
    } else {
      this._qrs_wave_signal_counter = 0;
    }
  }
  buildDynamicTWave() {
    let duration = this.cqt_time;
    let amp_t = this._model.components.ecg["amp_t"];
    let width_t = this._model.components.ecg["width_t"];
    let skew_t = this._model.components.ecg["skew_t"];

    let new_t_signal =
      amp_t *
      Math.exp(
        -width_t *
          (Math.pow(this._qt_time_counter - duration / skew_t, 2) /
            Math.pow(duration, 2))
      );
    let delta_t = new_t_signal - this._prev_t_signal;
    this.ecg_signal += delta_t;
    this._prev_t_signal = new_t_signal;
  }
}
