class Kidneys {
  constructor(_model) {
    this._model = _model;

    this._d_raas = 0;
    this._effect_raas = 0;
  
    this.diuresis = 0; // in l/sec

    this.time_counter=0
    this.kidney_flow=0
    this.temp_kidney_flow=0

    this.conductance=0
    this.targetconductance=0
    this.resistance=0
    this.conchange=0
  }

  modelStep() {
    if (this.is_enabled) {
      this.modelCycle();
    }
  }

  modelCycle() {

    // INPUTS
    // initial conditions
    let dc=0
    
    // Flow in L/sec
    let qt = this._model.components['AR_KID'].real_flow

    // Pressure in mmHg
    let pt = this._model.components['AR'].pres

    // Conductance = 1/R
    let r = this._model.components['AR_KID'].r_for 
    let c = 1/r// (L/mmHg*s)
    let cT = 1/r // (L/mmHg*s)
    // (time) constants - could also be defined in normal_pregnant.json 
    let k1=0.8 //2
    let k2=1800

    let tau_1 = 4 // vasoconstriction (s)
    let tau_2 = 10 // vasodilatation  (s)
    let dt = this._model.modeling_stepsize; // in sec

    // MODEL - based on Williamson et al. (2008)
    // delay?
    let p0 = 80 // (mmHg)
    let p1 = 180 // (mmHg)
    let q0 = 0.016 // (L/s)
    

    if (pt >= p1) {
      cT=(k1)*((q0/p1) +1/k2)
    } 
    else if (pt<=p0){
        cT=((q0/p0)+k1/k2) } 
    else {
        cT=(k1)*(((pt-p0)/(p1-p0))*(q0/pt)+1/k2)
    }
    this.conductance=cT
    //this.resistance=1/cT
      
   if (c <= cT){
    dc = (1/tau_1)*(cT-c)
  } else{
    dc = (1/tau_2)*(cT-c)
  } 

  this.conchange=dc
    // Effector 
    c = c + dc*dt 
    r = 1/c
  
    this._model.components['AR_KID'].r_for = r
    this._model.components['AR_KID'].r_back = r
    
    // calculate flow in L/min to plot
    if (this.time_counter > 60) {
    this.time_counter = 0
    this.kidney_flow = this.temp_kidney_flow
    this.temp_kidney_flow = 0
    }
    
    this.time_counter += this._model.modeling_stepsize
    this.temp_kidney_flow += this._model.components['AR_KID'].real_flow * this._model.modeling_stepsize
     
    this.targetconductance=cT
    this.conductance=c
    this.resistance=r
    // resistance; r_for & r_back or r_for_fac?
    // this._model.components['AR_KID'].r_for_fac  -> multiplier = 
    // not forget to add : change r_back to new r_for. 
    // idea: as a response on systolic blood pressure
    

    // Activation curve value
    // controlled variable: 
    // effector variable: resistance


  }
}
