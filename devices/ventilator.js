
/* eslint-disable */
class Ventilator {
  constructor(_model) {
    this._model = _model;

    this.minute_volume = 0;
    this.exhaled_tidal_volume = 0;
    this.inspiratory_tidal_volume = 0;
    this.etco2_ventilator = 0;
    this.peak_pressure = 0;
    this.peak_pressure_before_hold = 0;
    this.plateau_pressure = 0;
    this.compliance_static = 0;
    this.resistance_airway = 0;
    this.insp_resistance = 0;
    this.volume_garanteed = true;
    this.time_constant = 0;
    this.volume = 0;
    this.flow = 0;
    this.pressure = 0;

    this._insp_volume_reached = false
    // declare the instance variables
    this._inspiration = false;
    this._expiration = true;
    this._insp_pressure_reached = false;
    this._exp_pressure_reached = false;
    this._insp_counter = 0;
    this._exp_counter = 0;
    this._peak_pressure_found = false;
    this._exhaled_tidal_volume_counter = 0;
    this._inspiratory_tidal_volume_counter = 0;

    this._found_resistance = 4000;
    this._prev_flow = 0;
    this._trigger_counter = 0;
    this.triggered_breath = false
    this._temp_insp_resistance = 0

    this.hfo_insp_time = 0
    this.hfo_exp_time = 0
    this.hfo_timer_counter = 0
    this.hfo_inspiration = true
    this.hfo_expiration = false
    this.hfo_generated_pressure = 0
    this.hfo_current_freq = 0
    this.hfo_sine_factor = 1
    this.hfo_tidal_volume = 0
    this.hfo_tidal_volume_counter = 0
    this.test = 0
    this.test2 = 0

  }

  modelStep() {
    if (this.is_enabled) {
      this._model.components['OUT_NCA'].no_flow = true
      this._model.components['TUBINGIN_YPIECE'].no_flow = false
      this._model.components['YPIECE_TUBINGOUT'].no_flow = false
      this._model.components['YPIECE_NCA'].no_flow = false
      this.modelCycle();
    }
  }


  volumeGarantee(p_atm) {
    if (
      this.exhaled_tidal_volume >
      this.target_tidal_volume + this.target_tidal_volume * 0.05
    ) {
      // decreased the max_pip
      this.pip -= 0.74;
      if (this.pip < this.peep + 2.7) {
        this.pip = this.peep + 2.7;
      }
    }
    if (
      this.exhaled_tidal_volume <
      this.target_tidal_volume - this.target_tidal_volume * 0.05
    ) {
      // decreased the max_pip
      this.pip += 0.74;
      if (this.pip > this.max_pip) {
        this.pip = this.max_pip;
      }
    }
  }

  volumeControl(p_atm) {
    // the ventilator is in pressure controlled mode.

    if (this._inspiration)
    {
      // check whether the volume has been reached, then cut the flow
      if (this._inspiratory_tidal_volume_counter >= this.target_tidal_volume) {
        this._insp_volume_reached = true
      }

      // in inspiration the inspiratory valve is open (generating flow in the system) and the expiratory valve is closed
      if (this._insp_volume_reached) {
        this._model.components["VENTIN_TUBINGIN"].r_for = 100000000000;
        this._model.components["VENTIN_TUBINGIN"].r_back = 100000000000;
        if (this._peak_pressure_found === false) {
          this.peak_pressure = this.pressure
          this._peak_pressure_found = true;
        }

      } else {
        let insp_valve_resistance = (this._model.components["VENTIN"].pres - this._model.components["TUBINGIN"].pres) / (this.insp_flow / 60);
        this._model.components["VENTIN_TUBINGIN"].r_for = insp_valve_resistance;
        this._model.components["VENTIN_TUBINGIN"].r_back = insp_valve_resistance;
      }
      
      // close the expiratory valve
      this._model.components["TUBINGOUT_VENTOUT"].r_for = 100000000000;
      this._model.components["TUBINGOUT_VENTOUT"].r_back = 100000000000;    
    }

    if (this._expiration)   
    {
      // in expiration the inspiratory valve is closed (no by the ventilator generated flow in the system) and the expiratory valve is open
      this._model.components["VENTIN_TUBINGIN"].r_for = 100000000000;
      this._model.components["VENTIN_TUBINGIN"].r_back = 100000000000;

      // open the expiratory valve
      this._model.components["TUBINGOUT_VENTOUT"].r_for = 10;
      this._model.components["TUBINGOUT_VENTOUT"].r_back = 10;
    }
  }

  setPEEP() {
    if (this.peep !== undefined) {
      this._model.components["VENTOUT"].vol =
        this._model.components["VENTOUT"].vol_u +
        this.peep /
          (this._model.components["VENTOUT"].el_min *
            this._model.components["VENTOUT"].el_min_fac);
    }
  }

  pressureReliefValve(p_atm) {
     // calculate how much volume needs to be removed by the blow off valve to keep the pressure
    if (this._model.components["TUBINGIN"].pres >= this.pip + p_atm) {
      if (this._peak_pressure_found === false) {
        this.peak_pressure = this.pressure
        this._peak_pressure_found = true;
      }
      let delta_p = this._model.components["TUBINGIN"].pres - (this.pip + p_atm); // in mmHg
      let volumeout = delta_p / (this._model.components["TUBINGIN"].el_min * this._model.components["TUBINGIN"].el_min_fac);
      this._model.components["TUBINGIN"].volOut(volumeout);
    }

  }

  pressureControl(p_atm) {
    // the ventilator is in pressure controlled mode.

    if (this._inspiration)
    {
      // in inspiration the inspiratory valve is open (generating flow in the system) and the expiratory valve is closed
      let insp_valve_resistance = (this._model.components["VENTIN"].pres - this._model.components["TUBINGIN"].pres) / (this.insp_flow / 60);
      this._model.components["VENTIN_TUBINGIN"].r_for = insp_valve_resistance;
      this._model.components["VENTIN_TUBINGIN"].r_back = insp_valve_resistance;

      // close the expiratory valve
      this._model.components["TUBINGOUT_VENTOUT"].r_for = 100000000000;
      this._model.components["TUBINGOUT_VENTOUT"].r_back = 100000000000;
    }

    if (this._expiration)   
    {
      // in expiration the inspiratory valve is closed (no by the ventilator generated flow in the system) and the expiratory valve is open
      this._model.components["VENTIN_TUBINGIN"].r_for = 100000000000;
      this._model.components["VENTIN_TUBINGIN"].r_back = 100000000000;

      // open the expiratory valve
      this._model.components["TUBINGOUT_VENTOUT"].r_for = 10;
      this._model.components["TUBINGOUT_VENTOUT"].r_back = 10;
    }

    this.pressureReliefValve(p_atm)
  
    
  }

  hfoVentilator(p_atm) {

    this.hfo_map = 10
    this.hfo_freq = 10
    this.hfo_amplitude = 20
    this.hfo_ie_ratio = 0.5

    // determine the inspiration and expiration times depending on the ratios 33% : 66%
    this.hfo_insp_time = (1 / this.hfo_freq) * 0.333
    this.hfo_exp_time = (1 / this.hfo_freq) * 0.666

    if (this.hfo_timer_counter > this.hfo_insp_time & this.hfo_inspiration === true) {
      this.hfo_inspiration = false
      this.hfo_expiration = true
      this.hfo_current_freq = 1 / this.hfo_exp_time
      this.hfo_sine_factor = -1
      this.hfo_timer_counter = 0
    }

    if (this.hfo_timer_counter > this.hfo_exp_time & this.hfo_expiration === true) {
      this.hfo_inspiration = true
      this.hfo_expiration = false
      this.hfo_current_freq = 1 / this.hfo_insp_time
      this.hfo_sine_factor = 1
      this.hfo_timer_counter = 0
      this.hfo_tidal_volume = this.hfo_tidal_volume_counter
      this.hfo_tidal_volume_counter = 0
    }
    this.hfo_timer_counter += this._model.modeling_stepsize;

     // set the MAP
    this._model.components["VENTOUT"].vol = this._model.components["VENTOUT"].vol_u + this.hfo_map / (this._model.components["VENTOUT"].el_min * this._model.components["VENTOUT"].el_min_fac);

    // open the expiratory valve
    this._model.components["TUBINGOUT_VENTOUT"].r_for = 10;
    this._model.components["TUBINGOUT_VENTOUT"].no_backflow = true

    // bias flow by calculating the resistance of the inspiratory valve depending on the desired flow and MAP
    // let insp_valve_resistance = (this._model.components["VENTIN"].pres - this._model.components["VENTOUT"].pres) / (this.hfo_bias_flow / 60);
    let insp_valve_resistance = (960 - this._model.components["VENTOUT"].pres) / (this.hfo_bias_flow / 60);
    this._model.components["VENTIN_TUBINGIN"].r_for = insp_valve_resistance;
    this._model.components["VENTIN_TUBINGIN"].no_backflow = true;

    // the timings and valve settings are now complete, now perform the pressure wave generation
    this.hfo_generated_pressure = this.hfo_amplitude * Math.sin(Math.PI * this.hfo_current_freq * this.hfo_timer_counter) * this.hfo_sine_factor

    // transfer the generated pressure to the ventilator
    this._model.components['TUBINGIN'].pres_ext = this.hfo_generated_pressure
  
    // keep track of the volumes
    if (this.hfo_expiration) {
      this.hfo_tidal_volume_counter += this._model.components['YPIECE_NCA'].real_flow * this._model.modeling_stepsize;
    }

  }

  modelCycle() {
    // reference the model parts for performance reasons

    // get the modeling stepsize
    let t = this._model.modeling_stepsize;

    // get the atmospheric pressure
    let p_atm = this._model.components["metabolism"].p_atm;

    switch (this.ventilator_mode)
    {
      case "pressure":
        this.pressureControl(p_atm)
        break;
      case "volume":
        this.volumeControl(p_atm)
        break;
      case "hfov":
        this.hfoVentilator(p_atm)
        break;
      default:
        this.pressureControl(p_atm)
        break;
    }

    // check whether there's an inspiration
    if (this._inspiration) {

      // increase the inspiratory tidal volume
      this._inspiratory_tidal_volume_counter += this._model.components["YPIECE_NCA"].real_flow * t;

      // increase the inspiration timer
      this._insp_counter += t;
    }

    if (this._expiration) {

      // increase the exhaled tidal volume
      this._exhaled_tidal_volume_counter += this._model.components["YPIECE_NCA"].real_flow * t;

      // increase the expiration timer
      this._exp_counter += t;
    }

    // determine the characteristics
    this.pressure = this._model.components["TUBINGIN"].pres - p_atm;
    this.flow = this._model.components["YPIECE_NCA"].real_flow;
    this.volume += this._model.components["YPIECE_NCA"].real_flow * t;

    // frequency counter
    this.measured_freq_counter += t;

    // determine the ventilator cycling
    if (this.ventilator_mode !== 'hfov') {
      this.ventilatorCycling(p_atm);
    }
     

    // triggering
    if (this.synchronized) {
      this.triggerBreath(p_atm)
    }
    
  }

  triggerBreath(p_atm){
    if (this._model.components["TUBINGIN_YPIECE"].real_flow > 0 & this.triggered_breath === false) {
      this._trigger_counter += this._model.components["TUBINGIN_YPIECE"].real_flow * this._model.modeling_stepsize;
    }
   
    if (this._trigger_counter > 0.0001 & this.triggered_breath === false){
      this.beginInspiration(p_atm)
    }
  }

  beginInspiration(p_atm) {
    this.measured_freq = 60 / this.measured_freq_counter;
    this.measured_freq_counter = 0;
    this.exhaled_tidal_volume = -this._exhaled_tidal_volume_counter;
    console.log(this.exhaled_tidal_volume)
    this._exhaled_tidal_volume_counter = 0;
    this.etco2_ventilator = this._model.components["NCA"].pco2;
    this.minute_volume = this.measured_freq * this.exhaled_tidal_volume;
    // inspiration start
    if (this.volume_garanteed) {
      this.volumeGarantee(p_atm);
    }
    this._insp_volume_reached = false;
    this._insp_pressure_reached = false;
    this._exp_counter = 0;
    this._expiration = false;
    this._inspiration = true;
    this._trigger_counter = 0;
    this.triggered_breath = true
    this.volume = 0;
  }
  beginExpiration(p_atm) {
    // expiration starts
      // set the peep level
      this.setPEEP();
      // reset the counters for the inspiration
      this._insp_counter = 0;
      // flag inspiration as false
      this._inspiration = false;
      // flag expiration as true
      this._expiration = true;
      // reset the peak pressure found flag
      this._peak_pressure_found = false;
      // store the inspiratory tidal volume
      this.inspiratory_tidal_volume = this._inspiratory_tidal_volume_counter;
      // reset the inspiratory tidal volume counter
      this._inspiratory_tidal_volume_counter = 0;
      // the plateau pressure is the pressure just before the expiration starts
      this.plateau_pressure = this._model.components["TUBINGIN"].pres - p_atm;
      this.compliance_static = (this.exhaled_tidal_volume * 1000) / ((this.plateau_pressure - this.peep) * 1.35951);
      this.resistance_airway = ((this.plateau_pressure - this.peep) * 1.35951) / (this.flow * 1000);
      this.time_constant = this.compliance_static * this.resistance_airway;

      this.triggered_breath = false
  }

  ventilatorCycling(p_atm) {
    switch (this.cycling_mode)
    {
      case "time":
        this.timeCycling(p_atm)
        break;
      case "flow":
        this.flowCycling(p_atm)
        break;
      case "hfov":
        this.hfoCycling(p_atm)
      default:
        break;
    }
  }
  hfoCycling(p_atm) {
    if (this.pip < 0) {
      this.beginExpiration(p_atm)
    } else {
      this.beginInspiration(p_atm)
    }
  }

  timeCycling(p_atm){
    // cycling for inspiration to expiration is based on time settings of t_in and t_ex
    if (this._insp_counter > this.t_in) {
      this.beginExpiration(p_atm)
    }
    if (this._exp_counter > this.t_ex) {
      this.beginInspiration(p_atm);
    }
  }

  flowCycling(p_atm)
  {
    if (this._insp_counter > 0.1 & this._model.components["YPIECE_NCA"].real_flow < 0.001) {
      this.t_in = this._insp_counter
      this.beginExpiration(p_atm)
    }
    if (this._exp_counter > this.t_ex_backup & this._model.components["YPIECE_NCA"].real_flow > -0.001) {
      this.t_ex = this._exp_counter
      this.beginInspiration(p_atm);
    }

  }
}
