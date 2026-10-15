// Fixed score/context bars follow the header and the compact trade alert.
export function scrollChromeBottom(){
 return Math.max(44,document.querySelector('.topbar')?.getBoundingClientRect().bottom||0,
  innerWidth>=900?document.querySelector('#tabbar')?.getBoundingClientRect().bottom||0:0,
  document.querySelector('.breaking-trade-dock:not([hidden])')?.getBoundingClientRect().bottom||0);
}
