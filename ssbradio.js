const Grey = g.toColor(0.6,0.6,0.6);
const Green = g.toColor(0,1,0);
const Yellow = g.toColor(1,1,0);
const Blue = g.toColor(0,0,1);

eval(STOR.read("button.js"));
eval(STOR.read("selector.js"));

var VOL=35;
var OLDVOL=0;
var STATE=0;  //0 = VOLUME, 1 = FREQ, 2= BAND
var FREQ = 5450;
var RSSI =0;
var SNR =0;
var BANDNAME ="LW";
var LOWBAND = 4700;
var HIGHBAND = 5500;
var MOD="USB";
var SSB_MODE=0x9001; //AFC disable, AVC enable, bandpass&cutoff, 2.2Khz BW
var STEP = 9;
var BWindex = 1;
var CAP =0;

var buf = Graphics.createArrayBuffer(140,50,1,{msb:true});

var BANDS = (STOR.readJSON("bands.json")||[]).filter((e)=>{return e.mod!="AM";});

var BANDSEL  = new Selector(BANDS,220,120);
    
var BUTTONS=[
    new Button("Step",80, 120, 60, 32, (b)=>{changeStep(b,0);}),
    new Button("BWid",80, 160, 60, 32, (b)=>{changeBW(b,1);}),
    new Button("Mute",80, 200, 60, 32, (b)=>{RADIO.mute(b);}),
    new Button("Tune",10, 120, 60, 32, ()=>{setSelector(1,4,5);}),
    new Button("Vol",10, 160, 60, 32, ()=>{setSelector(0,3,5);}),
    new Button("Band",10, 200, 60, 32, ()=>{setSelector(2,3,4);})
];

var stepindex= 2;
const steps =[1,5,9,10];
function changeStep(b,n){
  if (!b) return;
  stepindex = (stepindex+1)%4;
  STEP=steps[stepindex];
  g.setColor(-1).setFont('6x8').setFontAlign(-1,-1).drawString("STEP: "+STEP+"KHz ",18,66,true);
  setTimeout(()=>{BUTTONS[n].reset();},200);
}

const bwidss =[1.2,2.2,3,4,0.5,1];
function changeBW(b,n){
  if (!b) return;
  BWindex = (BWindex+1)%6;
  var pat = bwidss[BWindex]<2.5 ? n : 0x10 | n;
  SSB_MODE = (SSB_MODE & 0xFF0) | pat;
  RADIO.setProp(0x0101,SSB_MODE);
  g.setColor(-1).setFont('6x8').setFontAlign(-1,-1).drawString("Bwid: "+bwidss[BWindex].toFixed(1)+"KHz ",18,78,true);
  setTimeout(()=>{BUTTONS[n].reset();},200);
}

function drawFreq(){
  buf.clear();
  buf.setFont("Vector",42).setFontAlign(1,0).drawString((FREQ).toFixed(0),135,30);
  g.setColor(STATE==1?Green:-1).drawImage(buf,120,20);
}

function drawBand() {
  g.setColor(Yellow);
  g.setFont('6x8').setFontAlign(-1,-1).drawString("BAND: "+BANDNAME+"      ",18,30,true);
  g.drawString("MIN : "+LOWBAND+"KHz   ",18,42,true);
  g.drawString("MAX : "+HIGHBAND+"KHz   ",18,54,true);
  g.drawString("STEP: "+STEP+"KHz ",18,66,true);
  g.drawString("Bwid: "+bwidss[BWindex].toFixed(1)+"KHz ",18,78,true);
  g.setFontAlign(0,-1).drawString(MOD,160,12,true);
}

function drawSignal(){
  g.setColor(Yellow);
  g.setFont('6x8').setFontAlign(-1,-1).drawString("RSSI: "+RSSI+"   ",18,12,true);
  g.setFontAlign(-1,-1).drawString("SNR: "+SNR+" ",260,12,true);
}

function drawBat(){
  var v = 7.15*analogRead(D35);
  g.setColor(Yellow).setFont('6x8').setFontAlign(-1,-1).drawString("BAT: "+v.toFixed(1)+"V",248,100,true);
}

function drawVolume(){
  var v = VOL;
  if (v>=OLDVOL) g.setColor(STATE==0?Green:Grey).fillRect(45,101,45+v,107);
  if (v<OLDVOL) g.clearRect(45+v,101,108,107);
  OLDVOL=v;
}

function drawSSB(){
    g.setColor(Grey).fillRect(0,0,319,239);
    g.clearRect(10,10,310,110);
    g.setColor(-1).setFont("Vector",20).setFontAlign(-1,0).drawString("KHz",260,50);
    g.setColor(Yellow).setFont("6x8",1).setFontAlign(-1,-1).drawString("VOL:",18,100);
    g.setColor(-1).drawRect(44,100,109,108);
    BANDSEL.draw(true);
    for (var i=0;i<BUTTONS.length;i++) BUTTONS[i].draw();
    drawFreq();
    drawBand();
    drawSignal();
    drawBat();
    drawVolume();
}

function setBand() {
  if (BANDS.length!=0) {
    var bd = BANDSEL.selected();
    BANDNAME=bd.name;
    LOWBAND =bd.min;
    HIGHBAND=bd.max;
    STEP=bd.step;
    FREQ=bd.freq;
    MOD = bd.mod;
    CAP= (bd.name=="LW" || bd.name=="MW")?0:1;
  }
  drawBand();
  RADIO.setProp(0x3400,LOWBAND);
  RADIO.setProp(0x3401,HIGHBAND);
  RADIO.setProp(0x3402,STEP);
  setTune(FREQ);
}

function setTune(f){
  RADIO.tuneSSB(f,CAP,MOD=="USB");
  while(!RADIO.endTune());
  var r= RADIO.getTuneStatus();
  FREQ=r.freq; SNR=r.snr; RSSI=r.rssi;
  drawFreq();
  drawSignal();
}

function initRADIO(){
    RADIO.reset();
    RADIO.powerSSB(true);
    RADIO.setProp(0x0101,SSB_MODE);
    RADIO.volume(VOL);
    setBand();
}

function setSelector(st,b1,b2){
  STATE=st;
  BUTTONS[b1].reset();
  BUTTONS[b2].reset();
  BANDSEL.draw(true);
  drawVolume();
  if (STATE==2) setBand();
}

function setControls(){ 
    ROTARY.handler = (inc) => {
      if (STATE==1)
         {FREQ+=(inc*STEP);
          FREQ = FREQ<LOWBAND?LOWBAND:FREQ>HIGHBAND?HIGHBAND:FREQ;
          setTune(FREQ);
      } else if(STATE==0) {
          VOL+=inc;
          VOL=VOL<0?0:VOL>63?63:VOL;
          drawVolume();
          RADIO.volume(VOL);
      } else {
        BANDSEL.move(inc);
        if (BANDS.length!=0) setBand();
      }     
    };
    ROTARY.on("change",ROTARY.handler);     
    RADIO.signalQPoll = setInterval(()=>{
        var r = RADIO.getSQ();
        SNR=r.snr; RSSI=r.rssi; STEREO=r.stereo;
        drawSignal();
        drawBat();
      },500);
    TC.touchHandler = (p) => {
      for (var j = 0; j < BUTTONS.length; ++j)
        if (BUTTONS[j].isTouched(p)) {
          BUTTONS[j].toggle();
          return;
        }
    };
    TC.on("touch",TC.touchHandler);
}

function clearControls(){
  clearD33();
  if (ROTARY.handler){
    ROTARY.removeListener("change",ROTARY.handler);
    delete ROTARY.handler;
  }
  if (RADIO.signalQPoll) RADIO.signalQPoll = clearInterval(RADIO.signalQPoll);
  if (TC.touchHandler){
    TC.removeListener("touch",TC.touchHandler);
    delete TC.touchHandler;
  }
}

eval(STOR.read("keyboard.js"));

var KBD;

function toKBD() {
  SCREEN=1;
  clearControls();
  g.setColor(Grey).fillRect(0,0,319,239);
  KBD = new Keyboard(LOWBAND,HIGHBAND,toRADIO,true).init();
  KBD.enable(true).draw();
}

function toRADIO() {
  SCREEN=0;
  KBD.enable(false);
  if (KBD.valid()) {
    setTune(KBD.freq());
    SELECTED=-1;
  }
  delete KBD;
  setControls();
  drawSSB();
}

var SCREEN = 0;

TC.swipeHandler = (dir) => {
  if (dir == TC.DOWN && SCREEN == 0) {
    toKBD();
    return;
  }
  if (dir == TC.UP && SCREEN == 1) {
    toRADIO();
    return;
  }
};

TC.on("swipe",TC.swipeHandler);

g.clear().setColor(-1).setFont("Vector",24).drawString("Loading SSB patch ...",40,100);
initRADIO();
drawSSB();
setControls();

