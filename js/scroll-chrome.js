// Fixed score/context bars follow the header and the compact trade alert.
export function scrollChromeBottom(){
 const header=Math.max(44,document.querySelector('.topbar')?.getBoundingClientRect().bottom||0,
  innerWidth>=900?document.querySelector('#tabbar')?.getBoundingClientRect().bottom||0:0);
 // Compute the stack, even when the alert's resize paint has not run yet.
 return header+(document.querySelector('.breaking-trade-dock:not([hidden])')?.offsetHeight||0);
}
